import { Observable } from 'rxjs';
import { BestDealPage } from '../models/best-deal.model';

export abstract class BestDealsRepository {
  abstract listBest(params: {
    minDiscount: number;
    page?: number;
    pageSize?: number;
  }): Observable<BestDealPage>;
}
