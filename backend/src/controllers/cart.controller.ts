import { Response } from 'express';
import { cartService } from '../services/cart.service';
import { AuthenticatedRequest } from '../types';
import { sendSuccess } from '../utils/errors';
import { ValidateCartInput } from '../utils/validators';

export class CartController {
  /**
   * Validate cart items against database
   * POST /api/cart/validate
   * 
   * Critical: This performs zero-trust validation by fetching
   * current prices from the database, NOT trusting client payload
   */
  async validateCart(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { items } = req.body as ValidateCartInput;
    
    // Aggregate items (combine same products)
    const aggregatedItems = cartService.aggregateCartItems(items);
    
    // Validate against database
    const validation = await cartService.validateCart(aggregatedItems);

    sendSuccess(res, validation);
  }
}

export const cartController = new CartController();
