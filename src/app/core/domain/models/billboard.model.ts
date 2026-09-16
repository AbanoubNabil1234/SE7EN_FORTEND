export interface Billboard {
  id: string;
  title: string;
  subtitle: string;
  startDate: string;
  durationDays: number;
  endDate: string;
  status: 'active' | 'inactive';
  isActive: boolean;
  isExpired: boolean;
  imageUrl: string | null;
  imageLabelAr: string;
  imageLabelEn: string;
  displayOrder: number;
  percentage: number | null;
  fixedDiscount: number | null;
  linkUrl: string | null;
}

export interface BillboardUpsert {
  title: string;
  subtitle: string;
  startDate: string;
  durationDays: number;
  imageUrl?: string | null;
  imageLabelAr?: string | null;
  imageLabelEn?: string | null;
  displayOrder?: number;
  isActive?: boolean;
  percentage?: number | null;
  fixedDiscount?: number | null;
  linkUrl?: string | null;
}

export interface MobileBillboard {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string | null;
  imageLabelAr: string;
  imageLabelEn: string;
  displayOrder: number;
  percentage: number | null;
  fixedDiscount: number | null;
  linkUrl: string | null;
}
