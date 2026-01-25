/**
 * ==========================================
 * ORDER CONTROLLER
 * ==========================================
 * Handles order creation, retrieval, and management
 */

const { supabaseAdmin } = require('../config/supabase');
const { asyncHandler, createError } = require('../middleware/errorHandler');
const { generateOrderNumber, getPaginationMeta } = require('../utils/helpers');
const { ORDER_STATUS, PAYMENT_STATUS, ROLES } = require('../config/constants');

/**
 * Get all orders (with filtering based on user role)
 * GET /api/orders
 */
const getOrders = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    status,
    paymentStatus,
    customerId,
    startDate,
    endDate
  } = req.validatedQuery || req.query;
  
  const offset = (page - 1) * limit;
  
  let query = supabaseAdmin
    .from('orders')
    .select('*, order_items(*, products(name, images))', { count: 'exact' });
  
  // Role-based filtering
  if (req.user.role === ROLES.CUSTOMER) {
    query = query.eq('customer_id', req.user.id);
  } else if (req.user.role === ROLES.MERCHANT) {
    // Merchants see orders containing their products
    const { data: merchant } = await supabaseAdmin
      .from('merchants')
      .select('id')
      .eq('user_id', req.user.id)
      .single();
    
    if (merchant) {
      const { data: merchantOrderIds } = await supabaseAdmin
        .from('order_items')
        .select('order_id')
        .eq('merchant_id', merchant.id);
      
      const orderIds = [...new Set(merchantOrderIds?.map(o => o.order_id) || [])];
      if (orderIds.length > 0) {
        query = query.in('id', orderIds);
      } else {
        // No orders for this merchant
        return res.json({
          success: true,
          data: [],
          pagination: getPaginationMeta(0, parseInt(page), parseInt(limit))
        });
      }
    }
  }
  
  // Apply filters
  if (status) {
    query = query.eq('status', status);
  }
  
  if (paymentStatus) {
    query = query.eq('payment_status', paymentStatus);
  }
  
  if (customerId && req.user.role === ROLES.ADMIN) {
    query = query.eq('customer_id', customerId);
  }
  
  if (startDate) {
    query = query.gte('created_at', startDate);
  }
  
  if (endDate) {
    query = query.lte('created_at', endDate);
  }
  
  const { data: orders, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  
  if (error) {
    console.error('Orders query error:', error);
    throw createError.internal('Failed to fetch orders');
  }
  
  res.json({
    success: true,
    data: orders.map(order => ({
      id: order.id,
      orderNumber: order.order_number,
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      status: order.status,
      paymentStatus: order.payment_status,
      paymentMethod: order.payment_method,
      subtotal: order.subtotal,
      taxAmount: order.tax_amount,
      discountAmount: order.discount_amount,
      shippingAmount: order.shipping_amount,
      totalAmount: order.total_amount,
      currency: order.currency,
      itemCount: order.order_items?.length || 0,
      items: order.order_items?.map(item => ({
        id: item.id,
        productName: item.product_name,
        productImage: item.product_image || item.products?.images?.[0],
        quantity: item.quantity,
        unitPrice: item.unit_price,
        totalPrice: item.total_price,
        size: item.size,
        color: item.color
      })),
      createdAt: order.created_at
    })),
    pagination: getPaginationMeta(count, parseInt(page), parseInt(limit))
  });
});

/**
 * Get single order by ID
 * GET /api/orders/:id
 */
const getOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select('*, order_items(*, products(id, name, images, brand))')
    .eq('id', id)
    .single();
  
  if (error || !order) {
    throw createError.notFound('Order not found');
  }
  
  // Check access permissions
  if (req.user.role === ROLES.CUSTOMER && order.customer_id !== req.user.id) {
    throw createError.forbidden('You can only view your own orders');
  }
  
  res.json({
    success: true,
    data: {
      id: order.id,
      orderNumber: order.order_number,
      customerId: order.customer_id,
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      customerPhone: order.customer_phone,
      status: order.status,
      paymentStatus: order.payment_status,
      paymentMethod: order.payment_method,
      paymentReference: order.payment_reference,
      solanaReference: order.solana_reference,
      solanaTxSignature: order.solana_tx_signature,
      subtotal: order.subtotal,
      taxAmount: order.tax_amount,
      discountAmount: order.discount_amount,
      shippingAmount: order.shipping_amount,
      totalAmount: order.total_amount,
      currency: order.currency,
      shippingAddress: order.shipping_address,
      billingAddress: order.billing_address,
      couponCode: order.coupon_code,
      customerNotes: order.customer_notes,
      internalNotes: order.internal_notes,
      items: order.order_items?.map(item => ({
        id: item.id,
        productId: item.product_id,
        productName: item.product_name,
        productImage: item.product_image,
        productBrand: item.products?.brand,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        totalPrice: item.total_price,
        size: item.size,
        color: item.color,
        status: item.status
      })),
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      paidAt: order.paid_at,
      shippedAt: order.shipped_at,
      deliveredAt: order.delivered_at
    }
  });
});

/**
 * Create a new order
 * POST /api/orders
 */
const createOrder = asyncHandler(async (req, res) => {
  const orderData = req.validatedBody;
  
  // Validate products exist and have sufficient stock
  const productIds = orderData.items.map(item => item.productId);
  
  const { data: products, error: productsError } = await supabaseAdmin
    .from('products')
    .select('id, name, price, stock, images, merchant_id')
    .in('id', productIds);
  
  if (productsError || !products || products.length !== productIds.length) {
    throw createError.badRequest('One or more products not found');
  }
  
  // Create a product lookup map
  const productMap = {};
  products.forEach(p => { productMap[p.id] = p; });
  
  // Validate stock and calculate totals
  let subtotal = 0;
  const orderItems = [];
  
  for (const item of orderData.items) {
    const product = productMap[item.productId];
    
    if (!product) {
      throw createError.badRequest(`Product ${item.productId} not found`);
    }
    
    if (product.stock < item.quantity) {
      throw createError.badRequest(`Insufficient stock for ${product.name}. Available: ${product.stock}`);
    }
    
    const itemTotal = product.price * item.quantity;
    subtotal += itemTotal;
    
    orderItems.push({
      product_id: product.id,
      merchant_id: product.merchant_id,
      product_name: product.name,
      product_image: product.images?.[0],
      size: item.size,
      color: item.color,
      unit_price: product.price,
      quantity: item.quantity,
      total_price: itemTotal
    });
  }
  
  // Apply coupon if provided
  let discountAmount = 0;
  if (orderData.couponCode) {
    const { data: coupon } = await supabaseAdmin
      .from('coupons')
      .select('*')
      .eq('code', orderData.couponCode.toUpperCase())
      .eq('is_active', true)
      .single();
    
    if (coupon) {
      const now = new Date();
      const expiresAt = coupon.expires_at ? new Date(coupon.expires_at) : null;
      
      if (!expiresAt || expiresAt > now) {
        if (subtotal >= coupon.min_order_amount) {
          if (coupon.usage_limit === null || coupon.usage_count < coupon.usage_limit) {
            if (coupon.discount_type === 'percentage') {
              discountAmount = subtotal * (coupon.discount_value / 100);
              if (coupon.max_discount_amount) {
                discountAmount = Math.min(discountAmount, coupon.max_discount_amount);
              }
            } else {
              discountAmount = coupon.discount_value;
            }
            
            // Increment coupon usage
            await supabaseAdmin
              .from('coupons')
              .update({ usage_count: coupon.usage_count + 1 })
              .eq('id', coupon.id);
          }
        }
      }
    }
  }
  
  // Calculate totals
  const taxAmount = 0; // Implement tax calculation as needed
  const shippingAmount = 0; // Implement shipping calculation as needed
  const totalAmount = subtotal + taxAmount + shippingAmount - discountAmount;
  
  // Generate order number
  const orderNumber = generateOrderNumber();
  
  // Create order
  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .insert({
      order_number: orderNumber,
      customer_id: req.user.id,
      customer_name: orderData.customerName,
      customer_email: orderData.customerEmail,
      customer_phone: orderData.customerPhone,
      subtotal,
      tax_amount: taxAmount,
      discount_amount: discountAmount,
      shipping_amount: shippingAmount,
      total_amount: totalAmount,
      currency: 'NGN',
      shipping_address: orderData.shippingAddress,
      billing_address: orderData.billingAddress || orderData.shippingAddress,
      coupon_code: orderData.couponCode,
      customer_notes: orderData.customerNotes,
      payment_method: orderData.paymentMethod,
      status: ORDER_STATUS.PENDING,
      payment_status: PAYMENT_STATUS.PENDING
    })
    .select()
    .single();
  
  if (orderError) {
    console.error('Create order error:', orderError);
    throw createError.internal('Failed to create order');
  }
  
  // Create order items
  const orderItemsWithOrderId = orderItems.map(item => ({
    ...item,
    order_id: order.id
  }));
  
  const { error: itemsError } = await supabaseAdmin
    .from('order_items')
    .insert(orderItemsWithOrderId);
  
  if (itemsError) {
    console.error('Create order items error:', itemsError);
    // Rollback order
    await supabaseAdmin.from('orders').delete().eq('id', order.id);
    throw createError.internal('Failed to create order items');
  }
  
  // Reserve stock (reduce product stock)
  for (const item of orderData.items) {
    await supabaseAdmin
      .from('products')
      .update({ stock: productMap[item.productId].stock - item.quantity })
      .eq('id', item.productId);
  }
  
  res.status(201).json({
    success: true,
    message: 'Order created successfully',
    data: {
      id: order.id,
      orderNumber: order.order_number,
      subtotal: order.subtotal,
      taxAmount: order.tax_amount,
      discountAmount: order.discount_amount,
      shippingAmount: order.shipping_amount,
      totalAmount: order.total_amount,
      currency: order.currency,
      status: order.status,
      paymentStatus: order.payment_status,
      paymentMethod: order.payment_method,
      itemCount: orderItems.length,
      createdAt: order.created_at
    }
  });
});

/**
 * Update order status
 * PATCH /api/orders/:id/status
 */
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, internalNotes } = req.validatedBody || req.body;
  
  if (!Object.values(ORDER_STATUS).includes(status)) {
    throw createError.badRequest('Invalid order status');
  }
  
  const updateData = { status };
  
  // Set timestamps based on status
  const now = new Date().toISOString();
  switch (status) {
    case ORDER_STATUS.PAID:
      updateData.paid_at = now;
      updateData.payment_status = PAYMENT_STATUS.COMPLETED;
      break;
    case ORDER_STATUS.SHIPPED:
      updateData.shipped_at = now;
      break;
    case ORDER_STATUS.DELIVERED:
    case ORDER_STATUS.COMPLETED:
      updateData.delivered_at = now;
      break;
    case ORDER_STATUS.CANCELLED:
      updateData.cancelled_at = now;
      break;
  }
  
  if (internalNotes) {
    updateData.internal_notes = internalNotes;
  }
  
  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Update order status error:', error);
    throw createError.internal('Failed to update order status');
  }
  
  if (!order) {
    throw createError.notFound('Order not found');
  }
  
  // If order is cancelled, restore stock
  if (status === ORDER_STATUS.CANCELLED) {
    const { data: items } = await supabaseAdmin
      .from('order_items')
      .select('product_id, quantity')
      .eq('order_id', id);
    
    for (const item of items || []) {
      await supabaseAdmin.rpc('increment_stock', {
        product_id: item.product_id,
        amount: item.quantity
      });
    }
  }
  
  res.json({
    success: true,
    message: `Order status updated to ${status}`,
    data: {
      id: order.id,
      orderNumber: order.order_number,
      status: order.status,
      paymentStatus: order.payment_status,
      updatedAt: order.updated_at
    }
  });
});

/**
 * Cancel an order
 * POST /api/orders/:id/cancel
 */
const cancelOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  
  // Get order
  const { data: order, error: fetchError } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('id', id)
    .single();
  
  if (fetchError || !order) {
    throw createError.notFound('Order not found');
  }
  
  // Check if user can cancel
  if (req.user.role === ROLES.CUSTOMER && order.customer_id !== req.user.id) {
    throw createError.forbidden('You can only cancel your own orders');
  }
  
  // Check if order can be cancelled
  const nonCancellableStatuses = [ORDER_STATUS.SHIPPED, ORDER_STATUS.DELIVERED, ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELLED];
  if (nonCancellableStatuses.includes(order.status)) {
    throw createError.badRequest(`Cannot cancel order with status: ${order.status}`);
  }
  
  // Update order
  const { error: updateError } = await supabaseAdmin
    .from('orders')
    .update({
      status: ORDER_STATUS.CANCELLED,
      cancelled_at: new Date().toISOString(),
      internal_notes: reason ? `Cancellation reason: ${reason}` : order.internal_notes
    })
    .eq('id', id);
  
  if (updateError) {
    throw createError.internal('Failed to cancel order');
  }
  
  // Restore stock
  const { data: items } = await supabaseAdmin
    .from('order_items')
    .select('product_id, quantity')
    .eq('order_id', id);
  
  for (const item of items || []) {
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('stock')
      .eq('id', item.product_id)
      .single();
    
    if (product) {
      await supabaseAdmin
        .from('products')
        .update({ stock: product.stock + item.quantity })
        .eq('id', item.product_id);
    }
  }
  
  res.json({
    success: true,
    message: 'Order cancelled successfully'
  });
});

/**
 * Validate a coupon code
 * POST /api/orders/validate-coupon
 */
const validateCoupon = asyncHandler(async (req, res) => {
  const { code, subtotal } = req.validatedBody || req.body;
  
  if (!code) {
    return res.json({
      success: true,
      data: { valid: false, message: 'Coupon code is required' }
    });
  }
  
  const { data: coupon, error } = await supabaseAdmin
    .from('coupons')
    .select('*')
    .eq('code', code.toUpperCase())
    .eq('is_active', true)
    .single();
  
  if (error || !coupon) {
    return res.json({
      success: true,
      data: { valid: false, message: 'Invalid or expired coupon code' }
    });
  }
  
  // Check expiration
  const now = new Date();
  const expiresAt = coupon.expires_at ? new Date(coupon.expires_at) : null;
  const startsAt = coupon.starts_at ? new Date(coupon.starts_at) : null;
  
  if (startsAt && now < startsAt) {
    return res.json({
      success: true,
      data: { valid: false, message: 'Coupon is not yet active' }
    });
  }
  
  if (expiresAt && now > expiresAt) {
    return res.json({
      success: true,
      data: { valid: false, message: 'Coupon has expired' }
    });
  }
  
  // Check usage limit
  if (coupon.usage_limit !== null && coupon.usage_count >= coupon.usage_limit) {
    return res.json({
      success: true,
      data: { valid: false, message: 'Coupon usage limit reached' }
    });
  }
  
  // Check minimum order amount
  const orderSubtotal = parseFloat(subtotal) || 0;
  if (coupon.min_order_amount && orderSubtotal < coupon.min_order_amount) {
    return res.json({
      success: true,
      data: { 
        valid: false, 
        message: `Minimum order amount is ₦${coupon.min_order_amount.toLocaleString()}` 
      }
    });
  }
  
  // Calculate discount
  let discountAmount = 0;
  if (coupon.discount_type === 'percentage') {
    discountAmount = orderSubtotal * (coupon.discount_value / 100);
    if (coupon.max_discount_amount) {
      discountAmount = Math.min(discountAmount, coupon.max_discount_amount);
    }
  } else {
    discountAmount = coupon.discount_value;
  }
  
  res.json({
    success: true,
    data: {
      valid: true,
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      discount_amount: Math.round(discountAmount),
      description: coupon.description,
      message: `Coupon applied! You save ₦${Math.round(discountAmount).toLocaleString()}`
    }
  });
});

module.exports = {
  getOrders,
  getOrder,
  createOrder,
  updateOrderStatus,
  cancelOrder,
  validateCoupon
};
