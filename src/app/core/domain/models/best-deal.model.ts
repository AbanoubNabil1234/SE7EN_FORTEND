export interface BestDeal {
  pharmacyProductId: string;
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
  currency: string;
}

export interface BestDealPage {
  page: number;
  pageSize: number;
  total: number;
  data: BestDeal[];
}
