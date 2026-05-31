import { supabaseAdmin } from '../config/supabase';
import { hashPassword } from '../utils/helpers';
import { v4 as uuidv4 } from 'uuid';

export async function seedDatabase() {
  console.log('🌱 Seeding database...');

  // 1. Create Admin
  const adminEmail = 'admin@kickshaus.com';
  const adminPassword = 'admin123'; 

  const { data: existingAdmin } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', adminEmail)
    .single();

  if (!existingAdmin) {
    console.log('Creating default admin account...');
    const { error } = await supabaseAdmin.from('users').insert({
      id: uuidv4(),
      email: adminEmail,
      password_hash: hashPassword(adminPassword),
      role: 'admin',
      created_at: new Date().toISOString(),
    });

    if (error) console.error('Error creating admin:', error.message);
    else console.log('✅ Default Admin created: admin@kickshaus.com / admin123');
  } else {
    console.log('ℹ️ Admin account already exists. Updating password and ensuring role is admin...');
    const { error } = await supabaseAdmin
      .from('users')
      .update({ 
        password_hash: hashPassword(adminPassword),
        role: 'admin'
      })
      .eq('email', adminEmail);
    
    if (error) console.error('Error updating admin:', error.message);
    else console.log('✅ Default Admin updated: admin@kickshaus.com / admin123');
  }

  // 2. Create Merchant
  const merchantEmail = 'merchant@kickshaus.com';
  let merchantId: string;

  const { data: existingMerchant } = await supabaseAdmin
    .from('merchants')
    .select('id')
    .eq('email', merchantEmail)
    .single();

  if (!existingMerchant) {
    console.log('Creating default merchant account...');
    merchantId = uuidv4();
    const { error } = await supabaseAdmin.from('merchants').insert({
      id: merchantId,
      business_name: 'Kickshaus Official Store',
      email: merchantEmail,
      phone: '+2348000000000',
      password_hash: hashPassword('merchant'),
      wallet_address: 'GkC3J....DemoWalletAddress', // Placeholder, user updates in profile
      status: 'approved',
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Error creating merchant:', error.message);
      return; 
    }
    console.log('✅ Default Merchant created: merchant@kickshaus.com / merchant');
  } else {
    console.log('ℹ️ Merchant account already exists.');
    merchantId = existingMerchant.id;
  }

  // 3. Create Products
  console.log('Syncing products...');
  
  const products = [
    {
      merchant_id: merchantId,
      name: 'Nike React Infinity Run',
      description: 'The Nike React Infinity Run Flyknit is designed to help reduce injury and keep you on the run. More foam and improved upper details provide a secure and cushioned feel.',
      category: 'Running',
      base_price: 185000,
      stock: 50,
      status: 'live',
      images: {
        main: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=600',
        gallery: []
      }
    },
    {
      merchant_id: merchantId,
      name: 'Classic Oxford Brogue',
      description: 'Timeless elegance meets modern comfort. These hand-crafted Oxfords feature genuine leather soles and premium calfskin upper.',
      category: 'Formal',
      base_price: 250000,
      stock: 20,
      status: 'live',
      images: {
        main: 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?auto=format&fit=crop&q=80&w=600',
        gallery: []
      }
    },
    {
      merchant_id: merchantId,
      name: 'Urban Street Sneaker',
      description: 'Designed for the city streets. Breathable mesh, durable rubber sole, and a style that stands out.',
      category: 'Casual',
      base_price: 95000,
      stock: 100,
      status: 'live',
      images: {
        main: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&q=80&w=600',
        gallery: []
      }
    },
     {
      merchant_id: merchantId,
      name: 'Air Max Pulse',
      description: 'Bringing a new sensation to Air Max. The Pulse features a point-loaded Air unit (meaning it distributes weight to targeted points on the Air unit) for extra bounce.',
      category: 'Lifestyle',
      base_price: 120000,
      stock: 35,
      status: 'live',
      images: {
        main: 'https://images.unsplash.com/photo-1514989940723-e8e51635b782?auto=format&fit=crop&q=80&w=600',
        gallery: []
      }
    },
    {
      merchant_id: merchantId,
      name: 'Jordan Retro High',
      description: 'The iconic Jordan look with premium leather and classic cushioning. A must-have for any sneaker enthusiast.',
      category: 'Casual',
      base_price: 195000,
      stock: 15,
      status: 'live',
      images: {
        main: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&q=80&w=600',
        gallery: []
      }
    },
    {
      merchant_id: merchantId,
      name: 'Leather Chelsea Boot',
      description: 'Elegant and versatile, these Chelsea boots are crafted from premium Italian leather with a durable sole.',
      category: 'Formal',
      base_price: 165000,
      stock: 25,
      status: 'live',
      images: {
        main: 'https://images.unsplash.com/photo-1638247025967-b4e38f787b76?auto=format&fit=crop&q=80&w=600',
        gallery: []
      }
    },
    {
      merchant_id: merchantId,
      name: 'Performance Trainer',
      description: 'Engineered for peak performance. Lightweight, breathable, and designed for maximum stability during intense workouts.',
      category: 'Running',
      base_price: 85000,
      stock: 60,
      status: 'live',
      images: {
        main: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&q=80&w=600',
        gallery: []
      }
    },
    {
      merchant_id: merchantId,
      name: 'Summer Canvas Loafer',
      description: 'Lightweight canvas loafers perfect for the summer season. Comfortable, breathable, and stylish.',
      category: 'Casual',
      base_price: 55000,
      stock: 40,
      status: 'live',
      images: {
        main: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&q=80&w=600',
        gallery: []
      }
    }
  ];

  for (const productData of products) {
    const randomPrice = Math.floor(Math.random() * (200000 - 50000 + 1)) + 50000;
    
    // Check if product exists by name
    const { data: existing } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('name', productData.name)
      .single();

    if (!existing) {
      await supabaseAdmin.from('products').insert({
        ...productData,
        base_price: randomPrice
      });
    } else {
      await supabaseAdmin.from('products').update({
        base_price: randomPrice,
        images: productData.images
      }).eq('id', existing.id);
    }
  }
  console.log(`✅ Synced, updated images, and randomized prices for ${products.length} products.`);
}

// Allow running directly via ts-node
if (require.main === module) {
  seedDatabase().catch(console.error);
}