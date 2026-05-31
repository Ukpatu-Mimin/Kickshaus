
import { paymentService } from '../services/payment.service';
import { supabaseAdmin } from '../config/supabase';
import { config } from '../config/env';

async function testPaystackVerification() {
    console.log('Testing Paystack Verification...');
    
    // 1. Create a dummy order
    console.log('Creating dummy order...');
    const reference = `TEST-REF-${Date.now()}`;
    const { data: order, error } = await supabaseAdmin
        .from('orders')
        .insert({
            user_id: '123e4567-e89b-12d3-a456-426614174000', // Assuming a valid UUID, might fail if foreign key constraint
            total_amount_fiat: 1000,
            total_amount_sol: 0,
            payment_status: 'pending',
            fulfillment_status: 'pending',
            reference_key: reference,
            expires_at: new Date(Date.now() + 3600000).toISOString(),
            contact_email: 'test@example.com'
        })
        .select()
        .single();
        
    if (error) {
        console.error('Failed to create dummy order:', error);
        // If FK fails, we might need to fetch a real user first
        const { data: user } = await supabaseAdmin.from('users').select('id').limit(1).single();
        if (user) {
             console.log(`Retrying with real user ID: ${user.id}`);
             const { data: order2, error: error2 } = await supabaseAdmin
                .from('orders')
                .insert({
                    user_id: user.id,
                    total_amount_fiat: 1000,
                    total_amount_sol: 0,
                    payment_status: 'pending',
                    fulfillment_status: 'pending',
                    reference_key: reference,
                    expires_at: new Date(Date.now() + 3600000).toISOString(),
                    contact_email: 'test@example.com'
                })
                .select()
                .single();
                
             if (error2) {
                 console.error('Retry failed:', error2);
                 process.exit(1);
             }
             console.log(`Created order: ${order2.id}`);
             
             // Mock the Paystack API verification by intercepting fetch? 
             // Or we just test the DB update logic manually.
             
             // Let's test confirmOrder directly since that's what updates the status
             console.log('Testing confirmOrder...');
             const result = await paymentService.confirmOrder(order2.id, reference);
             console.log('Confirmation result:', result);
             
             const { data: updatedOrder } = await supabaseAdmin
                .from('orders')
                .select('payment_status')
                .eq('id', order2.id)
                .single();
                
             console.log('Updated Status:', updatedOrder?.payment_status);
        } else {
             console.error('No users found to attach order to.');
        }
    }
}

testPaystackVerification().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
