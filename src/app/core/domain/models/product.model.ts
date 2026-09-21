import { Money } from '../value-objects/money.vo';

/**
 * Product Domain Entity (Pure TypeScript - Framework Agnostic).
 */
export interface Product {
  id: string;
  name: string;
  arabicName?: string;
  englishName?: string;
  genericName?: string;
  brand: string;
  category: string;
  dosageForm: string;
  strength?: string;
  imageUrl?: string;
  bestPrice: Money;
  availablePharmaciesCount: number;
  inStock: boolean;
}
