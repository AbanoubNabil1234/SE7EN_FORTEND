import { Observable } from 'rxjs';
import { Magazine, MagazineUpsert, MobileMagazine } from '../models/magazine.model';

export abstract class MagazineRepository {
  abstract listAdmin(params?: {
    query?: string;
    status?: 'all' | 'active' | 'inactive';
    pharmacy?: string;
  }): Observable<Magazine[]>;
  abstract create(payload: MagazineUpsert): Observable<Magazine>;
  abstract update(id: string, payload: MagazineUpsert): Observable<Magazine>;
  abstract delete(id: string): Observable<void>;
  abstract uploadCover(file: File): Observable<{ url: string }>;
  abstract uploadPdf(file: File): Observable<{ url: string }>;
  abstract listMobileActive(): Observable<MobileMagazine[]>;
}
