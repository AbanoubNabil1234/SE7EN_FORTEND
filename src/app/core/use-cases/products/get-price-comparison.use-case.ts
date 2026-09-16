import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PriceComparison } from '../../domain/models/price-comparison.model';
import { ProductRepository } from '../../domain/repositories/product.repository';
import { UseCase } from '../use-case.contract';

/**
 * Use Case: Get Live Price Comparison for a Product across Pharmacies.
 */
@Injectable({ providedIn: 'root' })
export class GetPriceComparisonUseCase implements UseCase<string, Observable<PriceComparison>> {
  private readonly repository = inject(ProductRepository);

  execute(productId: string): Observable<PriceComparison> {
    return this.repository.getPriceComparison(productId);
  }
}
