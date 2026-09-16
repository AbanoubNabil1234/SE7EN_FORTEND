export interface Magazine {
  id: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  pharmacyCode: string;
  validFrom: string;
  validUntil: string;
  status: 'active' | 'inactive';
  isActive: boolean;
  isExpired: boolean;
  coverImageUrl: string | null;
  pdfUrl: string | null;
  displayOrder: number;
}

export interface MagazineUpsert {
  titleEn: string;
  titleAr: string;
  descriptionEn?: string | null;
  descriptionAr?: string | null;
  pharmacyCode: string;
  validFrom: string;
  validUntil: string;
  coverImageUrl?: string | null;
  pdfUrl?: string | null;
  displayOrder?: number;
  isActive?: boolean;
}

export interface MobileMagazine {
  id: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  pharmacyCode: string;
  validFrom: string;
  validUntil: string;
  coverImageUrl: string | null;
  pdfUrl: string | null;
  displayOrder: number;
}
