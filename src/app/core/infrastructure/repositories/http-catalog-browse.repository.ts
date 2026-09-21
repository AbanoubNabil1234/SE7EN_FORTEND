import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, of, tap } from 'rxjs';
import { CatalogBrowseRepository } from '../../domain/repositories/catalog-browse.repository';
import { CategoryNode } from '../../domain/models/category.model';
import { categoryEnglishName } from '../../domain/category-display';
import {
  CatalogFamily,
  CatalogFamilyPage,
  CatalogOffer,
  CatalogPack,
  GroupCodeLinkResult,
  GroupCodeMergeResult,
  PharmacyProductSearchHit
} from '../../domain/models/catalog-family.model';
import { API_ENDPOINTS } from '../http/api-endpoints.constants';
import { resolveApiUrl } from '../http/api-origin';
import { TtlCache } from '../http/ttl-cache';

const FRESH_MS = 3 * 60_000;
const STALE_MS = 30 * 60_000;

@Injectable({ providedIn: 'root' })
export class HttpCatalogBrowseRepository extends CatalogBrowseRepository {
  private readonly http = inject(HttpClient);
  private readonly familiesCache = new TtlCache<CatalogFamilyPage>('se7en.admin.families.default.v3', STALE_MS);
  private readonly brandsCache = new TtlCache<string[]>('se7en.admin.family-brands.v1', STALE_MS);
  private readonly structureCache = new TtlCache<CategoryNode[]>('se7en.admin.category-structure.v1', STALE_MS);
  private readonly searchCache = new Map<string, { value: CatalogFamilyPage; at: number }>();

  getCategoryStructure(): Observable<CategoryNode[]> {
    return this.structureCache.staleWhileRevalidate(
      FRESH_MS,
      this.http
        .get<unknown>(API_ENDPOINTS.CATEGORIES_STRUCTURE)
        .pipe(map((raw) => this.normalizeNodes(Array.isArray(raw) ? raw : [])))
    );
  }

  getCategoryTree(): Observable<CategoryNode[]> {
    return this.http
      .get<unknown>(API_ENDPOINTS.CATEGORIES_TREE)
      .pipe(map((raw) => this.normalizeNodes(Array.isArray(raw) ? raw : [])));
  }

  listFamilyBrands(): Observable<string[]> {
    return this.brandsCache.staleWhileRevalidate(
      FRESH_MS,
      this.http.get<unknown>(API_ENDPOINTS.CATALOG_FAMILY_BRANDS).pipe(
        map((raw) => {
          if (!Array.isArray(raw)) return [];
          return raw
            .map((x) => String(x ?? '').trim())
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b, 'ar', { sensitivity: 'base' }));
        })
      )
    );
  }

  listFamilies(params: {
    categorySlug?: string;
    brand?: string;
    query?: string;
    sort?: 'nameAsc' | 'nameDesc';
    page?: number;
    pageSize?: number;
  }): Observable<CatalogFamilyPage> {
    let httpParams = new HttpParams()
      .set('page', String(params.page ?? 1))
      .set('pageSize', String(params.pageSize ?? 24));

    if (params.categorySlug?.trim()) {
      httpParams = httpParams.set('categorySlug', params.categorySlug.trim());
    }
    if (params.brand?.trim()) {
      httpParams = httpParams.set('brand', params.brand.trim());
    }
    if (params.query?.trim()) {
      httpParams = httpParams.set('q', params.query.trim());
    }
    if (params.sort) {
      httpParams = httpParams.set('sort', params.sort);
    }

    const request$ = this.http
      .get<Record<string, unknown>>(API_ENDPOINTS.CATALOG_FAMILIES, { params: httpParams })
      .pipe(map((raw) => this.normalizePage(raw)));

    if (this.isDefaultFirstPage(params)) {
      return this.familiesCache.staleWhileRevalidate(FRESH_MS, request$);
    }

    if (params.query?.trim()) {
      const cacheKey = JSON.stringify(params);
      const hit = this.searchCache.get(cacheKey);
      if (hit && Date.now() - hit.at < FRESH_MS) {
        return of(hit.value);
      }
      return request$.pipe(
        tap((res) => {
          this.searchCache.set(cacheKey, { value: res, at: Date.now() });
          if (this.searchCache.size > 100) {
            const firstKey = this.searchCache.keys().next().value;
            if (firstKey) this.searchCache.delete(firstKey);
          }
        })
      );
    }

    return request$;
  }

  private isDefaultFirstPage(params: {
    categorySlug?: string;
    brand?: string;
    query?: string;
    sort?: 'nameAsc' | 'nameDesc';
    page?: number;
    pageSize?: number;
  }): boolean {
    return (
      (params.page ?? 1) === 1 &&
      (params.pageSize ?? 24) === 24 &&
      !params.categorySlug?.trim() &&
      !params.brand?.trim() &&
      !params.query?.trim() &&
      (params.sort ?? 'nameAsc') === 'nameAsc'
    );
  }

  getFamilyByKey(familyKey: string): Observable<CatalogFamily> {
    const params = new HttpParams().set('familyKey', familyKey);
    return this.http
      .get<unknown>(API_ENDPOINTS.CATALOG_FAMILY_ITEM, { params })
      .pipe(
        map((raw) => {
          const family = this.normalizeFamily(raw);
          if (!family) {
            throw new Error('Family not found');
          }
          return family;
        })
      );
  }

  linkByGroupCode(pharmacyProductId: string, code: string): Observable<GroupCodeLinkResult> {
    return this.http
      .post<Record<string, unknown>>(API_ENDPOINTS.ADMIN_GROUP_CODE_LINK, {
        pharmacyProductId,
        code
      })
      .pipe(
        map((raw) => ({
          code: String(raw['code'] ?? raw['Code'] ?? code),
          familyKey: String(raw['familyKey'] ?? raw['FamilyKey'] ?? ''),
          pharmacyProductId: String(raw['pharmacyProductId'] ?? raw['PharmacyProductId'] ?? pharmacyProductId),
          masterProductId: String(raw['masterProductId'] ?? raw['MasterProductId'] ?? ''),
          overrideId: String(raw['overrideId'] ?? raw['OverrideId'] ?? '')
        }))
      );
  }

  mergeGroups(sourceGroupCode: string, targetGroupCode: string): Observable<GroupCodeMergeResult> {
    return this.http
      .post<Record<string, unknown>>(API_ENDPOINTS.ADMIN_GROUP_CODE_MERGE, {
        sourceCode: sourceGroupCode,
        targetCode: targetGroupCode
      })
      .pipe(
        map((raw) => {
          this.familiesCache.clear();
          this.searchCache.clear();
          return {
            targetCode: String(raw['targetCode'] ?? raw['TargetCode'] ?? targetGroupCode),
            sourceCode: String(raw['sourceCode'] ?? raw['SourceCode'] ?? sourceGroupCode),
            mergedCount: Number(raw['mergedCount'] ?? raw['MergedCount'] ?? 0),
            success: Boolean(raw['success'] ?? raw['Success'] ?? true),
            errorMessage: (raw['errorMessage'] ?? raw['ErrorMessage'] ?? null) as string | null
          };
        })
      );
  }

  searchPharmacyProducts(query: string, take: number = 30): Observable<PharmacyProductSearchHit[]> {
    const params = new HttpParams()
      .set('q', query.trim())
      .set('take', String(take));

    return this.http
      .get<Array<Record<string, unknown>>>(API_ENDPOINTS.ADMIN_PHARMACY_PRODUCT_SEARCH, { params })
      .pipe(
        map((list) =>
          (Array.isArray(list) ? list : []).map((r) => ({
            id: String(r['id'] ?? r['Id'] ?? ''),
            name: String(r['name'] ?? r['Name'] ?? ''),
            englishName: this.optionalText(r['englishName'] ?? r['EnglishName']),
            pharmacyCode: String(r['pharmacyCode'] ?? r['PharmacyCode'] ?? ''),
            pharmacyName: String(r['pharmacyName'] ?? r['PharmacyName'] ?? ''),
            barcode: this.optionalText(r['barcode'] ?? r['Barcode']),
            price: this.optionalNumber(r['price'] ?? r['Price']),
            oldPrice: this.optionalNumber(r['oldPrice'] ?? r['OldPrice']),
            currency: this.optionalText(r['currency'] ?? r['Currency']) ?? 'SAR',
            imageUrl: this.optionalText(r['imageUrl'] ?? r['ImageUrl']),
            productUrl: this.optionalText(r['productUrl'] ?? r['ProductUrl']),
            packSize: this.optionalText(r['packSize'] ?? r['PackSize']),
            manualGroupCode: this.optionalText(r['manualGroupCode'] ?? r['ManualGroupCode']),
            masterProductId: this.optionalText(r['masterProductId'] ?? r['MasterProductId'])
          }))
        )
      );
  }

  setPriceSyncEnabled(masterProductId: string, enabled: boolean): Observable<{ id: string; enabled: boolean }> {
    return this.http
      .post<Record<string, unknown>>(API_ENDPOINTS.ADMIN_MASTER_PRICE_SYNC(masterProductId), { enabled })
      .pipe(
        map((raw) => ({
          id: String(raw['id'] ?? raw['Id'] ?? masterProductId),
          enabled: Boolean(raw['enabled'] ?? raw['Enabled'] ?? enabled)
        }))
      );
  }

  setMasterBarcode(masterProductId: string, barcode: string): Observable<{ id: string; barcode: string }> {
    return this.http
      .post<Record<string, unknown>>(API_ENDPOINTS.ADMIN_MASTER_BARCODE(masterProductId), { barcode })
      .pipe(
        map((raw) => {
          this.familiesCache.clear();
          return {
            id: String(raw['id'] ?? raw['Id'] ?? masterProductId),
            barcode: String(raw['barcode'] ?? raw['Barcode'] ?? barcode)
          };
        })
      );
  }

  private normalizeNodes(rows: unknown[]): CategoryNode[] {
    return rows
      .map((row) => this.normalizeNode(row))
      .filter((n): n is CategoryNode => n !== null)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  }

  private normalizeNode(raw: unknown): CategoryNode | null {
    if (!raw || typeof raw !== 'object') return null;
    const r = raw as Record<string, unknown>;
    const id = String(r['id'] ?? r['Id'] ?? '');
    const slug = String(r['slug'] ?? r['Slug'] ?? '');
    if (!id || !slug) return null;

    const childrenRaw = r['children'] ?? r['Children'];
    const children = Array.isArray(childrenRaw) ? this.normalizeNodes(childrenRaw) : [];
    const nameEn = String(r['nameEn'] ?? r['NameEn'] ?? '').trim();
    const countRaw = r['productCount'] ?? r['ProductCount'];

    return {
      id,
      name: String(r['name'] ?? r['Name'] ?? slug),
      nameEn: nameEn || categoryEnglishName({
        name: String(r['name'] ?? r['Name'] ?? slug),
        slug,
        externalKey: String(r['externalKey'] ?? r['ExternalKey'] ?? '')
      }),
      slug,
      externalKey: String(r['externalKey'] ?? r['ExternalKey'] ?? ''),
      parentId: (r['parentId'] ?? r['ParentId'] ?? null) as string | null,
      sortOrder: Number(r['sortOrder'] ?? r['SortOrder'] ?? 0),
      productCount: countRaw == null ? undefined : Number(countRaw),
      children
    };
  }

  private normalizePage(raw: Record<string, unknown>): CatalogFamilyPage {
    const dataRaw = raw['data'] ?? raw['Data'] ?? [];
    const data = Array.isArray(dataRaw)
      ? dataRaw.map((row) => this.normalizeFamily(row)).filter((f): f is CatalogFamily => f !== null)
      : [];

    return {
      page: Number(raw['page'] ?? raw['Page'] ?? 1),
      pageSize: Number(raw['pageSize'] ?? raw['PageSize'] ?? data.length),
      total: Number(raw['total'] ?? raw['Total'] ?? data.length),
      data
    };
  }

  private normalizeFamily(raw: unknown): CatalogFamily | null {
    if (!raw || typeof raw !== 'object') return null;
    const r = raw as Record<string, unknown>;
    const familyKey = String(r['familyKey'] ?? r['FamilyKey'] ?? '');
    const label = String(r['label'] ?? r['Label'] ?? '');
    if (!familyKey && !label) return null;

    const packsRaw = r['packs'] ?? r['Packs'] ?? [];
    const packs = Array.isArray(packsRaw)
      ? packsRaw.map((p) => this.normalizePack(p)).filter((p): p is CatalogPack => p !== null)
      : [];

    const imageFromPack = packs
      .flatMap((p) => p.offers.map((o) => o.imageUrl))
      .find((url): url is string => !!url);

    return {
      familyKey: familyKey || label,
      brand: (r['brand'] ?? r['Brand'] ?? null) as string | null,
      label: label || familyKey,
      arabicName: this.optionalText(r['arabicName'] ?? r['ArabicName']),
      englishName: this.optionalText(r['englishName'] ?? r['EnglishName']),
      dosageForm: (r['dosageForm'] ?? r['DosageForm'] ?? null) as string | null,
      strength: (r['strength'] ?? r['Strength'] ?? null) as string | null,
      imageUrl: resolveApiUrl((r['imageUrl'] ?? r['ImageUrl'] ?? imageFromPack ?? null) as string | null),
      groupCode: this.optionalText(r['groupCode'] ?? r['GroupCode']),
      packs
    };
  }

  private normalizePack(raw: unknown): CatalogPack | null {
    if (!raw || typeof raw !== 'object') return null;
    const r = raw as Record<string, unknown>;
    const offersRaw = r['offers'] ?? r['Offers'] ?? [];
    const offers = Array.isArray(offersRaw)
      ? offersRaw.map((o) => this.normalizeOffer(o)).filter((o): o is CatalogOffer => o !== null)
      : [];

    return {
      masterId: String(r['masterId'] ?? r['MasterId'] ?? ''),
      label: String(r['label'] ?? r['Label'] ?? ''),
      arabicName: this.optionalText(r['arabicName'] ?? r['ArabicName']),
      englishName: this.optionalText(r['englishName'] ?? r['EnglishName']),
      requiresPackReview: (r['requiresPackReview'] ?? r['RequiresPackReview']) === true,
      packSize: String(r['packSize'] ?? r['PackSize'] ?? ''),
      barcode: this.optionalText(r['barcode'] ?? r['Barcode']),
      lowestPrice: Number(r['lowestPrice'] ?? r['LowestPrice'] ?? 0),
      highestPrice: Number(r['highestPrice'] ?? r['HighestPrice'] ?? 0),
      savingsPercent: (r['savingsPercent'] ?? r['SavingsPercent'] ?? null) as number | null,
      pharmacyCount: Number(r['pharmacyCount'] ?? r['PharmacyCount'] ?? offers.length),
      matchType: String(r['matchType'] ?? r['MatchType'] ?? 'Pending'),
      priceSyncEnabled: Boolean(r['priceSyncEnabled'] ?? r['PriceSyncEnabled'] ?? true),
      offers
    };
  }

  private normalizeOffer(raw: unknown): CatalogOffer | null {
    if (!raw || typeof raw !== 'object') return null;
    const r = raw as Record<string, unknown>;
    const pid = r['pharmacyProductId'] ?? r['PharmacyProductId'];
    return {
      pharmacyCode: String(r['pharmacyCode'] ?? r['PharmacyCode'] ?? ''),
      pharmacyName: String(r['pharmacyName'] ?? r['PharmacyName'] ?? ''),
      price: Number(r['price'] ?? r['Price'] ?? 0),
      oldPrice: (r['oldPrice'] ?? r['OldPrice'] ?? null) as number | null,
      discountPercent: (r['discountPercent'] ?? r['DiscountPercent'] ?? null) as number | null,
      currency: String(r['currency'] ?? r['Currency'] ?? 'SAR'),
      availability: String(r['availability'] ?? r['Availability'] ?? ''),
      productUrl: (r['productUrl'] ?? r['ProductUrl'] ?? null) as string | null,
      imageUrl: resolveApiUrl((r['imageUrl'] ?? r['ImageUrl'] ?? null) as string | null),
      pharmacyProductId: pid == null || pid === '' ? null : String(pid),
      packSize: this.optionalText(r['packSize'] ?? r['PackSize']),
      listingName: String(r['listingName'] ?? r['ListingName'] ?? '').trim() || null,
      englishListingName: this.optionalText(r['englishListingName'] ?? r['EnglishListingName'] ?? r['englishName'] ?? r['EnglishName']),
      barcode: this.optionalText(r['barcode'] ?? r['Barcode']),
      matchMethod: this.optionalText(r['matchMethod'] ?? r['MatchMethod'])
    };
  }

  private optionalText(value: unknown): string | null {
    if (value == null) return null;
    const text = String(value).trim();
    return text.length === 0 || text === 'null' || text === 'undefined' ? null : text;
  }

  private optionalNumber(value: unknown): number | null {
    if (value == null || value === '') return null;
    const n = Number(value);
    return isNaN(n) ? null : n;
  }
}
