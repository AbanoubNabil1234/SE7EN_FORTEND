export interface BestDeal {
  pharmacyProductId: string;
  masterId?: string | null;
  name: string;
  englishName: string | null;
  brand: string | null;
  imageUrl: string | null;
  familyKey: string | null;
  pharmacyCode: string;
  pharmacyName: string;
  productUrl: string;
  price: number;
  oldPrice: number | null;
  discountPercent: number;
  savings: number;
  currency: string;
  categoryId?: string | null;
  isPeerComparison?: boolean;
  isPinned?: boolean;
  isExcluded?: boolean;
}

export interface BestDealPage {
  page: number;
  pageSize: number;
  total: number;
  data: BestDeal[];
}

export interface BestDealsSettings {
  defaultMinDiscount: number;
  pinnedIds: string[];
  excludedIds: string[];
  totalPinned: number;
  totalExcluded: number;
  updatedAtUtc?: string;
}

export interface BestDealsFilterParams {
  minDiscount?: number;
  maxDiscount?: number;
  pharmacyCode?: string;
  categoryId?: string;
  search?: string;
  sortBy?: string;
  page?: number;
  pageSize?: number;
}

export interface CustomerBestPricePharmacyOffer {
  pharmacyCode: string;
  name: string;
  logoUrl?: string | null;
  price: number;
  currency: string;
  availability?: string | null;
  isBest: boolean;
  productUrl?: string | null;
  nameAr?: string | null;
  nameEn?: string | null;
  oldPrice?: number | null;
  discountPercent: number;
}

export interface CustomerBestPriceCard {
  masterId: string;
  pharmacyProductId: string;
  name: string;
  brand?: string | null;
  imageUrl?: string | null;
  familyKey?: string | null;
  pharmacyCode: string;
  pharmacyName: string;
  productUrl?: string | null;
  price: number;
  oldPrice?: number | null;
  discountPercent: number;
  currency: string;
  pharmacyNameAr?: string | null;
  pharmacyNameEn?: string | null;
  pharmacyCount: number;
  lowestPrice?: number;
  highestPrice?: number;
  dealType?: string;
  nextBestPrice?: number | null;
  comparisonSavingsAmount?: number | null;
  comparisonSavingsPercent?: number | null;
  pharmacies: CustomerBestPricePharmacyOffer[];
  isPinned?: boolean;
}

export interface CustomerFeaturedPage<T = CustomerBestPriceCard> {
  page: number;
  pageSize: number;
  total: number;
  data: T[];
}

export interface CustomerBestPriceFilterParams {
  page?: number;
  pageSize?: number;
  categorySlug?: string;
}

