import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Product } from '../../domain/models/product.model';
import { ProductRepository } from '../../domain/repositories/product.repository';
import { UseCase } from '../use-case.contract';

/**
 * Use Case: Retrieve Single Product by ID.
 */
@Injectable({ providedIn: 'root' })
export class GetProductByIdUseCase implements UseCase<string, Observable<Product | null>> {
  private readonly repository = inject(ProductRepository);

  execute(id: string): Observable<Product | null> {
    return this.repository.getById(id);
  }
}
