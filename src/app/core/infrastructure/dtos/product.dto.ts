export interface ProductDto {
  id: string;
  name: string;
  generic_name?: string;
  brand: string;
  category: string;
  dosage_form: string;
  strength?: string;
  image_url?: string;
  best_price: number;
  currency?: string;
  available_pharmacies_count: number;
  in_stock: boolean;
}

export interface PharmacyOfferDto {
  pharmacy_id: string;
  pharmacy_name: string;
  pharmacy_slug: string;
  pharmacy_logo?: string;
  rating: number;
  delivery_time_minutes: number;
  delivery_fee: number;
  price: number;
  currency?: string;
  discount_percentage?: number;
  in_stock: boolean;
  product_url?: string;
  last_updated: string;
}

export interface PriceComparisonDto {
  product_id: string;
  product_name: string;
  offers: PharmacyOfferDto[];
  lowest_price: number;
  highest_price: number;
  potential_savings: number;
  currency?: string;
}
