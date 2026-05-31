import { Connection, PublicKey, Keypair, Transaction, SystemProgram, TransactionInstruction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { findReference, validateTransfer } from '@solana/pay';
import BigNumber from 'bignumber.js';
import { config } from '../config/env';
import { supabaseAdmin } from '../config/supabase';
import { 
  Order, 
  OrderItem, 
  PaymentStatus, 
  CreateOrderResponse, 
  VerifyPaymentResponse 
} from '../types';
import { CartItem } from '../utils/validators';
import { cartService } from './cart.service';
import { emailService } from './email.service';
import { 
  NotFoundError, 
  PaymentError, 
  InsufficientStockError 
} from '../utils/errors';

/**
 * ============================================================================
 * SOLANA PAY PAYMENT SERVICE
 * ============================================================================
 * 
 * SECURITY ARCHITECTURE:
 * ----------------------
 * This service implements the official Solana Pay specification for secure
 * cryptocurrency payment processing. Key security measures include:
 * 
 * 1. SERVER-SIDE VERIFICATION (Critical)
 *    - All payment verification happens on the backend using `findReference()`
 *      and `validateTransfer()` from @solana/pay
 *    - Frontend NEVER verifies payments directly - it only polls this API
 *    - This prevents transaction spoofing and amount manipulation
 * 
 * 2. CRYPTOGRAPHIC REFERENCE TRACKING
 *    - Each order generates a unique Keypair reference
 *    - The reference PublicKey is embedded in the Solana Pay URL
 *    - `findReference()` locates the on-chain transaction by this reference
 *    - `validateTransfer()` cryptographically verifies recipient, amount, and reference
 * 
 * 3. ATOMIC DATABASE UPDATES
 *    - Order confirmation uses Supabase RPC functions for atomic updates
 *    - Prevents race conditions and double-confirmation attacks
 * 
 * 4. ZERO-TRUST CART VALIDATION
 *    - Cart prices are re-validated server-side before order creation
 *    - Client-submitted prices are NEVER trusted
 * 
 * FLOW:
 * -----
 * 1. Client calls POST /api/payment/create-order with cart items
 * 2. Server validates cart, generates reference, creates order in DB
 * 3. Server returns Solana Pay URL (encoded with @solana/pay encodeURL())
 * 4. Client displays QR code and polls GET /api/payment/verify
 * 5. Server uses findReference() to locate transaction on-chain
 * 6. Server uses validateTransfer() to verify payment matches order
 * 7. On success, server confirms order and returns status to client
 * 
 * ============================================================================
 */

// Payment expiration time (15 minutes)
const PAYMENT_EXPIRY_MS = 15 * 60 * 1000;

// Default NGN to USD exchange rate (configurable via environment)
const DEFAULT_NGN_USD_RATE = 1600;


export class PaymentService {
  private connection: Connection;
  private platformWallet: PublicKey;

  constructor() {
    this.connection = new Connection(config.solana.rpcUrl, 'confirmed');
    this.platformWallet = new PublicKey(config.solana.platformWalletAddress);
  }

  /**
   * Fetch current SOL price in USD from CoinGecko
   */
  async getSolPrice(): Promise<number> {
    try {
      const response = await fetch(
        `${config.coingecko.apiUrl}/simple/price?ids=solana&vs_currencies=usd`
      );
      
      if (!response.ok) {
        throw new PaymentError('Failed to fetch SOL price');
      }

      const data = await response.json() as { solana: { usd: number } };
      return data.solana.usd;
    } catch (error) {
      // In production, surface an explicit error (no dev fallbacks)
      throw new PaymentError('Unable to retrieve SOL price. Please try again later.');
    }
  }

  async getLatestBlockhash() {
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
    return { blockhash, lastValidBlockHeight };
  }

  /**
   * Convert fiat (NGN) to SOL
   * Uses USD as intermediate conversion
   */
  async convertToSol(amountNGN: number): Promise<number> {
    const solPriceUSD = await this.getSolPrice();
    
    // Get NGN to USD rate from config or use default
    const ngnUsdRate = config.ngnUsdRate || DEFAULT_NGN_USD_RATE;
    const NGN_TO_USD = 1 / ngnUsdRate;
    
    const amountUSD = amountNGN * NGN_TO_USD;
    const amountSOL = amountUSD / solPriceUSD;
    
    // Round to 9 decimal places (SOL precision)
    return Math.round(amountSOL * 1e9) / 1e9;
  }

  /**
   * Generate a unique transaction reference
   */
  private generateTransactionReference(): string {
    // KICK - Product - Timestamp - Random
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `KICK-${timestamp}-${random}`;
  }

  /**
   * Initialize a Paystack transaction
   * Professional implementation with "Generate Reference First" pattern for idempotency.
   */
  async initializePaystackTransaction(
    userId: string,
    email: string,
    items: CartItem[],
    callbackUrl: string,
    delivery?: {
      contact_name?: string;
      contact_email?: string;
      sender_phone?: string;
      receiver_phone?: string;
      shipping_address?: string;
      city?: string;
      state?: string;
      notes?: string;
    }
  ) {
    // 0. Aggregate items (combine duplicates)
    const aggregatedItems = cartService.aggregateCartItems(items);

    // 1. Validate cart and calculate total
    const validation = await cartService.validateCart(aggregatedItems);
    
    if (!validation.success) {
      const outOfStock = validation.items.filter(i => !i.in_stock);
      throw new InsufficientStockError(outOfStock.map(i => i.product_id).join(', '));
    }

    const totalFiat = validation.total_fiat;
    // Paystack expects amount in kobo (multiply by 100)
    const amountKobo = Math.round(totalFiat * 100);

    // 2. Generate a secure, unique reference explicitly
    const reference = this.generateTransactionReference();

    // 3. Create order in database first (PENDING state)
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id: userId,
        total_amount_fiat: totalFiat,
        total_amount_sol: 0, // Not a crypto transaction
        payment_status: 'pending' as PaymentStatus,
        fulfillment_status: 'pending',
        reference_key: reference, // Store the reference immediately
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour expiry
        contact_name: delivery?.contact_name ?? null,
        contact_email: email,
        sender_phone: delivery?.sender_phone ?? null,
        receiver_phone: delivery?.receiver_phone ?? null,
        shipping_address: delivery?.shipping_address ?? null,
        city: delivery?.city ?? null,
        state: delivery?.state ?? null,
        notes: delivery?.notes ?? null,
      })
      .select('*')
      .single();

    if (orderError || !order) {
      throw new Error(`Failed to create order: ${orderError?.message}`);
    }

    // 4. Create order items (using aggregated items)
    const orderItems = validation.items.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      price_at_purchase: item.unit_price,
    }));

    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      // Rollback: Delete the order if item creation fails to prevent ghost orders
      await supabaseAdmin.from('orders').delete().eq('id', order.id);
      throw new Error(`Failed to create order items: ${itemsError.message}`);
    }

    // 5. Call Paystack API with the pre-generated reference
    try {
      console.log(`PaymentService: Initializing Paystack transaction with callback_url: ${callbackUrl} and reference: ${reference}`);
      
      const response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.paystack.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          amount: amountKobo,
          reference: reference, // Pass our generated reference
          callback_url: callbackUrl,
          metadata: {
            order_id: order.id,
            user_id: userId,
            custom_fields: [
              {
                display_name: "Order ID",
                variable_name: "order_id",
                value: order.id
              }
            ]
          },
        }),
      });

      const data = await response.json() as any;
      console.log('PaymentService: Paystack response:', JSON.stringify(data));

      if (!response.ok || !data.status) {
        throw new Error(data.message || 'Paystack initialization failed');
      }

      // 6. Return success with authorization URL
      return {
        success: true,
        authorization_url: data.data.authorization_url,
        access_code: data.data.access_code,
        reference: reference,
        order_id: order.id,
      };
    } catch (error) {
      // Mark order as failed if initialization fails
      await this.failOrder(order.id, `Paystack initialization failed: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Verify Paystack transaction
   */
  async verifyPaystackTransaction(reference: string): Promise<VerifyPaymentResponse> {
    try {
      console.log(`PaymentService: Verifying Paystack transaction for reference: ${reference}`);

      // Call Paystack API
      const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${config.paystack.secretKey}`,
        },
      });

      const data = await response.json() as any;
      console.log('PaymentService: Paystack verification response:', JSON.stringify(data));

      if (!data.status || data.data.status !== 'success') {
        // If verification fails or status is not success
        const order = await this.getOrderByReference(reference);
        if (order) {
           // Only fail if explicitly failed/abandoned, otherwise it might just be pending
           if (data.data && (data.data.status === 'failed' || data.data.status === 'abandoned')) {
             await this.failOrder(order.id, `Paystack status: ${data.data.status}`);
             return { success: false, status: 'failed', order_id: order.id };
           }
        }
        return { success: false, status: 'pending', order_id: order?.id };
      }

      // Payment successful
      const paystackData = data.data;
      const orderId = paystackData.metadata?.order_id;
      let order;

      if (orderId) {
        const { data: existingOrder } = await supabaseAdmin
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single();
        order = existingOrder;
      } else {
        // Fallback: try to find order by reference if metadata missing
        order = await this.getOrderByReference(reference);
      }
      
      if (!order) throw new NotFoundError('Order not found for this reference');

      // Idempotency check: If already confirmed, return success immediately
      if (order.payment_status === 'confirmed') {
        console.log(`PaymentService: Order ${order.id} already confirmed. Returning success.`);
        return {
          success: true,
          status: 'confirmed',
          transaction_signature: order.transaction_signature || reference,
          order_id: order.id,
        };
      }

      return await this.confirmPaystackOrder(order.id, reference);

    } catch (error) {
      console.error('Paystack verification error:', error);
      throw new PaymentError('Failed to verify Paystack payment');
    }
  }

  private async getOrderByReference(reference: string) {
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('reference_key', reference)
      .single();
    return order;
  }

  /**
   * Handle Webhook Confirmation
   * Finds order by reference and confirms it securely (Idempotent)
   */
  async handleWebhookConfirmation(reference: string): Promise<boolean> {
    const order = await this.getOrderByReference(reference);
    
    if (!order) {
      console.warn(`Webhook: No order found for reference ${reference}`);
      return false;
    }

    // Idempotency: Check if already confirmed
    if (order.payment_status === 'confirmed') {
      return true;
    }

    // Use unified confirmation logic (DB RPC)
    return await this.confirmOrder(order.id, reference);
  }

  /**
   * Confirm order using Database RPC for atomicity
   * Decrements stock and updates status in a single transaction
   */
  async confirmOrder(orderId: string, transactionSignature: string): Promise<boolean> {
    try {
      const { data, error } = await supabaseAdmin.rpc('confirm_order', {
        p_order_id: orderId,
        p_transaction_signature: transactionSignature,
      });

      if (error) {
        if (error.message && error.message.includes('Insufficient stock')) {
           console.error(`❌ STOCK ERROR: Order ${orderId} failed confirmation due to insufficient stock.`);
        } else {
           console.error('Error confirming order:', error);
        }
        return false;
      }
      
      if (!data) return false;

      // Order confirmed successfully. Now send email.
      // We do this asynchronously to not block the response
      this.sendConfirmationEmail(orderId, transactionSignature).catch(err => {
        console.error('Failed to send confirmation email:', err);
      });

      return true;
    } catch (error) {
      console.error('Exception confirming order:', error);
      return false;
    }
  }

  /**
   * Helper to fetch order details and send email
   */
  private async sendConfirmationEmail(orderId: string, txHash: string) {
    // Fetch full order details with items and products
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        users (email),
        order_items (
          quantity,
          price_at_purchase,
          products (name)
        )
      `)
      .eq('id', orderId)
      .single();

    if (!order) return;

    const email = order.contact_email || order.users?.email;
    if (!email) return;

    const items = order.order_items.map((item: any) => ({
      name: item.products?.name || 'Product',
      quantity: item.quantity,
      price: item.price_at_purchase
    }));

    await emailService.sendOrderConfirmationEmail(
      email,
      order.id,
      items,
      order.total_amount_fiat,
      txHash
    );
  }

  private async confirmPaystackOrder(orderId: string, reference: string): Promise<VerifyPaymentResponse> {
    // USE UNIFIED CONFIRMATION METHOD
    const confirmed = await this.confirmOrder(orderId, reference);

    if (!confirmed) {
       throw new PaymentError('Failed to confirm order in database');
    }

    return {
      success: true,
      status: 'confirmed',
      transaction_signature: reference,
      order_id: orderId,
    };
  }

  /**
   * Create a new order with Solana Pay payment
   */
  async createOrder(
    userId: string,
    items: CartItem[],
    delivery?: {
      contact_name?: string;
      contact_email?: string;
      sender_phone?: string;
      receiver_phone?: string;
      shipping_address?: string;
      city?: string;
      state?: string;
      notes?: string;
    }
  ): Promise<CreateOrderResponse> {
    // 0. Aggregate items
    const aggregatedItems = cartService.aggregateCartItems(items);

    // Validate cart and get current prices from DB (zero-trust)
    const validation = await cartService.validateCart(aggregatedItems);
    
    if (!validation.success) {
      const outOfStock = validation.items.filter(i => !i.in_stock);
      throw new InsufficientStockError(outOfStock.map(i => i.product_id).join(', '));
    }

    const totalFiat = validation.total_fiat;
    
    // Convert to SOL
    const totalSol = await this.convertToSol(totalFiat);
    
    // Generate unique reference key for this transaction
    // Use the PublicKey base58 string as the reference key for Solana Pay
    const reference = Keypair.generate().publicKey;
    const referenceKey = reference.toBase58();
    
    // Calculate expiration time
    const expiresAt = new Date(Date.now() + PAYMENT_EXPIRY_MS);

    // Create order in database
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id: userId,
        total_amount_fiat: totalFiat,
        total_amount_sol: totalSol,
        payment_status: 'pending' as PaymentStatus,
        fulfillment_status: 'pending',
        reference_key: referenceKey,
        expires_at: expiresAt.toISOString(),
        // Delivery details (optional)
        contact_name: delivery?.contact_name ?? null,
        contact_email: delivery?.contact_email ?? null,
        sender_phone: delivery?.sender_phone ?? null,
        receiver_phone: delivery?.receiver_phone ?? null,
        shipping_address: delivery?.shipping_address ?? null,
        city: delivery?.city ?? null,
        state: delivery?.state ?? null,
        notes: delivery?.notes ?? null,
      })
      .select('*')
      .single();

    if (orderError || !order) {
      throw new Error(`Failed to create order: ${orderError?.message}`);
    }

    // Create order items (using aggregated items)
    const orderItems = validation.items.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      price_at_purchase: item.unit_price,
    }));

    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      // Rollback order if items fail
      await supabaseAdmin.from('orders').delete().eq('id', order.id);
      throw new Error(`Failed to create order items: ${itemsError.message}`);
    }

    const solanaPayUrl = `solana:${this.platformWallet.toBase58()}?amount=${totalSol.toFixed(9)}&reference=${referenceKey}&label=Kickshaus&message=Order%20ID%3A%20${order.id}`;

    return {
      success: true,
      order_id: order.id,
      reference_key: referenceKey,
      total_fiat: totalFiat,
      total_sol: totalSol,
      solana_pay_url: solanaPayUrl,
      qr_code_data: solanaPayUrl,
      expires_at: expiresAt.toISOString(),
    };
  }

  /**
   * Create a new transaction for an order
   */
  async createTransaction(orderId: string, account: string) {
    // Get order from database
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error || !order) {
      throw new NotFoundError('Order not found');
    }

    // Check if order has expired
    if (new Date(order.expires_at) < new Date()) {
      throw new PaymentError('Order has expired. Please create a new order.');
    }

    // Check wallet balance
    const walletPublicKey = new PublicKey(account);
    const balance = await this.connection.getBalance(walletPublicKey);
    const requiredAmount = new BigNumber(order.total_amount_sol).multipliedBy(LAMPORTS_PER_SOL).toNumber();

    if (balance < requiredAmount) {
      throw new PaymentError('Insufficient SOL balance to complete this transaction');
    }

    // Get the latest blockhash
    const { blockhash } = await this.connection.getLatestBlockhash();

    // Create a new transaction
    const transaction = new Transaction({
      recentBlockhash: blockhash,
      feePayer: new PublicKey(account),
    });

    // Add the transfer instruction
    const transferInstruction = SystemProgram.transfer({
      fromPubkey: new PublicKey(account),
      toPubkey: this.platformWallet,
      lamports: new BigNumber(order.total_amount_sol).multipliedBy(LAMPORTS_PER_SOL).toNumber(),
    });

    // CRITICAL: Add the reference key to the instruction so findReference can verify it
    // This allows the backend to find the transaction on-chain
    transferInstruction.keys.push({
      pubkey: new PublicKey(order.reference_key),
      isSigner: false,
      isWritable: false,
    });

    transaction.add(transferInstruction);

    // Add the memo instruction
    transaction.add(
      new TransactionInstruction({
        keys: [],
        programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcVtrp5G_52'),
        data: Buffer.from(`Kickshaus Order #${order.id.slice(0, 8)}`, 'utf-8'),
      })
    );

    // Serialize the transaction (allow missing signatures for a partially-signed tx)
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
    });

    return {
      transaction: serializedTransaction.toString('base64'),
      message: 'Please approve the transaction to complete your purchase.',
    };
  }

  /**
   * Verify payment status for an order
   * 
   * SECURITY: This is the critical verification endpoint that validates payments
   * on the Solana blockchain. The frontend MUST call this endpoint - it should
   * NEVER attempt to verify payments client-side.
   * 
   * Verification Process:
   * 1. findReference() - Locates the transaction on-chain by reference PublicKey
   * 2. validateTransfer() - Cryptographically verifies:
   *    - Recipient matches our platform wallet
   *    - Amount matches the order's SOL amount
   *    - Reference PublicKey is embedded in the transaction
   * 
   * @param referenceKey - The base58-encoded reference PublicKey from order creation
   * @returns VerifyPaymentResponse with status: 'pending' | 'confirmed' | 'failed'
   */
  async verifyPayment(referenceKey: string): Promise<VerifyPaymentResponse> {
    // Get order from database
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('reference_key', referenceKey)
      .single();

    if (error || !order) {
      throw new NotFoundError('Order not found');
    }

    // If already confirmed, return status
    if (order.payment_status === 'confirmed') {
      return {
        success: true,
        status: 'confirmed',
        transaction_signature: order.transaction_signature,
        order_id: order.id,
      };
    }

    // If already failed, return status
    if (order.payment_status === 'failed') {
      return {
        success: false,
        status: 'failed',
        order_id: order.id,
      };
    }

    // Check if order has expired
    if (new Date(order.expires_at) < new Date()) {
      await this.failOrder(order.id, 'Payment expired');
      return {
        success: false,
        status: 'failed',
        order_id: order.id,
      };
    }

    try {
      // Parse the reference public key from the stored base58 string
      const reference = new PublicKey(referenceKey);

      // Find the transaction on Solana
      const signatureInfo = await findReference(this.connection, reference, {
        finality: 'confirmed',
      });

      // Validate the transfer
      await validateTransfer(
        this.connection,
        signatureInfo.signature,
        {
          recipient: this.platformWallet,
          amount: new BigNumber(order.total_amount_sol),
          reference,
        },
        { commitment: 'confirmed' }
      );

      // USE UNIFIED CONFIRMATION METHOD
      const confirmed = await this.confirmOrder(order.id, signatureInfo.signature);

      if (!confirmed) {
        throw new PaymentError('Failed to confirm order in database');
      }

      return {
        success: true,
        status: 'confirmed',
        transaction_signature: signatureInfo.signature,
        order_id: order.id,
      };
    } catch (error) {
      // Transaction not found yet - payment still pending
      if ((error as Error).message?.includes('not found')) {
        return {
          success: true,
          status: 'pending',
          order_id: order.id,
        };
      }

      // Validation failed
      if ((error as Error).message?.includes('amount') || 
          (error as Error).message?.includes('recipient')) {
        await this.failOrder(order.id, 'Payment validation failed');
        return {
          success: false,
          status: 'failed',
          order_id: order.id,
        };
      }

      throw error;
    }
  }

  /**
   * Mark order as failed
   */
  private async failOrder(orderId: string, reason: string): Promise<void> {
    await supabaseAdmin
      .from('orders')
      .update({ 
        payment_status: 'failed',
        fulfillment_status: 'cancelled',
      })
      .eq('id', orderId);
    
    console.log(`Order ${orderId} failed: ${reason}`);
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId: string, userId: string): Promise<Order & { items: OrderItem[] }> {
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        order_items (*)
      `)
      .eq('id', orderId)
      .eq('user_id', userId)
      .single();

    if (error || !order) {
      throw new NotFoundError('Order not found');
    }

    return {
      ...order,
      items: order.order_items,
    };
  }

  /**
   * Get user's orders
   */
  async getUserOrders(userId: string): Promise<Order[]> {
    const { data: orders, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch orders: ${error.message}`);
    }

    return orders || [];
  }

  /**
   * Admin: Get all orders
   */
  async getAllOrders(): Promise<Order[]> {
    const { data: orders, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch orders: ${error.message}`);
    }

    return orders || [];
  }

  /**
   * Admin: Get order by ID (with items)
   */
  async getOrderAdmin(orderId: string): Promise<Order & { items: OrderItem[] }> {
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        order_items (*)
      `)
      .eq('id', orderId)
      .single();

    if (error || !order) {
      throw new NotFoundError('Order not found');
    }

    return {
      ...order,
      items: order.order_items,
    } as unknown as Order & { items: OrderItem[] };
  }

  /**
   * Get orders for a specific merchant
   * Returns orders that contain at least one product from this merchant
   */
  async getMerchantOrders(merchantId: string): Promise<any[]> {
    // 1. Get all product IDs for this merchant
    const { data: merchantProducts } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('merchant_id', merchantId);

    if (!merchantProducts || merchantProducts.length === 0) {
      return [];
    }

    const productIds = merchantProducts.map(p => p.id);

    // 2. Get order items for these products, joining with orders and users
    const { data: orderItems, error } = await supabaseAdmin
      .from('order_items')
      .select(`
        quantity,
        price_at_purchase,
        products (id, name, category, images),
        orders (
          id,
          total_amount_fiat,
          payment_status,
          fulfillment_status,
          created_at,
          updated_at,
          shipping_address,
          city,
          state,
          contact_name,
          contact_email,
          users (full_name, email)
        )
      `)
      .in('product_id', productIds)
      .order('created_at', { foreignTable: 'orders', ascending: false });

    if (error) {
      throw new Error(`Failed to fetch merchant orders: ${error.message}`);
    }

    // 3. Group by order to return a list of orders with merchant-specific items
    const ordersMap = new Map();

    orderItems?.forEach((item: any) => {
      const order = item.orders;
      if (!order) return;

      if (!ordersMap.has(order.id)) {
        ordersMap.set(order.id, {
          ...order,
          customer_name: order.users?.full_name || order.contact_name || 'Guest',
          customer_email: order.users?.email || order.contact_email || 'N/A',
          merchant_items: []
        });
      }

      ordersMap.get(order.id).merchant_items.push({
        product_id: item.products.id,
        name: item.products.name,
        quantity: item.quantity,
        price: item.price_at_purchase
      });
    });

    return Array.from(ordersMap.values());
  }
}

export const paymentService = new PaymentService();
