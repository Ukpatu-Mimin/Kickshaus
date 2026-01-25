/**
 * ==========================================
 * DATABASE SEED SCRIPT
 * ==========================================
 * Populates the database with initial sample data
 * Run with: npm run seed
 */

require('dotenv').config();
const { supabaseAdmin } = require('../config/supabase');

// Sample products based on the frontend PRODUCTS_DATABASE
const sampleProducts = [
  {
    name: 'Precious Footwear',
    slug: 'precious-footwear',
    brand: 'Kickshaus',
    category: 'dress',
    price: 180000,
    description: 'NIGERIAN LUXURY SHOES - Premium handcrafted footwear made with the finest materials.',
    images: [
      'https://images.unsplash.com/photo-1614252232199-5d1c2e7d4a0a?w=1200&q=90',
      'https://images.unsplash.com/photo-1605733513502-9e425a13d08f?w=1200&q=90',
      'https://images.unsplash.com/photo-1605733160316-4fc7dac6d16d?w=1200&q=90'
    ],
    badge: 'new',
    stock: 48,
    rating: 5.0,
    sizes: ['40', '41', '42', '43', '44', '45'],
    colors: ['brown', 'black', 'oxblood'],
    sku: 'KH-PREC-001',
    is_active: true,
    is_featured: true
  },
  {
    name: 'Nike Sneakers',
    slug: 'nike-sneakers',
    brand: 'Nike',
    category: 'Fashion',
    price: 155000,
    description: 'Classic Nike sneakers with superior comfort and style.',
    images: [
      'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500&q=80',
      'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=500&q=80',
      'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=500&q=80'
    ],
    badge: 'new',
    stock: 25,
    rating: 4.5,
    sizes: ['40', '41', '42', '43', '44'],
    colors: ['white', 'black', 'blue'],
    sku: 'NK-SNK-001',
    is_active: true,
    is_featured: true
  },
  {
    name: 'Adforce Pumps',
    slug: 'adforce-pumps',
    brand: 'Adidas',
    category: 'Fashion',
    price: 225000,
    description: 'Elegant pumps perfect for any formal occasion.',
    images: [
      'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=500&q=80',
      'https://images.unsplash.com/photo-1560343090-f0409e92791a?w=500&q=80',
      'https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?w=500&q=80'
    ],
    badge: null,
    stock: 15,
    rating: 4.8,
    sizes: ['39', '40', '41', '42'],
    colors: ['red', 'black', 'nude'],
    sku: 'AD-PMP-001',
    is_active: true,
    is_featured: false
  },
  {
    name: "Puma's Revenge",
    slug: 'pumas-revenge',
    brand: 'Puma',
    category: 'Fashion',
    price: 185000,
    description: 'Sporty and stylish Puma shoes for everyday wear.',
    images: [
      'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=500&q=80',
      'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=500&q=80',
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80'
    ],
    badge: 'bestseller',
    stock: 30,
    rating: 4.7,
    sizes: ['40', '41', '42', '43', '44', '45'],
    colors: ['white', 'black', 'grey'],
    sku: 'PM-REV-001',
    is_active: true,
    is_featured: true
  },
  {
    name: 'Classic Oxford',
    slug: 'classic-oxford',
    brand: 'Kickshaus',
    category: 'dress',
    price: 195000,
    description: 'Timeless oxford shoes perfect for business and formal occasions.',
    images: [
      'https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=500&q=80'
    ],
    badge: null,
    stock: 8,
    rating: 4.9,
    sizes: ['40', '41', '42', '43', '44'],
    colors: ['black', 'brown'],
    sku: 'KH-OXF-001',
    is_active: true,
    is_featured: false
  },
  {
    name: 'Chelsea Boot',
    slug: 'chelsea-boot',
    brand: 'Kickshaus',
    category: 'boots',
    price: 220000,
    description: 'Premium leather Chelsea boots for the modern gentleman.',
    images: [
      'https://images.unsplash.com/photo-1638247025967-b4e38f787b76?w=500&q=80'
    ],
    badge: 'limited',
    stock: 5,
    rating: 4.8,
    sizes: ['40', '41', '42', '43', '44', '45'],
    colors: ['black', 'brown', 'tan'],
    sku: 'KH-CHB-001',
    is_active: true,
    is_featured: true
  }
];

// Sample coupons
const sampleCoupons = [
  {
    code: 'SAVE500',
    description: 'Save ₦500 on your order',
    discount_type: 'fixed',
    discount_value: 500,
    min_order_amount: 0,
    is_active: true
  },
  {
    code: 'FIRST10',
    description: '10% off for first-time customers',
    discount_type: 'percentage',
    discount_value: 10,
    max_discount_amount: 5000,
    min_order_amount: 10000,
    is_active: true
  },
  {
    code: 'LUXURY20',
    description: '20% off on orders above ₦100,000',
    discount_type: 'percentage',
    discount_value: 20,
    max_discount_amount: 30000,
    min_order_amount: 100000,
    is_active: true
  }
];

async function seed() {
  console.log('🌱 Starting database seed...\n');
  
  try {
    // Seed products
    console.log('📦 Seeding products...');
    const { data: products, error: productsError } = await supabaseAdmin
      .from('products')
      .upsert(sampleProducts, { onConflict: 'sku' })
      .select();
    
    if (productsError) {
      console.error('Error seeding products:', productsError);
    } else {
      console.log(`   ✅ Seeded ${products.length} products`);
    }
    
    // Seed coupons
    console.log('\n🎟️  Seeding coupons...');
    const { data: coupons, error: couponsError } = await supabaseAdmin
      .from('coupons')
      .upsert(sampleCoupons, { onConflict: 'code' })
      .select();
    
    if (couponsError) {
      console.error('Error seeding coupons:', couponsError);
    } else {
      console.log(`   ✅ Seeded ${coupons.length} coupons`);
    }
    
    console.log('\n✨ Database seeding completed!\n');
    
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

seed();
