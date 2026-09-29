import { Observable } from 'rxjs';
import {
  CustomerBestPriceCard,
  CustomerBestPriceFilterParams,
  CustomerFeaturedPage
} from '../models/best-deal.model';

export abstract class CustomerFeaturedRepository {
  abstract listBestPrices(
    params: CustomerBestPriceFilterParams
  ): Observable<CustomerFeaturedPage<CustomerBestPriceCard>>;
}
