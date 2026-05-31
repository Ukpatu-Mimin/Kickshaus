import { Response } from 'express';
import { productService } from '../services/product.service';
import { paymentService } from '../services/payment.service';
import { AuthenticatedRequest } from '../types';
import { sendSuccess } from '../utils/errors';
import { 
  CreateProductInput, 
  UpdateProductInput,
  PaginationInput 
} from '../utils/validators';

export class ProductController {
  /**
   * Get all live products (public)
   * GET /api/products
   */
  async getProducts(req: AuthenticatedRequest, res: Response): Promise<void> {
    const pagination = req.query as unknown as PaginationInput;
    
    const result = await productService.getPublicProducts(pagination);

    sendSuccess(res, result);
  }

  /**
   * Get a single product by ID (public for live products)
   * GET /api/products/:id
   */
  async getProduct(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    
    const product = await productService.getProductById(id);

    sendSuccess(res, { product });
  }

  /**
   * Get merchant's own products
   * GET /api/merchant/products
   */
  async getMerchantProducts(req: AuthenticatedRequest, res: Response): Promise<void> {
    const merchantId = req.user!.merchantId!;
    const { status } = req.query;
    
    const products = await productService.getMerchantProducts(
      merchantId,
      status as 'pending_approval' | 'live' | 'rejected' | undefined
    );

    sendSuccess(res, { products });
  }

  /**
   * Create a new product (merchant only)
   * POST /api/products
   */
  async createProduct(req: AuthenticatedRequest, res: Response): Promise<void> {
    const merchantId = req.user!.merchantId!;
    const productData = req.body as CreateProductInput;
    
    const product = await productService.createProduct(merchantId, productData);

    sendSuccess(res, {
      message: 'Product created successfully. Pending admin approval.',
      product,
    }, 201);
  }

  /**
   * Update a product (merchant only - own products)
   * PUT /api/products/:id
   */
  async updateProduct(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const merchantId = req.user!.merchantId!;
    const updates = req.body as UpdateProductInput;
    
    const product = await productService.updateProduct(id, merchantId, updates);

    sendSuccess(res, {
      message: 'Product updated successfully',
      product,
    });
  }

  /**
   * Delete a product (merchant only - own products)
   * DELETE /api/products/:id
   */
  async deleteProduct(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const merchantId = req.user!.merchantId!;
    
    await productService.deleteProduct(id, merchantId);

    sendSuccess(res, {
      message: 'Product deleted successfully',
    });
  }

  /**
   * Get products pending approval (admin only)
   * GET /api/admin/products/pending
   */
  async getPendingProducts(req: AuthenticatedRequest, res: Response): Promise<void> {
    const products = await productService.getPendingProducts();

    sendSuccess(res, { products });
  }

  /**
   * Approve a product (admin only)
   * PUT /api/admin/products/:id/approve
   */
  async approveProduct(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    
    const product = await productService.updateProductStatus(id, 'live');

    sendSuccess(res, {
      message: 'Product approved successfully',
      product,
    });
  }

  /**
   * Reject a product (admin only)
   * PUT /api/admin/products/:id/reject
   */
  async rejectProduct(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    
    const product = await productService.updateProductStatus(id, 'rejected');

    sendSuccess(res, {
      message: 'Product rejected',
      product,
    });
  }

  /**
   * Get orders for the logged-in merchant
   * GET /api/merchant/orders
   */
  async getMerchantOrders(req: AuthenticatedRequest, res: Response): Promise<void> {
    const merchantId = req.user!.merchantId!;
    const orders = await paymentService.getMerchantOrders(merchantId);
    sendSuccess(res, { orders });
  }
}

export const productController = new ProductController();
