import { Money } from '../value-objects/money.vo';
import { Pharmacy } from './pharmacy.model';

export interface PharmacyOffer {
  pharmacy: Pharmacy;
  price: Money;
  discountPercentage?: number;
  inStock: boolean;
  productUrl?: string;
  lastUpdated: Date;
}

/**
 * Price Comparison Domain Aggregate.
 */
export interface PriceComparison {
  productId: string;
  productName: string;
  offers: PharmacyOffer[];
  lowestPrice: Money;
  highestPrice: Money;
  potentialSavings: Money;
}
