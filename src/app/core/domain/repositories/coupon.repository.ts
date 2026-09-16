import { Observable } from 'rxjs';
import { Coupon, CouponStatus, CouponUpsert } from '../models/coupon.model';

export abstract class CouponRepository {
  abstract listAdmin(params?: {
    query?: string;
    status?: 'all' | CouponStatus;
    pharmacy?: string;
  }): Observable<Coupon[]>;
  abstract create(payload: CouponUpsert): Observable<Coupon>;
  abstract update(id: string, payload: CouponUpsert): Observable<Coupon>;
  abstract delete(id: string): Observable<void>;
}
