/**
 * ==========================================
 * DASHBOARD CONTROLLER
 * ==========================================
 * Provides analytics and statistics for the admin/merchant dashboard
 */

const { supabaseAdmin } = require('../config/supabase');
const { asyncHandler, createError } = require('../middleware/errorHandler');
const { ROLES, ORDER_STATUS, PAYMENT_STATUS } = require('../config/constants');

/**
 * Get dashboard overview statistics
 * GET /api/dashboard/overview
 */
const getOverview = asyncHandler(async (req, res) => {
  const isAdmin = req.user.role === ROLES.ADMIN;
  let merchantId = null;
  
  // Get merchant ID if user is a merchant
  if (req.user.role === ROLES.MERCHANT) {
    const { data: merchant } = await supabaseAdmin
      .from('merchants')
      .select('id')
      .eq('user_id', req.user.id)
      .single();
    merchantId = merchant?.id;
  }
  
  // Base queries
  let ordersQuery = supabaseAdmin.from('orders').select('*', { count: 'exact' });
  let productsQuery = supabaseAdmin.from('products').select('*', { count: 'exact' });
  
  // Filter by merchant if not admin
  if (merchantId) {
    productsQuery = productsQuery.eq('merchant_id', merchantId);
    
    // Get order IDs that contain merchant's products
    const { data: merchantOrderIds } = await supabaseAdmin
      .from('order_items')
      .select('order_id')
      .eq('merchant_id', merchantId);
    
    const orderIds = [...new Set(merchantOrderIds?.map(o => o.order_id) || [])];
    if (orderIds.length > 0) {
      ordersQuery = ordersQuery.in('id', orderIds);
    }
  }
  
  // Execute queries
  const [ordersResult, productsResult, customersResult] = await Promise.all([
    ordersQuery,
    productsQuery,
    isAdmin ? supabaseAdmin.from('profiles').select('*', { count: 'exact' }).eq('role', ROLES.CUSTOMER) : Promise.resolve({ count: 0 })
  ]);
  
  const orders = ordersResult.data || [];
  const products = productsResult.data || [];
  
  // Calculate statistics
  const totalRevenue = orders
    .filter(o => o.payment_status === PAYMENT_STATUS.COMPLETED)
    .reduce((sum, o) => sum + parseFloat(o.total_amount), 0);
  
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => o.status === ORDER_STATUS.PENDING).length;
  const completedOrders = orders.filter(o => o.status === ORDER_STATUS.COMPLETED || o.status === ORDER_STATUS.DELIVERED).length;
  const cancelledOrders = orders.filter(o => o.status === ORDER_STATUS.CANCELLED).length;
  
  const totalProducts = products.length;
  const lowStockProducts = products.filter(p => p.stock <= p.low_stock_threshold).length;
  const outOfStockProducts = products.filter(p => p.stock === 0).length;
  
  const averageOrderValue = totalOrders > 0 ? totalRevenue / completedOrders : 0;
  
  // Calculate month-over-month growth
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  
  const thisMonthRevenue = orders
    .filter(o => new Date(o.created_at) >= thisMonth && o.payment_status === PAYMENT_STATUS.COMPLETED)
    .reduce((sum, o) => sum + parseFloat(o.total_amount), 0);
  
  const lastMonthRevenue = orders
    .filter(o => new Date(o.created_at) >= lastMonth && new Date(o.created_at) < thisMonth && o.payment_status === PAYMENT_STATUS.COMPLETED)
    .reduce((sum, o) => sum + parseFloat(o.total_amount), 0);
  
  const revenueGrowth = lastMonthRevenue > 0 
    ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
    : 0;
  
  res.json({
    success: true,
    data: {
      revenue: {
        total: totalRevenue,
        thisMonth: thisMonthRevenue,
        lastMonth: lastMonthRevenue,
        growth: Math.round(revenueGrowth * 100) / 100
      },
      orders: {
        total: totalOrders,
        pending: pendingOrders,
        completed: completedOrders,
        cancelled: cancelledOrders,
        averageValue: Math.round(averageOrderValue * 100) / 100
      },
      products: {
        total: totalProducts,
        lowStock: lowStockProducts,
        outOfStock: outOfStockProducts
      },
      customers: {
        total: customersResult.count || 0
      }
    }
  });
});

/**
 * Get revenue analytics
 * GET /api/dashboard/analytics/revenue
 */
const getRevenueAnalytics = asyncHandler(async (req, res) => {
  const { period = '30d' } = req.query; // 7d, 30d, 90d, 1y
  
  // Calculate date range
  const now = new Date();
  let startDate;
  
  switch (period) {
    case '7d':
      startDate = new Date(now.setDate(now.getDate() - 7));
      break;
    case '90d':
      startDate = new Date(now.setDate(now.getDate() - 90));
      break;
    case '1y':
      startDate = new Date(now.setFullYear(now.getFullYear() - 1));
      break;
    case '30d':
    default:
      startDate = new Date(now.setDate(now.getDate() - 30));
  }
  
  let query = supabaseAdmin
    .from('orders')
    .select('total_amount, created_at, payment_status')
    .gte('created_at', startDate.toISOString())
    .eq('payment_status', PAYMENT_STATUS.COMPLETED);
  
  // Filter for merchants
  if (req.user.role === ROLES.MERCHANT) {
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
      }
    }
  }
  
  const { data: orders, error } = await query;
  
  if (error) {
    throw createError.internal('Failed to fetch revenue analytics');
  }
  
  // Group by date
  const dailyRevenue = {};
  orders.forEach(order => {
    const date = order.created_at.split('T')[0];
    dailyRevenue[date] = (dailyRevenue[date] || 0) + parseFloat(order.total_amount);
  });
  
  // Convert to array and sort
  const revenueData = Object.entries(dailyRevenue)
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date));
  
  const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.total_amount), 0);
  
  res.json({
    success: true,
    data: {
      period,
      totalRevenue,
      orderCount: orders.length,
      dailyData: revenueData
    }
  });
});

/**
 * Get orders by status breakdown
 * GET /api/dashboard/analytics/orders
 */
const getOrdersAnalytics = asyncHandler(async (req, res) => {
  let query = supabaseAdmin
    .from('orders')
    .select('status, payment_status, total_amount, created_at');
  
  // Filter for merchants
  if (req.user.role === ROLES.MERCHANT) {
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
      }
    }
  }
  
  const { data: orders, error } = await query;
  
  if (error) {
    throw createError.internal('Failed to fetch orders analytics');
  }
  
  // Count by status
  const statusCounts = {};
  Object.values(ORDER_STATUS).forEach(status => {
    statusCounts[status] = orders.filter(o => o.status === status).length;
  });
  
  // Count by payment status
  const paymentCounts = {};
  Object.values(PAYMENT_STATUS).forEach(status => {
    paymentCounts[status] = orders.filter(o => o.payment_status === status).length;
  });
  
  res.json({
    success: true,
    data: {
      total: orders.length,
      byStatus: statusCounts,
      byPaymentStatus: paymentCounts
    }
  });
});

/**
 * Get low stock products
 * GET /api/dashboard/inventory/low-stock
 */
const getLowStockProducts = asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;
  
  let query = supabaseAdmin
    .from('products')
    .select('id, name, sku, stock, low_stock_threshold, images')
    .eq('is_active', true)
    .order('stock', { ascending: true })
    .limit(limit);
  
  // Filter for merchants
  if (req.user.role === ROLES.MERCHANT) {
    const { data: merchant } = await supabaseAdmin
      .from('merchants')
      .select('id')
      .eq('user_id', req.user.id)
      .single();
    
    if (merchant) {
      query = query.eq('merchant_id', merchant.id);
    }
  }
  
  const { data: products, error } = await query;
  
  if (error) {
    throw createError.internal('Failed to fetch low stock products');
  }
  
  // Filter products where stock <= threshold
  const lowStockProducts = products.filter(p => p.stock <= p.low_stock_threshold);
  
  res.json({
    success: true,
    data: lowStockProducts.map(p => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      stock: p.stock,
      threshold: p.low_stock_threshold,
      image: p.images?.[0],
      isOutOfStock: p.stock === 0
    }))
  });
});

/**
 * Get recent orders
 * GET /api/dashboard/orders/recent
 */
const getRecentOrders = asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;
  
  let query = supabaseAdmin
    .from('orders')
    .select('id, order_number, customer_name, customer_email, total_amount, status, payment_status, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  
  // Filter for merchants
  if (req.user.role === ROLES.MERCHANT) {
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
      }
    }
  }
  
  const { data: orders, error } = await query;
  
  if (error) {
    throw createError.internal('Failed to fetch recent orders');
  }
  
  res.json({
    success: true,
    data: orders.map(o => ({
      id: o.id,
      orderNumber: o.order_number,
      customerName: o.customer_name,
      customerEmail: o.customer_email,
      totalAmount: o.total_amount,
      status: o.status,
      paymentStatus: o.payment_status,
      createdAt: o.created_at
    }))
  });
});

/**
 * Get top selling products
 * GET /api/dashboard/products/top-selling
 */
const getTopSellingProducts = asyncHandler(async (req, res) => {
  const { limit = 10, period = '30d' } = req.query;
  
  // Calculate date range
  const now = new Date();
  let startDate;
  
  switch (period) {
    case '7d':
      startDate = new Date(now.setDate(now.getDate() - 7));
      break;
    case '90d':
      startDate = new Date(now.setDate(now.getDate() - 90));
      break;
    case '30d':
    default:
      startDate = new Date(now.setDate(now.getDate() - 30));
  }
  
  // Get order items with completed payments
  let query = supabaseAdmin
    .from('order_items')
    .select(`
      product_id,
      product_name,
      quantity,
      total_price,
      orders!inner(payment_status, created_at)
    `)
    .eq('orders.payment_status', PAYMENT_STATUS.COMPLETED)
    .gte('orders.created_at', startDate.toISOString());
  
  // Filter for merchants
  if (req.user.role === ROLES.MERCHANT) {
    const { data: merchant } = await supabaseAdmin
      .from('merchants')
      .select('id')
      .eq('user_id', req.user.id)
      .single();
    
    if (merchant) {
      query = query.eq('merchant_id', merchant.id);
    }
  }
  
  const { data: items, error } = await query;
  
  if (error) {
    console.error('Top selling query error:', error);
    throw createError.internal('Failed to fetch top selling products');
  }
  
  // Aggregate by product
  const productSales = {};
  items.forEach(item => {
    if (!productSales[item.product_id]) {
      productSales[item.product_id] = {
        productId: item.product_id,
        productName: item.product_name,
        totalQuantity: 0,
        totalRevenue: 0
      };
    }
    productSales[item.product_id].totalQuantity += item.quantity;
    productSales[item.product_id].totalRevenue += parseFloat(item.total_price);
  });
  
  // Sort by quantity and take top N
  const topProducts = Object.values(productSales)
    .sort((a, b) => b.totalQuantity - a.totalQuantity)
    .slice(0, limit);
  
  // Get product images
  const productIds = topProducts.map(p => p.productId).filter(Boolean);
  if (productIds.length > 0) {
    const { data: products } = await supabaseAdmin
      .from('products')
      .select('id, images')
      .in('id', productIds);
    
    const productImages = {};
    products?.forEach(p => {
      productImages[p.id] = p.images?.[0];
    });
    
    topProducts.forEach(p => {
      p.image = productImages[p.productId];
    });
  }
  
  res.json({
    success: true,
    data: topProducts
  });
});

module.exports = {
  getOverview,
  getRevenueAnalytics,
  getOrdersAnalytics,
  getLowStockProducts,
  getRecentOrders,
  getTopSellingProducts
};
