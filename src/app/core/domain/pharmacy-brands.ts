export interface PharmacyBrand {
  code: string;
  nameEn: string;
  nameAr: string;
  logo: string;
  icon: string;
}

export const PHARMACY_BRANDS: readonly PharmacyBrand[] = [
  {
    code: 'nahdi',
    nameEn: 'Nahdi',
    nameAr: 'النهدي',
    logo: 'assets/pharmacies/nahdi.png',
    icon: 'assets/pharmacies/nahdi-icon.png'
  },
  {
    code: 'aldawaa',
    nameEn: 'Al-Dawaa',
    nameAr: 'الدواء',
    logo: 'assets/pharmacies/aldawaa.png',
    icon: 'assets/pharmacies/aldawaa-icon.png'
  },
  {
    code: 'whites',
    nameEn: 'Whites',
    nameAr: 'وايتس',
    logo: 'assets/pharmacies/whites.png',
    icon: 'assets/pharmacies/whites-icon.png'
  },
  {
    code: 'united',
    nameEn: 'United',
    nameAr: 'المتحدة',
    logo: 'assets/pharmacies/united.png',
    icon: 'assets/pharmacies/united-icon.png'
  },
  {
    code: 'lemon',
    nameEn: 'Lemon',
    nameAr: 'صيدلية ليمون',
    logo: 'assets/pharmacies/lemon.png',
    icon: 'assets/pharmacies/lemon-icon.png'
  },
  {
    code: 'ibrand',
    nameEn: 'iBrand',
    nameAr: 'آي براند',
    logo: 'assets/pharmacies/ibrand.png',
    icon: 'assets/pharmacies/ibrand-icon.png'
  },
  {
    code: 'pharmabrand',
    nameEn: 'Pharma Brand',
    nameAr: 'فارما براند',
    logo: 'assets/pharmacies/pharmabrand.png',
    icon: 'assets/pharmacies/pharmabrand-icon.png'
  }
] as const;

const byCode = new Map(PHARMACY_BRANDS.map((b) => [b.code.toLowerCase(), b]));

export function pharmacyBrand(code: string | null | undefined): PharmacyBrand | null {
  if (!code?.trim()) return null;
  return byCode.get(code.trim().toLowerCase()) ?? null;
}

export function pharmacyDisplayName(
  code: string | null | undefined,
  fallbackName: string | null | undefined,
  locale: 'ar' | 'en'
): string {
  const brand = pharmacyBrand(code);
  if (brand) return locale === 'ar' ? brand.nameAr : brand.nameEn;
  if (fallbackName?.trim()) return fallbackName.trim();
  return code?.trim() || '—';
}

export function pharmacyLogo(code: string | null | undefined): string | null {
  return pharmacyBrand(code)?.icon ?? pharmacyBrand(code)?.logo ?? null;
}
