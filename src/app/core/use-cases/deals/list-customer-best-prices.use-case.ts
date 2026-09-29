import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CustomerBestPriceCard,
  CustomerBestPriceFilterParams,
  CustomerFeaturedPage
} from '../../domain/models/best-deal.model';
import { CustomerFeaturedRepository } from '../../domain/repositories/customer-featured.repository';
import { UseCase } from '../use-case.contract';

@Injectable({ providedIn: 'root' })
export class ListCustomerBestPricesUseCase
  implements UseCase<CustomerBestPriceFilterParams, Observable<CustomerFeaturedPage<CustomerBestPriceCard>>>
{
  private readonly repository = inject(CustomerFeaturedRepository);

  execute(
    params: CustomerBestPriceFilterParams
  ): Observable<CustomerFeaturedPage<CustomerBestPriceCard>> {
    return this.repository.listBestPrices(params);
  }
}
