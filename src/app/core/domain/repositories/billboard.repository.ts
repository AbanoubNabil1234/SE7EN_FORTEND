import { Observable } from 'rxjs';
import { Billboard, BillboardUpsert, MobileBillboard } from '../models/billboard.model';

export abstract class BillboardRepository {
  abstract listAdmin(params?: { query?: string; status?: 'all' | 'active' | 'inactive' }): Observable<Billboard[]>;
  abstract uploadImage(file: File): Observable<string>;
  abstract create(payload: BillboardUpsert): Observable<Billboard>;
  abstract update(id: string, payload: BillboardUpsert): Observable<Billboard>;
  abstract delete(id: string): Observable<void>;
  abstract listMobileActive(): Observable<MobileBillboard[]>;
}
