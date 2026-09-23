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
