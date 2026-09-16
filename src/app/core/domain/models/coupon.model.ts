export type CouponStatus = 'live' | 'capped' | 'scheduled' | 'inactive';

export interface Coupon {
  id: string;
  code: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  pharmacyCode: string;
  validFrom: string;
  validUntil: string;
  status: CouponStatus;
  isActive: boolean;
  isExpired: boolean;
  uniqueCopyCount: number;
  maxCopies: number;
  displayOrder: number;
}

export interface CouponUpsert {
  code: string;
  titleEn: string;
  titleAr: string;
  descriptionEn?: string | null;
  descriptionAr?: string | null;
  pharmacyCode: string;
  validFrom: string;
  validUntil: string;
  maxCopies: number;
  displayOrder?: number;
  isActive?: boolean;
}
