import { supabaseAdmin } from '../config/supabase';

async function cleanupDatabase() {
  console.log('🧹 Starting database cleanup...');

  try {
    // 1. Get the default admin ID to preserve it
    const adminEmail = 'admin@kickshaus.com';
    const { data: adminUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', adminEmail)
      .single();

    if (!adminUser) {
      console.log('⚠️ Default admin not found. Creating it first...');
      // We'll let the seed script handle creation if it doesn't exist, 
      // but for now, we'll just skip the deletion filter if it's missing.
    }

    // 2. Delete all merchants
    // (This will cascade delete their products and associated order items)
    console.log('Deleting all merchants...');
    const { error: merchantError } = await supabaseAdmin
      .from('merchants')
      .delete()
      .neq('email', 'merchant@kickshaus.com'); // Optional: keep default merchant if you want

    if (merchantError) console.error('Error deleting merchants:', merchantError.message);
    else console.log('✅ All non-default merchants deleted.');

    // 3. Delete all users except the default admin
    console.log('Deleting all users except admin...');
    const query = supabaseAdmin.from('users').delete();
    
    if (adminUser) {
      query.neq('id', adminUser.id);
    } else {
      query.neq('email', adminEmail);
    }

    const { error: userError } = await query;

    if (userError) console.error('Error deleting users:', userError.message);
    else console.log('✅ All non-admin users deleted.');

    console.log('\n✨ Cleanup complete! Your database is now fresh.');
    console.log('💡 Note: You may want to run "npm run seed" now to restore default products.');

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

cleanupDatabase();
