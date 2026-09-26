import { Observable } from 'rxjs';
import { CategoryNode } from '../models/category.model';
import {
  CatalogFamily,
  CatalogFamilyPage,
  FamilyAiSuggestion,
  GroupCodeLinkResult,
  GroupCodeMergeResult,
  PharmacyProductSearchHit,
  ProductImagesResponse
} from '../models/catalog-family.model';

export type CatalogFamilySort = 'pharmaciesDesc' | 'nameAsc' | 'nameDesc';

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
    pharmacyCount?: number;
  }): Observable<CatalogFamilyPage>;
  abstract getPharmacyDistributionCounts(categorySlug?: string): Observable<{ counts: Record<number, number>; total: number }>;
  abstract getFamilyByKey(familyKey: string): Observable<CatalogFamily>;
  abstract linkByGroupCode(pharmacyProductId: string, code: string): Observable<GroupCodeLinkResult>;
  abstract unlinkOffer(pharmacyProductId: string): Observable<boolean>;
  abstract mergeGroups(sourceGroupCode: string, targetGroupCode: string): Observable<GroupCodeMergeResult>;
  abstract searchPharmacyProducts(
    query: string,
    pharmacyCode?: string | null,
    take?: number,
    unlinkedOnly?: boolean
  ): Observable<PharmacyProductSearchHit[]>;
  abstract getFamilyAiSuggestions(groupCode: string, take?: number): Observable<FamilyAiSuggestion[]>;
  abstract setPriceSyncEnabled(masterProductId: string, enabled: boolean): Observable<{ id: string; enabled: boolean }>;
  abstract setMasterBarcode(
    masterProductId: string,
    barcode: string
  ): Observable<{ id: string; barcode: string }>;
  abstract uploadCategoryImage(
    categoryId: string,
    file: File
  ): Observable<{ id: string; slug: string; imageUrl: string; message: string }>;
  abstract deleteCategoryImage(categoryId: string): Observable<{ id: string; slug: string; imageUrl: string | null }>;
  abstract getProductImages(masterProductId: string): Observable<ProductImagesResponse>;
  abstract uploadProductImage(
    masterProductId: string,
    file: File
  ): Observable<{ id: string; imageUrl: string; message: string }>;
  abstract setProductImageUrl(
    masterProductId: string,
    imageUrl: string
  ): Observable<{ id: string; imageUrl: string; message: string }>;
  abstract deleteProductImage(
    masterProductId: string
  ): Observable<{ id: string; imageUrl: string | null; message: string }>;
  abstract clearCache(): void;
}
