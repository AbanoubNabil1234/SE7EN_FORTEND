import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { BestDeal, BestDealPage, BestDealsFilterParams, BestDealsSettings } from '../../domain/models/best-deal.model';
import { BestDealsRepository } from '../../domain/repositories/best-deals.repository';
import { API_ENDPOINTS } from '../http/api-endpoints.constants';
import { resolveApiUrl } from '../http/api-origin';

@Injectable({ providedIn: 'root' })
export class HttpBestDealsRepository extends BestDealsRepository {
  private readonly http = inject(HttpClient);

  listBest(params: BestDealsFilterParams): Observable<BestDealPage> {
    let httpParams = new HttpParams()
      .set('page', String(params.page ?? 1))
      .set('pageSize', String(params.pageSize ?? 24));

    if (params.minDiscount != null && Number.isFinite(params.minDiscount)) {
      httpParams = httpParams.set('minDiscount', String(params.minDiscount));
    }
    if (params.maxDiscount != null && Number.isFinite(params.maxDiscount) && params.maxDiscount > 0) {
      httpParams = httpParams.set('maxDiscount', String(params.maxDiscount));
    }
    if (params.pharmacyCode?.trim() && params.pharmacyCode !== 'all') {
      httpParams = httpParams.set('pharmacyCode', params.pharmacyCode.trim());
    }
    if (params.categoryId?.trim() && params.categoryId !== 'all') {
      httpParams = httpParams.set('categoryId', params.categoryId.trim());
    }
    if (params.search?.trim()) {
      httpParams = httpParams.set('search', params.search.trim());
    }
    if (params.sortBy?.trim()) {
      httpParams = httpParams.set('sortBy', params.sortBy.trim());
    }

    return this.http
      .get<Record<string, unknown>>(API_ENDPOINTS.DEALS_BEST, { params: httpParams })
      .pipe(map((raw) => this.normalizePage(raw)));
  }

  getSettings(): Observable<BestDealsSettings> {
    return this.http.get<BestDealsSettings>(API_ENDPOINTS.ADMIN_DEALS_SETTINGS);
  }

  updateSettings(request: { defaultMinDiscount?: number; pinnedIds?: string[]; excludedIds?: string[] }): Observable<BestDealsSettings> {
    return this.http.put<BestDealsSettings>(API_ENDPOINTS.ADMIN_DEALS_SETTINGS, request);
  }

  refreshCache(): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(API_ENDPOINTS.ADMIN_DEALS_REFRESH_CACHE, {});
  }

  togglePin(id: string): Observable<BestDealsSettings> {
    return this.http.post<BestDealsSettings>(API_ENDPOINTS.ADMIN_DEALS_TOGGLE_PIN, { id });
  }

  toggleExclude(id: string): Observable<BestDealsSettings> {
    return this.http.post<BestDealsSettings>(API_ENDPOINTS.ADMIN_DEALS_TOGGLE_EXCLUDE, { id });
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
    const price = Number(r['price'] ?? r['Price'] ?? 0) || 0;
    const savings = Number(r['savings'] ?? r['Savings']) || (oldPrice && oldPrice > price ? Number((oldPrice - price).toFixed(2)) : 0);

    return {
      pharmacyProductId: text('pharmacyProductId', '') ?? '',
      masterId: text('masterId'),
      name: text('name', '') ?? '',
      englishName: text('englishName'),
      brand: text('brand'),
      imageUrl: resolveApiUrl(text('imageUrl')),
      familyKey: text('familyKey'),
      pharmacyCode: text('pharmacyCode', '') ?? '',
      pharmacyName: text('pharmacyName', '') ?? '',
      productUrl: text('productUrl', '') ?? '',
      price,
      oldPrice: oldPrice != null && Number.isFinite(oldPrice) ? oldPrice : null,
      discountPercent: Number(r['discountPercent'] ?? r['DiscountPercent'] ?? 0) || 0,
      savings,
      currency: text('currency', 'SAR') ?? 'SAR',
      categoryId: text('categoryId'),
      isPeerComparison: Boolean(r['isPeerComparison'] ?? r['IsPeerComparison']),
      isPinned: Boolean(r['isPinned'] ?? r['IsPinned']),
      isExcluded: Boolean(r['isExcluded'] ?? r['IsExcluded'])
    };
  }
}
