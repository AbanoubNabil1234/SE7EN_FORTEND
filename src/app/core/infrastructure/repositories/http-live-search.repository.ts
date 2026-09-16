import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { LiveSearchRepository } from '../../domain/repositories/live-search.repository';
import { LiveSearchReport, LiveSearchGroup, LiveSearchOffer } from '../../domain/models/live-search.model';
import { API_ENDPOINTS } from '../http/api-endpoints.constants';
import { resolveApiUrl } from '../http/api-origin';

@Injectable({ providedIn: 'root' })
export class HttpLiveSearchRepository extends LiveSearchRepository {
  private readonly http = inject(HttpClient);

  search(query: string): Observable<LiveSearchReport> {
    const params = new HttpParams().set('q', query.trim());
    return this.http
      .get<Record<string, unknown>>(API_ENDPOINTS.LIVE_SEARCH, { params })
      .pipe(map((raw) => this.normalizeReport(raw)));
  }

  private normalizeReport(raw: Record<string, unknown>): LiveSearchReport {
    const groupsRaw = raw['groups'] ?? raw['Groups'] ?? [];
    const notesRaw = raw['notes'] ?? raw['Notes'] ?? [];
    const byPharmRaw = raw['productsByPharmacy'] ?? raw['ProductsByPharmacy'] ?? {};
    const statusRaw = raw['pharmacyStatus'] ?? raw['PharmacyStatus'];

    return {
      query: String(raw['query'] ?? raw['Query'] ?? ''),
      totalProducts: Number(raw['totalProducts'] ?? raw['TotalProducts'] ?? 0),
      productsByPharmacy: this.normalizeCountMap(byPharmRaw),
      groups: Array.isArray(groupsRaw)
        ? groupsRaw.map((g) => this.normalizeGroup(g)).filter((g): g is LiveSearchGroup => g !== null)
        : [],
      notes: Array.isArray(notesRaw) ? notesRaw.map((n) => String(n)) : [],
      matchingRuleset: String(raw['matchingRuleset'] ?? raw['MatchingRuleset'] ?? ''),
      pharmacyStatus: statusRaw && typeof statusRaw === 'object'
        ? this.normalizeStringMap(statusRaw)
        : null
    };
  }

  private normalizeGroup(raw: unknown): LiveSearchGroup | null {
    if (!raw || typeof raw !== 'object') return null;
    const r = raw as Record<string, unknown>;
    const label = String(r['label'] ?? r['Label'] ?? '').trim();
    if (!label) return null;

    const offersRaw = r['offers'] ?? r['Offers'] ?? [];
    const variantsRaw = r['variants'] ?? r['Variants'] ?? [];
    const relatedRaw = r['relatedPacks'] ?? r['RelatedPacks'];

    return {
      label,
      brand: (r['brand'] ?? r['Brand'] ?? null) as string | null,
      baseName: (r['baseName'] ?? r['BaseName'] ?? null) as string | null,
      strength: (r['strength'] ?? r['Strength'] ?? null) as string | null,
      packSize: (r['packSize'] ?? r['PackSize'] ?? null) as string | null,
      dosageForm: (r['dosageForm'] ?? r['DosageForm'] ?? null) as string | null,
      normalizedKey: (r['normalizedKey'] ?? r['NormalizedKey'] ?? null) as string | null,
      variants: Array.isArray(variantsRaw) ? variantsRaw.map((v) => String(v)) : [],
      availablePharmacies: Number(r['availablePharmacies'] ?? r['AvailablePharmacies'] ?? 0),
      totalPharmacies: Number(r['totalPharmacies'] ?? r['TotalPharmacies'] ?? 0),
      matchConfidence: Number(r['matchConfidence'] ?? r['MatchConfidence'] ?? 0),
      matchType: String(r['matchType'] ?? r['MatchType'] ?? ''),
      matchMethod: String(r['matchMethod'] ?? r['MatchMethod'] ?? ''),
      offers: Array.isArray(offersRaw)
        ? offersRaw.map((o) => this.normalizeOffer(o)).filter((o): o is LiveSearchOffer => o !== null)
        : [],
      relevanceScore: Number(r['relevanceScore'] ?? r['RelevanceScore'] ?? 0),
      familyKey: (r['familyKey'] ?? r['FamilyKey'] ?? null) as string | null,
      isProbable: Boolean(r['isProbable'] ?? r['IsProbable'] ?? false),
      relatedPacks: Array.isArray(relatedRaw)
        ? relatedRaw.map((p) => this.normalizeRelatedPack(p)).filter((p) => p !== null)
        : null,
      lowestPrice: Number(r['lowestPrice'] ?? r['LowestPrice'] ?? 0),
      highestPrice: Number(r['highestPrice'] ?? r['HighestPrice'] ?? 0),
      savingsPercent: (r['savingsPercent'] ?? r['SavingsPercent'] ?? null) as number | null,
      barcode: (r['barcode'] ?? r['Barcode'] ?? null) as string | null
    };
  }

  private normalizeOffer(raw: unknown): LiveSearchOffer | null {
    if (!raw || typeof raw !== 'object') return null;
    const r = raw as Record<string, unknown>;
    const code = String(r['pharmacyCode'] ?? r['PharmacyCode'] ?? '').trim();
    const name = String(r['productName'] ?? r['ProductName'] ?? r['pharmacyName'] ?? '').trim();
    if (!code || !name) return null;
    return {
      pharmacyCode: code,
      pharmacyName: String(r['pharmacyName'] ?? r['PharmacyName'] ?? code),
      productName: name,
      price: Number(r['price'] ?? r['Price'] ?? 0),
      currency: String(r['currency'] ?? r['Currency'] ?? 'SAR'),
      productUrl: (r['productUrl'] ?? r['ProductUrl'] ?? null) as string | null,
      imageUrl: resolveApiUrl((r['imageUrl'] ?? r['ImageUrl'] ?? null) as string | null),
      packSize: (r['packSize'] ?? r['PackSize'] ?? null) as string | null,
      brand: (r['brand'] ?? r['Brand'] ?? null) as string | null,
      sku: (r['sku'] ?? r['Sku'] ?? null) as string | null,
      barcode: (r['barcode'] ?? r['Barcode'] ?? null) as string | null,
      normalizedKey: (r['normalizedKey'] ?? r['NormalizedKey'] ?? null) as string | null,
      unitPrice: (r['unitPrice'] ?? r['UnitPrice'] ?? null) as number | null,
      unitPriceUnit: (r['unitPriceUnit'] ?? r['UnitPriceUnit'] ?? null) as string | null,
      oldPrice: (r['oldPrice'] ?? r['OldPrice'] ?? null) as number | null,
      discountPercent: (r['discountPercent'] ?? r['DiscountPercent'] ?? null) as number | null
    };
  }

  private normalizeRelatedPack(raw: unknown) {
    if (!raw || typeof raw !== 'object') return null;
    const r = raw as Record<string, unknown>;
    const offersRaw = r['offers'] ?? r['Offers'];
    return {
      label: String(r['label'] ?? r['Label'] ?? ''),
      packSize: (r['packSize'] ?? r['PackSize'] ?? null) as string | null,
      lowestPrice: Number(r['lowestPrice'] ?? r['LowestPrice'] ?? 0),
      unitPrice: (r['unitPrice'] ?? r['UnitPrice'] ?? null) as number | null,
      unitPriceUnit: (r['unitPriceUnit'] ?? r['UnitPriceUnit'] ?? null) as string | null,
      availablePharmacies: Number(r['availablePharmacies'] ?? r['AvailablePharmacies'] ?? 0),
      offers: Array.isArray(offersRaw)
        ? offersRaw.map((o) => this.normalizeOffer(o)).filter((o): o is LiveSearchOffer => o !== null)
        : null,
      barcode: (r['barcode'] ?? r['Barcode'] ?? null) as string | null
    };
  }

  private normalizeCountMap(raw: unknown): Record<string, number> {
    if (!raw || typeof raw !== 'object') return {};
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      out[k] = Number(v ?? 0);
    }
    return out;
  }

  private normalizeStringMap(raw: unknown): Record<string, string> {
    if (!raw || typeof raw !== 'object') return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      out[k] = String(v ?? '');
    }
    return out;
  }
}
