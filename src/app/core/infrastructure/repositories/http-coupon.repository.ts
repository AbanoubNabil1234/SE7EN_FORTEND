import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { CouponRepository } from '../../domain/repositories/coupon.repository';
import { Coupon, CouponStatus, CouponUpsert } from '../../domain/models/coupon.model';
import { API_ENDPOINTS } from '../http/api-endpoints.constants';

const STATUSES = new Set<CouponStatus>(['live', 'capped', 'scheduled', 'inactive']);

@Injectable({ providedIn: 'root' })
export class HttpCouponRepository extends CouponRepository {
  private readonly http = inject(HttpClient);

  listAdmin(params?: {
    query?: string;
    status?: 'all' | CouponStatus;
    pharmacy?: string;
  }): Observable<Coupon[]> {
    let httpParams = new HttpParams();
    if (params?.query?.trim()) httpParams = httpParams.set('q', params.query.trim());
    if (params?.status && params.status !== 'all') httpParams = httpParams.set('status', params.status);
    if (params?.pharmacy && params.pharmacy !== 'all') httpParams = httpParams.set('pharmacy', params.pharmacy);
    return this.http
      .get<unknown[]>(API_ENDPOINTS.COUPONS, { params: httpParams })
      .pipe(map((rows) => (Array.isArray(rows) ? rows.map((r) => this.normalize(r)) : [])));
  }

  create(payload: CouponUpsert): Observable<Coupon> {
    return this.http.post<unknown>(API_ENDPOINTS.COUPONS, payload).pipe(map((raw) => this.normalize(raw)));
  }

  update(id: string, payload: CouponUpsert): Observable<Coupon> {
    return this.http.put<unknown>(API_ENDPOINTS.COUPON(id), payload).pipe(map((raw) => this.normalize(raw)));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(API_ENDPOINTS.COUPON(id));
  }

  private normalize(raw: unknown): Coupon {
    const r = (raw ?? {}) as Record<string, unknown>;
    const statusRaw = String(r['status'] ?? r['Status'] ?? 'inactive').toLowerCase();
    const status: CouponStatus = STATUSES.has(statusRaw as CouponStatus)
      ? (statusRaw as CouponStatus)
      : 'inactive';
    return {
      id: String(r['id'] ?? r['Id'] ?? ''),
      code: String(r['code'] ?? r['Code'] ?? ''),
      titleEn: String(r['titleEn'] ?? r['TitleEn'] ?? ''),
      titleAr: String(r['titleAr'] ?? r['TitleAr'] ?? ''),
      descriptionEn: String(r['descriptionEn'] ?? r['DescriptionEn'] ?? ''),
      descriptionAr: String(r['descriptionAr'] ?? r['DescriptionAr'] ?? ''),
      pharmacyCode: String(r['pharmacyCode'] ?? r['PharmacyCode'] ?? ''),
      validFrom: String(r['validFrom'] ?? r['ValidFrom'] ?? ''),
      validUntil: String(r['validUntil'] ?? r['ValidUntil'] ?? ''),
      status,
      isActive: Boolean(r['isActive'] ?? r['IsActive'] ?? false),
      isExpired: Boolean(r['isExpired'] ?? r['IsExpired'] ?? false),
      uniqueCopyCount: Number(r['uniqueCopyCount'] ?? r['UniqueCopyCount'] ?? 0),
      maxCopies: Number(r['maxCopies'] ?? r['MaxCopies'] ?? 0),
      displayOrder: Number(r['displayOrder'] ?? r['DisplayOrder'] ?? 0)
    };
  }
}
