import { Observable } from 'rxjs';
import { CategoryNode } from '../models/category.model';
import { CatalogFamily, CatalogFamilyPage, GroupCodeLinkResult, PharmacyProductSearchHit } from '../models/catalog-family.model';

export type CatalogFamilySort = 'nameAsc' | 'nameDesc';

export abstract class CatalogBrowseRepository {
  abstract getCategoryStructure(): Observable<CategoryNode[]>;
  abstract getCategoryTree(): Observable<CategoryNode[]>;
  abstract listFamilyBrands(): Observable<string[]>;
  abstract listFamilies(params: {
    categorySlug?: string;
    brand?: string;
    query?: string;
    sort?: CatalogFamilySort;
    page?: number;
    pageSize?: number;
  }): Observable<CatalogFamilyPage>;
  abstract getFamilyByKey(familyKey: string): Observable<CatalogFamily>;
  abstract linkByGroupCode(pharmacyProductId: string, code: string): Observable<GroupCodeLinkResult>;
  abstract searchPharmacyProducts(query: string, take?: number): Observable<PharmacyProductSearchHit[]>;
  abstract setPriceSyncEnabled(masterProductId: string, enabled: boolean): Observable<{ id: string; enabled: boolean }>;
  abstract setMasterBarcode(
    masterProductId: string,
    barcode: string
  ): Observable<{ id: string; barcode: string }>;
}
