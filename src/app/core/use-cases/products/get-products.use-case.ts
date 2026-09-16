import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Product } from '../../domain/models/product.model';
import { ProductRepository } from '../../domain/repositories/product.repository';
import { UseCase } from '../use-case.contract';

export interface GetProductsParams {
  query?: string;
  category?: string;
}

/**
 * Use Case: Get and Filter Products.
 */
@Injectable({ providedIn: 'root' })
export class GetProductsUseCase implements UseCase<GetProductsParams | undefined, Observable<Product[]>> {
  private readonly repository = inject(ProductRepository);

  execute(params?: GetProductsParams): Observable<Product[]> {
    return this.repository.getAll(params?.query, params?.category);
  }
}
