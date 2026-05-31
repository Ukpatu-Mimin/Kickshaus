
import { paymentService } from '../services/payment.service';
import { supabaseAdmin } from '../config/supabase';

async function testConfirmOrder() {
    console.log('Testing Full Order Confirmation...');

    // 1. Get a user
    const { data: user } = await supabaseAdmin.from('users').select('id').limit(1).single();
    if (!user) { console.error('No user found'); return; }

    // 2. Create a merchant
    const { data: merchant } = await supabaseAdmin.from('merchants').insert({
        business_name: 'Test Merchant',
        email: `test_m_${Date.now()}@example.com`,
        password_hash: 'hash',
        wallet_address: '11111111111111111111111111111111',
        status: 'approved'
    }).select().single();
    
    // 3. Create a product
    const { data: product } = await supabaseAdmin.from('products').insert({
        merchant_id: merchant.id,
        name: 'Test Product',
        category: 'Test',
        base_price: 1000,
        stock: 5,
        status: 'live'
    }).select().single();

    console.log(`Created product ${product.id} with stock ${product.stock}`);

    // 4. Create Order
    const reference = `TEST-REF-${Date.now()}`;
    const { data: order } = await supabaseAdmin.from('orders').insert({
        user_id: user.id,
        total_amount_fiat: 1000,
        total_amount_sol: 0,
        payment_status: 'pending',
        fulfillment_status: 'pending',
        reference_key: reference,
        contact_email: 'test@example.com'
    }).select().single();

    // 5. Create Order Item
    await supabaseAdmin.from('order_items').insert({
        order_id: order.id,
        product_id: product.id,
        quantity: 2,
        price_at_purchase: 1000
    });

    console.log(`Created order ${order.id} for 2 items`);

    // 6. Confirm Order
    console.log('Confirming order...');
    const result = await paymentService.confirmOrder(order.id, reference);
    console.log('Confirmation Result:', result);

    // 7. Verify Stock
    const { data: updatedProduct } = await supabaseAdmin.from('products').select('stock').eq('id', product.id).single();
    if (!updatedProduct) { console.error('Product not found'); return; }
    console.log(`New Stock: ${updatedProduct.stock}`);

    if (updatedProduct.stock !== 3) {
        console.error('Stock mismatch! Expected 3');
    }

    // Clean up
    await supabaseAdmin.from('orders').delete().eq('id', order.id);
    await supabaseAdmin.from('products').delete().eq('id', product.id);
    await supabaseAdmin.from('merchants').delete().eq('id', merchant.id);
}

testConfirmOrder().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
