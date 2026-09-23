import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BestDealPage, BestDealsFilterParams } from '../../domain/models/best-deal.model';
import { BestDealsRepository } from '../../domain/repositories/best-deals.repository';
import { UseCase } from '../use-case.contract';

@Injectable({ providedIn: 'root' })
export class ListBestDealsUseCase
  implements UseCase<BestDealsFilterParams, Observable<BestDealPage>>
{
  private readonly repository = inject(BestDealsRepository);

  execute(params: BestDealsFilterParams): Observable<BestDealPage> {
    return this.repository.listBest(params);
  }
}
