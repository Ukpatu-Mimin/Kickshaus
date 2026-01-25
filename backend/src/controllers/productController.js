/**
 * ==========================================
 * PRODUCT CONTROLLER
 * ==========================================
 * Handles product CRUD operations and queries
 */

const { supabaseAdmin } = require('../config/supabase');
const { asyncHandler, createError } = require('../middleware/errorHandler');
const { slugify, generateSKU, getPaginationMeta } = require('../utils/helpers');
const { ROLES } = require('../config/constants');

/**
 * Get all products with filtering and pagination
 * GET /api/products
 */
const getProducts = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    sortBy = 'created_at',
    sortOrder = 'desc',
    category,
    brand,
    minPrice,
    maxPrice,
    inStock,
    featured,
    search,
    merchantId
  } = req.validatedQuery || req.query;
  
  const offset = (page - 1) * limit;
  
  // Build query
  let query = supabaseAdmin
    .from('products')
    .select('*, merchants(business_name)', { count: 'exact' })
    .eq('is_active', true);
  
  // Apply filters
  if (category) {
    query = query.ilike('category', `%${category}%`);
  }
  
  if (brand) {
    query = query.ilike('brand', `%${brand}%`);
  }
  
  if (minPrice !== undefined) {
    query = query.gte('price', minPrice);
  }
  
  if (maxPrice !== undefined) {
    query = query.lte('price', maxPrice);
  }
  
  if (inStock !== undefined) {
    if (inStock) {
      query = query.gt('stock', 0);
    } else {
      query = query.eq('stock', 0);
    }
  }
  
  if (featured !== undefined) {
    query = query.eq('is_featured', featured);
  }
  
  if (merchantId) {
    query = query.eq('merchant_id', merchantId);
  }
  
  if (search) {
    query = query.or(`name.ilike.%${search}%,brand.ilike.%${search}%,description.ilike.%${search}%`);
  }
  
  // Apply sorting and pagination
  const { data: products, error, count } = await query
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(offset, offset + limit - 1);
  
  if (error) {
    console.error('Products query error:', error);
    throw createError.internal('Failed to fetch products');
  }
  
  res.json({
    success: true,
    data: products.map(product => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      brand: product.brand,
      category: product.category,
      description: product.description,
      price: product.price,
      compareAtPrice: product.compare_at_price,
      currency: product.currency,
      images: product.images,
      angles: product.angles,
      stock: product.stock,
      sku: product.sku,
      sizes: product.sizes,
      colors: product.colors,
      badge: product.badge,
      rating: parseFloat(product.rating) || 0,
      reviewCount: product.review_count,
      isFeatured: product.is_featured,
      merchantName: product.merchants?.business_name,
      createdAt: product.created_at
    })),
    pagination: getPaginationMeta(count, parseInt(page), parseInt(limit))
  });
});

/**
 * Get single product by ID or slug
 * GET /api/products/:id
 */
const getProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Check if id is a UUID or slug
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  
  let query = supabaseAdmin
    .from('products')
    .select('*, merchants(id, business_name, logo_url)');
  
  if (isUUID) {
    query = query.eq('id', id);
  } else {
    query = query.eq('slug', id);
  }
  
  const { data: product, error } = await query.single();
  
  if (error || !product) {
    throw createError.notFound('Product not found');
  }
  
  // Get reviews for this product
  const { data: reviews } = await supabaseAdmin
    .from('reviews')
    .select('*, profiles(full_name)')
    .eq('product_id', product.id)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(10);
  
  res.json({
    success: true,
    data: {
      id: product.id,
      name: product.name,
      slug: product.slug,
      brand: product.brand,
      category: product.category,
      description: product.description,
      price: product.price,
      compareAtPrice: product.compare_at_price,
      currency: product.currency,
      images: product.images,
      angles: product.angles,
      stock: product.stock,
      sku: product.sku,
      sizes: product.sizes,
      colors: product.colors,
      badge: product.badge,
      rating: parseFloat(product.rating) || 0,
      reviewCount: product.review_count,
      isFeatured: product.is_featured,
      isActive: product.is_active,
      merchant: product.merchants ? {
        id: product.merchants.id,
        name: product.merchants.business_name,
        logo: product.merchants.logo_url
      } : null,
      reviews: reviews?.map(r => ({
        id: r.id,
        rating: r.rating,
        title: r.title,
        comment: r.comment,
        customerName: r.profiles?.full_name || 'Anonymous',
        createdAt: r.created_at
      })) || [],
      createdAt: product.created_at,
      updatedAt: product.updated_at
    }
  });
});

/**
 * Create a new product
 * POST /api/products
 */
const createProduct = asyncHandler(async (req, res) => {
  const productData = req.validatedBody;
  
  // Get merchant ID for the current user
  let merchantId = null;
  
  if (req.user.role === ROLES.MERCHANT) {
    const { data: merchant } = await supabaseAdmin
      .from('merchants')
      .select('id')
      .eq('user_id', req.user.id)
      .single();
    
    if (!merchant) {
      throw createError.forbidden('Merchant profile not found');
    }
    merchantId = merchant.id;
  } else if (req.user.role === ROLES.ADMIN && productData.merchantId) {
    merchantId = productData.merchantId;
  }
  
  // Generate slug and SKU
  const slug = slugify(productData.name) + '-' + Date.now().toString(36);
  const sku = productData.sku || generateSKU();
  
  const { data: product, error } = await supabaseAdmin
    .from('products')
    .insert({
      merchant_id: merchantId,
      name: productData.name,
      slug,
      brand: productData.brand,
      category: productData.category,
      description: productData.description,
      price: productData.price,
      compare_at_price: productData.compareAtPrice,
      currency: productData.currency || 'NGN',
      images: productData.images || [],
      angles: productData.angles || {},
      stock: productData.stock || 0,
      low_stock_threshold: productData.lowStockThreshold || 10,
      sku,
      sizes: productData.sizes || [],
      colors: productData.colors || [],
      badge: productData.badge,
      is_active: productData.isActive !== false,
      is_featured: productData.isFeatured || false
    })
    .select()
    .single();
  
  if (error) {
    console.error('Create product error:', error);
    if (error.code === '23505') {
      throw createError.conflict('A product with this SKU already exists');
    }
    throw createError.internal('Failed to create product');
  }
  
  res.status(201).json({
    success: true,
    message: 'Product created successfully',
    data: {
      id: product.id,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      price: product.price,
      stock: product.stock,
      createdAt: product.created_at
    }
  });
});

/**
 * Update a product
 * PUT /api/products/:id
 */
const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const productData = req.validatedBody;
  
  // Check product ownership for merchants
  if (req.user.role === ROLES.MERCHANT) {
    const { data: merchant } = await supabaseAdmin
      .from('merchants')
      .select('id')
      .eq('user_id', req.user.id)
      .single();
    
    const { data: existingProduct } = await supabaseAdmin
      .from('products')
      .select('merchant_id')
      .eq('id', id)
      .single();
    
    if (!existingProduct || existingProduct.merchant_id !== merchant?.id) {
      throw createError.forbidden('You can only update your own products');
    }
  }
  
  // Build update object
  const updateData = {};
  
  if (productData.name !== undefined) {
    updateData.name = productData.name;
    updateData.slug = slugify(productData.name) + '-' + Date.now().toString(36);
  }
  if (productData.brand !== undefined) updateData.brand = productData.brand;
  if (productData.category !== undefined) updateData.category = productData.category;
  if (productData.description !== undefined) updateData.description = productData.description;
  if (productData.price !== undefined) updateData.price = productData.price;
  if (productData.compareAtPrice !== undefined) updateData.compare_at_price = productData.compareAtPrice;
  if (productData.images !== undefined) updateData.images = productData.images;
  if (productData.angles !== undefined) updateData.angles = productData.angles;
  if (productData.stock !== undefined) updateData.stock = productData.stock;
  if (productData.lowStockThreshold !== undefined) updateData.low_stock_threshold = productData.lowStockThreshold;
  if (productData.sizes !== undefined) updateData.sizes = productData.sizes;
  if (productData.colors !== undefined) updateData.colors = productData.colors;
  if (productData.badge !== undefined) updateData.badge = productData.badge;
  if (productData.isActive !== undefined) updateData.is_active = productData.isActive;
  if (productData.isFeatured !== undefined) updateData.is_featured = productData.isFeatured;
  
  const { data: product, error } = await supabaseAdmin
    .from('products')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Update product error:', error);
    throw createError.internal('Failed to update product');
  }
  
  if (!product) {
    throw createError.notFound('Product not found');
  }
  
  res.json({
    success: true,
    message: 'Product updated successfully',
    data: {
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      stock: product.stock,
      updatedAt: product.updated_at
    }
  });
});

/**
 * Delete a product
 * DELETE /api/products/:id
 */
const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Check product ownership for merchants
  if (req.user.role === ROLES.MERCHANT) {
    const { data: merchant } = await supabaseAdmin
      .from('merchants')
      .select('id')
      .eq('user_id', req.user.id)
      .single();
    
    const { data: existingProduct } = await supabaseAdmin
      .from('products')
      .select('merchant_id')
      .eq('id', id)
      .single();
    
    if (!existingProduct || existingProduct.merchant_id !== merchant?.id) {
      throw createError.forbidden('You can only delete your own products');
    }
  }
  
  const { error } = await supabaseAdmin
    .from('products')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Delete product error:', error);
    throw createError.internal('Failed to delete product');
  }
  
  res.json({
    success: true,
    message: 'Product deleted successfully'
  });
});

/**
 * Get product categories
 * GET /api/products/categories
 */
const getCategories = asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('category')
    .eq('is_active', true);
  
  if (error) {
    throw createError.internal('Failed to fetch categories');
  }
  
  // Get unique categories with count
  const categoryCount = {};
  data.forEach(p => {
    if (p.category) {
      categoryCount[p.category] = (categoryCount[p.category] || 0) + 1;
    }
  });
  
  const categories = Object.entries(categoryCount)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
  
  res.json({
    success: true,
    data: categories
  });
});

/**
 * Get product brands
 * GET /api/products/brands
 */
const getBrands = asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('brand')
    .eq('is_active', true)
    .not('brand', 'is', null);
  
  if (error) {
    throw createError.internal('Failed to fetch brands');
  }
  
  // Get unique brands with count
  const brandCount = {};
  data.forEach(p => {
    if (p.brand) {
      brandCount[p.brand] = (brandCount[p.brand] || 0) + 1;
    }
  });
  
  const brands = Object.entries(brandCount)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
  
  res.json({
    success: true,
    data: brands
  });
});

/**
 * Update product stock
 * PATCH /api/products/:id/stock
 */
const updateStock = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { quantity, operation } = req.body; // operation: 'set', 'add', 'subtract'
  
  if (quantity === undefined || quantity < 0) {
    throw createError.badRequest('Valid quantity is required');
  }
  
  // Get current stock
  const { data: product, error: fetchError } = await supabaseAdmin
    .from('products')
    .select('stock')
    .eq('id', id)
    .single();
  
  if (fetchError || !product) {
    throw createError.notFound('Product not found');
  }
  
  let newStock;
  switch (operation) {
    case 'add':
      newStock = product.stock + quantity;
      break;
    case 'subtract':
      newStock = Math.max(0, product.stock - quantity);
      break;
    case 'set':
    default:
      newStock = quantity;
  }
  
  const { data: updated, error } = await supabaseAdmin
    .from('products')
    .update({ stock: newStock })
    .eq('id', id)
    .select('id, name, stock, low_stock_threshold')
    .single();
  
  if (error) {
    throw createError.internal('Failed to update stock');
  }
  
  res.json({
    success: true,
    message: 'Stock updated successfully',
    data: {
      id: updated.id,
      name: updated.name,
      stock: updated.stock,
      isLowStock: updated.stock < updated.low_stock_threshold
    }
  });
});

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  getBrands,
  updateStock
};
