import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import {
  CustomerBestPriceCard,
  CustomerBestPriceFilterParams,
  CustomerBestPricePharmacyOffer,
  CustomerFeaturedPage
} from '../../domain/models/best-deal.model';
import { CustomerFeaturedRepository } from '../../domain/repositories/customer-featured.repository';
import { API_ENDPOINTS } from '../http/api-endpoints.constants';
import { resolveApiUrl } from '../http/api-origin';

@Injectable({ providedIn: 'root' })
export class HttpCustomerFeaturedRepository extends CustomerFeaturedRepository {
  private readonly http = inject(HttpClient);

  listBestPrices(
    params: CustomerBestPriceFilterParams
  ): Observable<CustomerFeaturedPage<CustomerBestPriceCard>> {
    let httpParams = new HttpParams()
      .set('mode', 'best_price')
      .set('page', String(params.page ?? 1))
      .set('take', String(params.pageSize ?? 24));

    if (params.categorySlug?.trim() && params.categorySlug !== 'all') {
      httpParams = httpParams.set('categorySlug', params.categorySlug.trim());
    }

    return this.http
      .get<Record<string, unknown>>(API_ENDPOINTS.CUSTOMER_FEATURED, { params: httpParams })
      .pipe(map((raw) => this.normalizePage(raw)));
  }

  private normalizePage(raw: Record<string, unknown> | null | undefined): CustomerFeaturedPage<CustomerBestPriceCard> {
    const r = raw ?? {};
    const rows = (r['data'] ?? r['Data'] ?? []) as unknown[];
    return {
      page: Number(r['page'] ?? r['Page'] ?? 1) || 1,
      pageSize: Number(r['pageSize'] ?? r['PageSize'] ?? 24) || 24,
      total: Number(r['total'] ?? r['Total'] ?? 0) || 0,
      data: Array.isArray(rows) ? rows.map((row) => this.normalizeCard(row)) : []
    };
  }

  private normalizeCard(raw: unknown): CustomerBestPriceCard {
    const r = (raw ?? {}) as Record<string, unknown>;
    const text = (key: string, fallback: string | null = null): string | null => {
      const value = r[key] ?? r[key[0].toUpperCase() + key.slice(1)];
      if (value == null) return fallback;
      const textValue = String(value).trim();
      return textValue ? textValue : fallback;
    };

    const num = (key: string, fallback: number | null = null): number | null => {
      const value = r[key] ?? r[key[0].toUpperCase() + key.slice(1)];
      if (value == null || value === '') return fallback;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    };

    const rawOffers = (r['pharmacies'] ?? r['Pharmacies'] ?? []) as unknown[];
    const pharmacies: CustomerBestPricePharmacyOffer[] = Array.isArray(rawOffers)
      ? rawOffers.map((offerRaw) => {
          const o = (offerRaw ?? {}) as Record<string, unknown>;
          const offerText = (k: string, fb: string | null = null): string | null => {
            const val = o[k] ?? o[k[0].toUpperCase() + k.slice(1)];
            if (val == null) return fb;
            const tv = String(val).trim();
            return tv ? tv : fb;
          };
          const offerNum = (k: string, fb: number | null = null): number | null => {
            const val = o[k] ?? o[k[0].toUpperCase() + k.slice(1)];
            if (val == null || val === '') return fb;
            const parsed = Number(val);
            return Number.isFinite(parsed) ? parsed : fb;
          };

          return {
            pharmacyCode: offerText('pharmacyCode', '') ?? '',
            name: offerText('name', '') ?? '',
            logoUrl: resolveApiUrl(offerText('logoUrl')),
            price: offerNum('price', 0) ?? 0,
            currency: offerText('currency', 'SAR') ?? 'SAR',
            availability: offerText('availability'),
            isBest: Boolean(o['isBest'] ?? o['IsBest']),
            productUrl: offerText('productUrl'),
            nameAr: offerText('nameAr'),
            nameEn: offerText('nameEn'),
            oldPrice: offerNum('oldPrice'),
            discountPercent: offerNum('discountPercent', 0) ?? 0
          };
        })
      : [];

    return {
      masterId: text('masterId', '') ?? '',
      pharmacyProductId: text('pharmacyProductId', '') ?? '',
      name: text('name', '') ?? '',
      brand: text('brand'),
      imageUrl: resolveApiUrl(text('imageUrl')),
      familyKey: text('familyKey'),
      pharmacyCode: text('pharmacyCode', '') ?? '',
      pharmacyName: text('pharmacyName', '') ?? '',
      productUrl: text('productUrl'),
      price: num('price', 0) ?? 0,
      oldPrice: num('oldPrice'),
      discountPercent: num('discountPercent', 0) ?? 0,
      currency: text('currency', 'SAR') ?? 'SAR',
      pharmacyNameAr: text('pharmacyNameAr'),
      pharmacyNameEn: text('pharmacyNameEn'),
      pharmacyCount: num('pharmacyCount', pharmacies.length) ?? pharmacies.length,
      lowestPrice: num('lowestPrice') ?? undefined,
      highestPrice: num('highestPrice') ?? undefined,
      dealType: text('dealType', 'best_price') ?? 'best_price',
      nextBestPrice: num('nextBestPrice'),
      comparisonSavingsAmount: num('comparisonSavingsAmount'),
      comparisonSavingsPercent: num('comparisonSavingsPercent'),
      pharmacies,
      isPinned: Boolean(r['isPinned'] ?? r['IsPinned'])
    };
  }
}
