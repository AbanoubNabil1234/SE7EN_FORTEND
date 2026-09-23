import { Observable } from 'rxjs';
import { BestDealPage, BestDealsFilterParams, BestDealsSettings } from '../models/best-deal.model';

export abstract class BestDealsRepository {
  abstract listBest(params: BestDealsFilterParams): Observable<BestDealPage>;
  abstract getSettings(): Observable<BestDealsSettings>;
  abstract updateSettings(request: { defaultMinDiscount?: number; pinnedIds?: string[]; excludedIds?: string[] }): Observable<BestDealsSettings>;
  abstract refreshCache(): Observable<{ success: boolean; message: string }>;
  abstract togglePin(id: string): Observable<BestDealsSettings>;
  abstract toggleExclude(id: string): Observable<BestDealsSettings>;
}
