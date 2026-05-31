import { Request, Response } from 'express';
import crypto from 'crypto';
import { paymentService } from '../services/payment.service';
import { AuthenticatedRequest } from '../types';
import { sendSuccess } from '../utils/errors';
import { CreateOrderInput, VerifyPaymentInput, CreateTransactionInput } from '../utils/validators';
import { config } from '../config/env';

export class PaymentController {
  /**
   * Handle Paystack Webhook
   * POST /api/payment/webhook
   * Public endpoint - Secured by signature verification
   */
  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      // 1. Validate Event Signature (Security First)
      const secret = config.paystack.secretKey;
      const signature = req.headers['x-paystack-signature'];

      if (!secret || !signature) {
        console.warn('⚠️ Webhook received without secret or signature');
        res.sendStatus(401);
        return;
      }

      // Hash the body to verify authenticity
      const hash = crypto.createHmac('sha512', secret)
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (hash !== signature) {
        console.error('❌ Webhook signature mismatch. Potential spoofing attempt.');
        res.sendStatus(401);
        return;
      }

      // 2. Parse Event
      const event = req.body;
      
      // We only care about successful charges
      if (event.event !== 'charge.success') {
        // Return 200 to acknowledge receipt of other events we don't handle
        res.sendStatus(200);
        return;
      }

      const { reference, status } = event.data;

      if (status !== 'success') {
        console.log(`Webhook: Charge not success for ref ${reference}`);
        res.sendStatus(200);
        return;
      }

      console.log(`🔔 Webhook received for reference: ${reference}`);

      // 3. Find Order (Idempotency Check Logic)
      // We need to find the order ID associated with this reference
      // Since confirmOrder takes an ID, we'll use a service helper or lookup directly.
      // paymentService.confirmOrder expects an ID. 
      // Let's implement a quick lookup in the service or use getOrderByReference logic here if accessible,
      // But verifyPaystackTransaction logic in service does exactly this: lookup then confirm.
      
      // However, verifyPaystackTransaction makes an HTTP call to Paystack. We want to avoid that 
      // since we already have the trusted payload.
      
      // Let's delegate to a new dedicated method in PaymentService or perform lookup here.
      // To keep controller thin, I will rely on a new `confirmOrderViaWebhook` in PaymentService, 
      // or simply reuse the existing finding logic if I can.
      
      // For now, I will use paymentService.verifyPaystackTransaction logic but strictly for the confirmation part.
      // Actually, simplest is to implement the lookup and confirmation here via the service.
      
      const result = await paymentService.handleWebhookConfirmation(reference);
      
      if (result) {
        console.log(`✅ Order verified via webhook: ${reference}`);
      } else {
        console.log(`ℹ️ Webhook processed (Order already confirmed or not found): ${reference}`);
      }

      res.sendStatus(200);
    } catch (error) {
      console.error('Webhook Error:', error);
      // Return 500 to tell Paystack to retry if it's a server error
      res.sendStatus(500); 
    }
  }

  /**
   * Initialize Paystack payment
   * POST /api/payment/paystack/initialize
   */
  async initializePaystack(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    // We expect the body to contain items and optional delivery info
    // casting to partial CreateOrderInput for better type checking
    const body = req.body as CreateOrderInput & { 
      callback_url?: string;
      // These fields might come from body if not in standard structure
      email?: string;
    };
    
    const items = body.items;
    
    // Prioritize contact_email, fall back to explicit 'email' field, or fail
    const email = body.contact_email || body.email;
    const defaultCallback = `${config.social.frontendUrl}/payment.html`;
    const callbackUrl = body.callback_url || req.headers.referer || defaultCallback;

    // Redact sensitive info for logging
    const logBody = { ...req.body };
    if (logBody.email) logBody.email = '***@***.***';
    if (logBody.contact_email) logBody.contact_email = '***@***.***';
    if (logBody.items) logBody.items = `[${logBody.items.length} items]`;

    console.log('PaymentController.initializePaystack - Received request from user:', userId);
    console.log('PaymentController.initializePaystack - Determined callbackUrl:', callbackUrl);

    if (!email) {
       res.status(400).json({ success: false, error: 'Email is required for Paystack payment' });
       return;
    }

    // Clean delivery object
    const delivery = {
      contact_name: body.contact_name ?? undefined,
      contact_email: email,
      sender_phone: body.sender_phone ?? undefined,
      receiver_phone: body.receiver_phone ?? undefined,
      shipping_address: body.shipping_address ?? undefined,
      city: body.city ?? undefined,
      state: body.state ?? undefined,
      notes: body.notes ?? undefined,
    };

    const result = await paymentService.initializePaystackTransaction(
      userId,
      email,
      items,
      callbackUrl,
      delivery
    );

    sendSuccess(res, result);
  }

  /**
   * Verify Paystack payment
   * GET /api/payment/paystack/verify?reference=xxx
   */
  async verifyPaystack(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { reference } = req.query as { reference: string };
    
    if (!reference) {
      res.status(400).json({ success: false, error: 'Reference is required' });
      return;
    }

    const result = await paymentService.verifyPaystackTransaction(reference);
    sendSuccess(res, result);
  }

  /**
   * Create a new order with Solana Pay
   * POST /api/payment/create-order
   */
  async createOrder(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    // Extract items and the raw delivery fields
    const { items, ...rawDelivery } = req.body as CreateOrderInput;
    
    // FIX: Sanitize input. Convert 'null' to 'undefined' for TypeScript compatibility.
    // The Service expects optional fields (undefined), not nullable ones.
    const delivery = {
      contact_name: rawDelivery.contact_name ?? undefined,
      contact_email: rawDelivery.contact_email ?? undefined,
      sender_phone: rawDelivery.sender_phone ?? undefined,
      receiver_phone: rawDelivery.receiver_phone ?? undefined,
      shipping_address: rawDelivery.shipping_address ?? undefined,
      city: rawDelivery.city ?? undefined,
      state: rawDelivery.state ?? undefined,
      notes: rawDelivery.notes ?? undefined,
    };
    
    const order = await paymentService.createOrder(userId, items, delivery);

    sendSuccess(res, order, 201);
  }

  /**
   * Create a transaction for an order
   * POST /api/payment/transaction
   */
  async createTransaction(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { orderId, account } = req.body as CreateTransactionInput;
    const transaction = await paymentService.createTransaction(orderId, account);
    sendSuccess(res, transaction);
  }

  /**
   * GET /api/payment/chain-info
   * Proxy to get latest blockhash from backend RPC
   */
  async getChainInfo(req: Request, res: Response): Promise<void> {
    const info = await paymentService.getLatestBlockhash();
    sendSuccess(res, info);
  }

  /**
   * Verify payment status
   * GET /api/payment/verify?reference_key=xxx
   */
  async verifyPayment(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { reference_key } = req.query as VerifyPaymentInput;
    
    const result = await paymentService.verifyPayment(reference_key);

    sendSuccess(res, result);
  }

  /**
   * Get order details
   * GET /api/orders/:id
   */
  async getOrder(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { id } = req.params;
    
    const order = await paymentService.getOrder(id, userId);

    sendSuccess(res, { order });
  }

  /**
   * Get user's orders
   * GET /api/orders
   */
  async getUserOrders(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    
    const orders = await paymentService.getUserOrders(userId);

    sendSuccess(res, { orders });
  }

  /**
   * Admin: Get all orders
   * GET /api/admin/orders
   */
  async getAllOrdersAdmin(req: AuthenticatedRequest, res: Response): Promise<void> {
    const orders = await paymentService.getAllOrders();
    sendSuccess(res, { orders });
  }

  /**
   * Admin: Get order by ID
   * GET /api/admin/orders/:id
   */
  async getOrderAdmin(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const order = await paymentService.getOrderAdmin(id);
    sendSuccess(res, { order });
  }

  /**
   * Get current SOL price
   * GET /api/payment/sol-price
   */
  async getSolPrice(req: AuthenticatedRequest, res: Response): Promise<void> {
    const price = await paymentService.getSolPrice();

    sendSuccess(res, { 
      sol_price_usd: price,
      timestamp: new Date().toISOString(),
    });
  }
}

export const paymentController = new PaymentController();
