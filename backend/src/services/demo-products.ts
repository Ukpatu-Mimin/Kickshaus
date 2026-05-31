import { Product } from '../types';

/**
 * Demo/sample products used as fallback when database is unavailable
 * or when there are no products in the database
 */
export const demoProducts: Product[] = [];

/**
 * Check if a product ID is a demo product
 */
export function isDemoProduct(id: string): boolean {
  return id.startsWith('demo-');
}

/**
 * Get demo product by ID
 */
export function getDemoProductById(id: string): Product | undefined {
  return demoProducts.find(p => p.id === id);
}