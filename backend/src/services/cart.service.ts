import { supabaseAdmin } from '../config/supabase';
import { CartValidationResponse } from '../types';
import { CartItem } from '../utils/validators';
import { BadRequestError, NotFoundError } from '../utils/errors';

export class CartService {
  /**
   * Validate cart items against database (Zero-Trust validation)
   * This fetches current prices from the DB - never trusts client payload
   */
  async validateCart(items: CartItem[]): Promise<CartValidationResponse> {
    if (items.length === 0) {
      throw new BadRequestError('Cart is empty');
    }

    // Get unique product IDs
    const productIds = [...new Set(items.map(item => item.product_id))];

    // Fetch current product data from database
    const { data: products, error } = await supabaseAdmin
      .from('products')
      .select('id, name, base_price, stock, status')
      .in('id', productIds)
      .eq('status', 'live');

    if (error) {
      throw new Error(`Failed to fetch products: ${error.message}`);
    }

    if (!products || products.length === 0) {
      throw new NotFoundError('No valid products found in cart');
    }

    // Create a map for quick lookup
    const productMap = new Map(products.map(p => [p.id, p]));

    // Validate each item
    const validatedItems = items.map(item => {
      const product = productMap.get(item.product_id);
      
      if (!product) {
        return {
          product_id: item.product_id,
          name: 'Unknown Product',
          quantity: item.quantity,
          unit_price: 0,
          subtotal: 0,
          in_stock: false,
          available_stock: 0,
        };
      }

      const inStock = product.stock >= item.quantity;
      
      return {
        product_id: item.product_id,
        name: product.name,
        quantity: item.quantity,
        unit_price: product.base_price,
        subtotal: product.base_price * item.quantity,
        in_stock: inStock,
        available_stock: product.stock,
      };
    });

    // Calculate total from validated items only
    const totalFiat = validatedItems
      .filter(item => item.in_stock)
      .reduce((sum, item) => sum + item.subtotal, 0);

    return {
      success: validatedItems.every(item => item.in_stock && item.unit_price > 0),
      items: validatedItems,
      total_fiat: totalFiat,
      currency: 'NGN',
    };
  }

  /**
   * Aggregate cart items (combine same products)
   */
  aggregateCartItems(items: CartItem[]): CartItem[] {
    const aggregated = new Map<string, number>();
    
    for (const item of items) {
      const existing = aggregated.get(item.product_id) || 0;
      aggregated.set(item.product_id, existing + item.quantity);
    }

    return Array.from(aggregated.entries()).map(([product_id, quantity]) => ({
      product_id,
      quantity,
    }));
  }
}

export const cartService = new CartService();
