import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BestDealPage } from '../../domain/models/best-deal.model';
import { BestDealsRepository } from '../../domain/repositories/best-deals.repository';
import { UseCase } from '../use-case.contract';

export interface ListBestDealsParams {
  minDiscount: number;
  page?: number;
  pageSize?: number;
}

@Injectable({ providedIn: 'root' })
export class ListBestDealsUseCase
  implements UseCase<ListBestDealsParams, Observable<BestDealPage>>
{
  private readonly repository = inject(BestDealsRepository);

  execute(params: ListBestDealsParams): Observable<BestDealPage> {
    return this.repository.listBest(params);
  }
}
