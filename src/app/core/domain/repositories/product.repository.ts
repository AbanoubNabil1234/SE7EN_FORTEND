import { Observable } from 'rxjs';
import { Product } from '../models/product.model';
import { PriceComparison } from '../models/price-comparison.model';

/**
 * Product Repository Contract (Abstract Class / DI Token).
 * Part of the Domain layer; concrete implementations live in the Infrastructure layer.
 */
export abstract class ProductRepository {
  abstract getAll(query?: string, category?: string): Observable<Product[]>;
  abstract getById(id: string): Observable<Product | null>;
  abstract getPriceComparison(productId: string): Observable<PriceComparison>;
  abstract getFeatured(): Observable<Product[]>;
}
