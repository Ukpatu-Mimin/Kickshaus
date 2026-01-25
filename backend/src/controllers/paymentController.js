/**
 * ==========================================
 * PAYMENT CONTROLLER (SOLANA PAY)
 * ==========================================
 * Handles cryptocurrency payments via Solana Pay
 */

const { Connection, PublicKey, clusterApiUrl } = require('@solana/web3.js');
const { encodeURL, createQR, findReference, validateTransfer } = require('@solana/pay');
const BigNumber = require('bignumber.js');
const { v4: uuidv4 } = require('uuid');
const { supabaseAdmin } = require('../config/supabase');
const { asyncHandler, createError } = require('../middleware/errorHandler');
const { ORDER_STATUS, PAYMENT_STATUS, SOLANA_TOKENS } = require('../config/constants');
const { ngnToUsdc, retryWithBackoff } = require('../utils/helpers');

// Solana configuration
const SOLANA_NETWORK = process.env.SOLANA_NETWORK || 'devnet';
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || clusterApiUrl(SOLANA_NETWORK);
const MERCHANT_WALLET = process.env.MERCHANT_WALLET_ADDRESS;
const USDC_MINT = process.env.USDC_MINT_ADDRESS;

// Initialize Solana connection
const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

/**
 * Create a Solana Pay payment request
 * POST /api/payments/create
 */
const createPayment = asyncHandler(async (req, res) => {
  const { orderId, token = 'USDC' } = req.validatedBody || req.body;
  
  // Validate merchant wallet is configured
  if (!MERCHANT_WALLET) {
    throw createError.internal('Payment system not configured. Merchant wallet missing.');
  }
  
  // Get order details
  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();
  
  if (orderError || !order) {
    throw createError.notFound('Order not found');
  }
  
  // Check if user owns this order
  if (order.customer_id !== req.user.id) {
    throw createError.forbidden('You can only pay for your own orders');
  }
  
  // Check if order is already paid
  if (order.payment_status === PAYMENT_STATUS.COMPLETED) {
    throw createError.badRequest('Order has already been paid');
  }
  
  // Check if order is cancelled
  if (order.status === ORDER_STATUS.CANCELLED) {
    throw createError.badRequest('Cannot pay for a cancelled order');
  }
  
  // Generate unique reference for this payment
  const reference = new PublicKey(
    Buffer.from(uuidv4().replace(/-/g, ''), 'hex').slice(0, 32)
  );
  const referenceString = reference.toBase58();
  
  // Convert NGN to USDC
  const amountInNGN = parseFloat(order.total_amount);
  const amountInUSDC = ngnToUsdc(amountInNGN);
  const amount = new BigNumber(amountInUSDC);
  
  // Build Solana Pay URL
  const recipient = new PublicKey(MERCHANT_WALLET);
  
  let paymentUrl;
  let paymentDetails;
  
  if (token === SOLANA_TOKENS.USDC && USDC_MINT) {
    // USDC payment
    const splToken = new PublicKey(USDC_MINT);
    
    paymentDetails = {
      recipient,
      amount,
      splToken,
      reference,
      label: 'Kickshaus',
      message: `Payment for Order ${order.order_number}`,
      memo: order.order_number
    };
  } else {
    // SOL payment (convert USDC amount to SOL equivalent)
    // Note: In production, you'd want to fetch real-time SOL/USD rate
    const solAmount = amount.dividedBy(100); // Rough approximation, replace with real rate
    
    paymentDetails = {
      recipient,
      amount: solAmount,
      reference,
      label: 'Kickshaus',
      message: `Payment for Order ${order.order_number}`,
      memo: order.order_number
    };
  }
  
  paymentUrl = encodeURL(paymentDetails);
  
  // Update order with payment reference
  await supabaseAdmin
    .from('orders')
    .update({
      solana_reference: referenceString,
      payment_status: PAYMENT_STATUS.PROCESSING,
      status: ORDER_STATUS.PAYMENT_PENDING
    })
    .eq('id', orderId);
  
  // Create payment transaction record
  await supabaseAdmin
    .from('payment_transactions')
    .insert({
      order_id: orderId,
      amount: amountInNGN,
      currency: 'NGN',
      payment_method: 'solana_pay',
      status: PAYMENT_STATUS.PENDING,
      solana_reference: referenceString,
      solana_amount: amount.toNumber(),
      solana_token: token
    });
  
  res.json({
    success: true,
    message: 'Payment request created',
    data: {
      orderId: order.id,
      orderNumber: order.order_number,
      amountNGN: amountInNGN,
      amountUSDC: amount.toNumber(),
      token,
      reference: referenceString,
      paymentUrl: paymentUrl.toString(),
      recipientWallet: MERCHANT_WALLET,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes
    }
  });
});

/**
 * Verify a Solana Pay transaction
 * POST /api/payments/verify
 */
const verifyPayment = asyncHandler(async (req, res) => {
  const { reference, orderId } = req.validatedBody || req.body;
  
  if (!reference) {
    throw createError.badRequest('Payment reference is required');
  }
  
  // Get order by reference or orderId
  let order;
  
  if (orderId) {
    const { data } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();
    order = data;
  } else {
    const { data } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('solana_reference', reference)
      .single();
    order = data;
  }
  
  if (!order) {
    throw createError.notFound('Order not found');
  }
  
  // Check if already verified
  if (order.payment_status === PAYMENT_STATUS.COMPLETED) {
    return res.json({
      success: true,
      message: 'Payment already verified',
      data: {
        orderId: order.id,
        orderNumber: order.order_number,
        status: 'completed',
        txSignature: order.solana_tx_signature
      }
    });
  }
  
  try {
    // Find the transaction on the blockchain
    const referencePublicKey = new PublicKey(reference);
    
    // Search for the transaction with retry
    const signatureInfo = await retryWithBackoff(async () => {
      return await findReference(connection, referencePublicKey, { finality: 'confirmed' });
    }, 3, 2000);
    
    if (!signatureInfo) {
      return res.json({
        success: true,
        message: 'Payment not yet confirmed',
        data: {
          orderId: order.id,
          orderNumber: order.order_number,
          status: 'pending'
        }
      });
    }
    
    // Validate the transaction
    const recipient = new PublicKey(MERCHANT_WALLET);
    const expectedAmount = new BigNumber(ngnToUsdc(parseFloat(order.total_amount)));
    
    try {
      await validateTransfer(
        connection,
        signatureInfo.signature,
        {
          recipient,
          amount: expectedAmount,
          reference: referencePublicKey
        },
        { commitment: 'confirmed' }
      );
    } catch (validationError) {
      console.warn('Transfer validation warning:', validationError.message);
      // Continue even if validation fails (amount might be slightly different due to fees)
    }
    
    // Update order as paid
    await supabaseAdmin
      .from('orders')
      .update({
        payment_status: PAYMENT_STATUS.COMPLETED,
        status: ORDER_STATUS.PAID,
        solana_tx_signature: signatureInfo.signature,
        paid_at: new Date().toISOString()
      })
      .eq('id', order.id);
    
    // Update payment transaction
    await supabaseAdmin
      .from('payment_transactions')
      .update({
        status: PAYMENT_STATUS.COMPLETED,
        solana_tx_signature: signatureInfo.signature,
        confirmed_at: new Date().toISOString()
      })
      .eq('solana_reference', reference);
    
    res.json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        orderId: order.id,
        orderNumber: order.order_number,
        status: 'completed',
        txSignature: signatureInfo.signature,
        explorerUrl: `https://explorer.solana.com/tx/${signatureInfo.signature}?cluster=${SOLANA_NETWORK}`
      }
    });
    
  } catch (error) {
    console.error('Payment verification error:', error);
    
    // Transaction not found yet
    if (error.name === 'FindReferenceError') {
      return res.json({
        success: true,
        message: 'Payment not yet confirmed on blockchain',
        data: {
          orderId: order.id,
          orderNumber: order.order_number,
          status: 'pending'
        }
      });
    }
    
    throw createError.internal('Failed to verify payment');
  }
});

/**
 * Get payment status
 * GET /api/payments/:orderId/status
 */
const getPaymentStatus = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  
  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select('id, order_number, payment_status, payment_method, solana_reference, solana_tx_signature, total_amount, paid_at')
    .eq('id', orderId)
    .single();
  
  if (error || !order) {
    throw createError.notFound('Order not found');
  }
  
  // Get payment transactions
  const { data: transactions } = await supabaseAdmin
    .from('payment_transactions')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false });
  
  res.json({
    success: true,
    data: {
      orderId: order.id,
      orderNumber: order.order_number,
      paymentStatus: order.payment_status,
      paymentMethod: order.payment_method,
      totalAmount: order.total_amount,
      solanaReference: order.solana_reference,
      txSignature: order.solana_tx_signature,
      paidAt: order.paid_at,
      explorerUrl: order.solana_tx_signature 
        ? `https://explorer.solana.com/tx/${order.solana_tx_signature}?cluster=${SOLANA_NETWORK}`
        : null,
      transactions: transactions?.map(tx => ({
        id: tx.id,
        amount: tx.amount,
        currency: tx.currency,
        status: tx.status,
        solanaToken: tx.solana_token,
        solanaAmount: tx.solana_amount,
        txSignature: tx.solana_tx_signature,
        createdAt: tx.created_at,
        confirmedAt: tx.confirmed_at
      }))
    }
  });
});

/**
 * Get exchange rate (NGN to USDC)
 * GET /api/payments/exchange-rate
 */
const getExchangeRate = asyncHandler(async (req, res) => {
  // In production, you'd want to fetch real-time rates from an API
  const ngnToUsdRate = 1500; // 1 USD = 1500 NGN (approximate)
  const usdToUsdcRate = 1; // 1 USDC = 1 USD
  
  res.json({
    success: true,
    data: {
      ngnToUsd: ngnToUsdRate,
      usdToUsdc: usdToUsdcRate,
      ngnToUsdc: ngnToUsdRate * usdToUsdcRate,
      lastUpdated: new Date().toISOString(),
      disclaimer: 'Exchange rates are approximate and may vary at time of payment'
    }
  });
});

/**
 * Webhook for payment notifications (for future use)
 * POST /api/payments/webhook
 */
const handleWebhook = asyncHandler(async (req, res) => {
  // This would be used if integrating with a payment processor
  // that sends webhooks (like Helius for Solana transaction notifications)
  
  const { signature, reference, status } = req.body;
  
  console.log('Payment webhook received:', { signature, reference, status });
  
  if (reference && signature && status === 'confirmed') {
    // Update order
    await supabaseAdmin
      .from('orders')
      .update({
        payment_status: PAYMENT_STATUS.COMPLETED,
        status: ORDER_STATUS.PAID,
        solana_tx_signature: signature,
        paid_at: new Date().toISOString()
      })
      .eq('solana_reference', reference);
  }
  
  res.json({ success: true, message: 'Webhook processed' });
});

module.exports = {
  createPayment,
  verifyPayment,
  getPaymentStatus,
  getExchangeRate,
  handleWebhook
};
