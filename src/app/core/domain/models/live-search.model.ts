export interface LiveSearchOffer {
  pharmacyCode: string;
  pharmacyName: string;
  productName: string;
  price: number;
  currency: string;
  productUrl: string | null;
  imageUrl: string | null;
  packSize: string | null;
  brand?: string | null;
  sku?: string | null;
  barcode?: string | null;
  normalizedKey?: string | null;
  unitPrice?: number | null;
  unitPriceUnit?: string | null;
  oldPrice?: number | null;
  discountPercent?: number | null;
}

export interface LiveSearchFamilyPack {
  label: string;
  packSize: string | null;
  lowestPrice: number;
  unitPrice?: number | null;
  unitPriceUnit?: string | null;
  availablePharmacies: number;
  offers?: LiveSearchOffer[] | null;
  barcode?: string | null;
}

export interface LiveSearchGroup {
  label: string;
  brand: string | null;
  baseName: string | null;
  strength: string | null;
  packSize: string | null;
  dosageForm: string | null;
  normalizedKey: string | null;
  variants: string[];
  availablePharmacies: number;
  totalPharmacies: number;
  matchConfidence: number;
  matchType: string;
  matchMethod: string;
  offers: LiveSearchOffer[];
  relevanceScore?: number;
  familyKey?: string | null;
  isProbable?: boolean;
  relatedPacks?: LiveSearchFamilyPack[] | null;
  lowestPrice: number;
  highestPrice: number;
  savingsPercent?: number | null;
  barcode?: string | null;
}

export interface LiveSearchReport {
  query: string;
  totalProducts: number;
  productsByPharmacy: Record<string, number>;
  groups: LiveSearchGroup[];
  notes: string[];
  matchingRuleset?: string;
  pharmacyStatus?: Record<string, string> | null;
}
