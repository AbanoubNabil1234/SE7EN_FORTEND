/**
 * Pharmacy Domain Entity.
 */
export interface Pharmacy {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  rating: number;
  deliveryTimeMinutes: number;
  deliveryFee: number;
  isOpen: boolean;
}
