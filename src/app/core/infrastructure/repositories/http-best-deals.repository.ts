import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { BestDeal, BestDealPage } from '../../domain/models/best-deal.model';
import { BestDealsRepository } from '../../domain/repositories/best-deals.repository';
import { API_ENDPOINTS } from '../http/api-endpoints.constants';
import { resolveApiUrl } from '../http/api-origin';

@Injectable({ providedIn: 'root' })
export class HttpBestDealsRepository extends BestDealsRepository {
  private readonly http = inject(HttpClient);

  listBest(params: {
    minDiscount: number;
    page?: number;
    pageSize?: number;
  }): Observable<BestDealPage> {
    const httpParams = new HttpParams()
      .set('minDiscount', String(params.minDiscount))
      .set('page', String(params.page ?? 1))
      .set('pageSize', String(params.pageSize ?? 24));

    return this.http
      .get<Record<string, unknown>>(API_ENDPOINTS.DEALS_BEST, { params: httpParams })
      .pipe(map((raw) => this.normalizePage(raw)));
  }

  private normalizePage(raw: Record<string, unknown> | null | undefined): BestDealPage {
    const r = raw ?? {};
    const rows = (r['data'] ?? r['Data'] ?? []) as unknown[];
    return {
      page: Number(r['page'] ?? r['Page'] ?? 1) || 1,
      pageSize: Number(r['pageSize'] ?? r['PageSize'] ?? 24) || 24,
      total: Number(r['total'] ?? r['Total'] ?? 0) || 0,
      data: Array.isArray(rows) ? rows.map((row) => this.normalizeDeal(row)) : []
    };
  }

  private normalizeDeal(raw: unknown): BestDeal {
    const r = (raw ?? {}) as Record<string, unknown>;
    const text = (key: string, fallback: string | null = null): string | null => {
      const value = r[key] ?? r[key[0].toUpperCase() + key.slice(1)];
      if (value == null) return fallback;
      const textValue = String(value).trim();
      return textValue ? textValue : fallback;
    };

    const rawOld = r['oldPrice'] ?? r['OldPrice'];
    const oldPrice = rawOld == null || rawOld === '' ? null : Number(rawOld);

    return {
      pharmacyProductId: text('pharmacyProductId', '') ?? '',
      name: text('name', '') ?? '',
      englishName: text('englishName'),
      brand: text('brand'),
      imageUrl: resolveApiUrl(text('imageUrl')),
      familyKey: text('familyKey'),
      pharmacyCode: text('pharmacyCode', '') ?? '',
      pharmacyName: text('pharmacyName', '') ?? '',
      productUrl: text('productUrl', '') ?? '',
      price: Number(r['price'] ?? r['Price'] ?? 0) || 0,
      oldPrice: oldPrice != null && Number.isFinite(oldPrice) ? oldPrice : null,
      discountPercent: Number(r['discountPercent'] ?? r['DiscountPercent'] ?? 0) || 0,
      currency: text('currency', 'SAR') ?? 'SAR'
    };
  }
}
