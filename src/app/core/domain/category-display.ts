export interface CategoryNamed {
  name: string;
  nameEn?: string;
  slug: string;
  externalKey: string;
  children?: CategoryNamed[];
}

export type CategoryLocale = 'ar' | 'en';

export type CategoryIconName =
  | 'sparkles'
  | 'palette'
  | 'baby'
  | 'pill'
  | 'droplets'
  | 'wind'
  | 'user'
  | 'shower'
  | 'heart'
  | 'stethoscope'
  | 'salad'
  | 'dumbbell'
  | 'cross'
  | 'gift'
  | 'house-heart'
  | 'eye'
  | 'shield'
  | 'sitemap'
  | 'tag';

const ICON_RULES: Array<{ icon: CategoryIconName; needles: string[] }> = [
  { icon: 'sparkles', needles: ['fragrance', 'perfume', 'عطر', 'عطور'] },
  { icon: 'palette', needles: ['makeup', 'مكياج', 'cosmetic'] },
  { icon: 'baby', needles: ['baby', 'diaper', 'طفل', 'أطفال', 'حفاض', 'infant', 'mother', '70640'] },
  { icon: 'pill', needles: ['vitamin', 'فيتامين', 'supplement'] },
  { icon: 'droplets', needles: ['skin', 'بشر', 'cream', 'moisturizer', 'skincare', '70207', '70162'] },
  { icon: 'wind', needles: ['hair', 'شعر', 'shampoo', 'hair-care'] },
  { icon: 'user', needles: ['personal', 'شخصي', 'oral', 'deodorant', 'personal-care'] },
  { icon: 'shower', needles: ['body', 'جسم', 'bath', 'استحمام'] },
  { icon: 'heart', needles: ['feminine', 'نسائ'] },
  { icon: 'stethoscope', needles: ['medical', 'equipment', 'جهاز', 'أجهزة', '69619', 'diabetes', 'سكر'] },
  { icon: 'salad', needles: ['nutrition', 'تغذية', 'milk', 'حليب', 'food', 'healthy'] },
  { icon: 'dumbbell', needles: ['sport', 'رياض', 'protein', 'بروتين'] },
  { icon: 'cross', needles: ['pharmacy', 'دواء', 'أدوية', 'otc'] },
  { icon: 'gift', needles: ['gift', 'هدايا'] },
  { icon: 'house-heart', needles: ['home', 'منزلي', 'home-health'] },
  { icon: 'eye', needles: ['lens', 'عدس', 'contact'] },
  { icon: 'shield', needles: ['first-aid', 'إسعاف', 'wound', 'جروح'] }
];

const ARABIC_ROOT_NAMES: Record<string, string> = {
  'skin-care': 'العناية بالبشرة',
  'hair-care': 'العناية بالشعر',
  baby: 'العناية بالأطفال',
  'personal-care': 'العناية الشخصية',
  'body-care': 'العناية بالجسم',
  feminine: 'العناية النسائية',
  vitamins: 'الفيتامينات',
  otc: 'أدوية بدون وصفة',
  fragrances: 'العطور',
  perfumes: 'العطور',
  makeup: 'المكياج',
  'diapers-and-wipes': 'الحفاضات والمناديل',
  'baby-milk': 'حليب الأطفال',
  'mother-and-baby': 'الأم والطفل',
  'medical-equipment': 'الأجهزة الطبية',
  pharmacy: 'الصيدلية',
  'sports-nutrition': 'التغذية الرياضية',
  'healthy-nutrition': 'التغذية الصحية',
  'home-health-care': 'الرعاية الصحية المنزلية',
  other: 'أخرى'
};

const ARABIC = /[\u0600-\u06FF]/;
const TOKEN_MAP: Record<string, string> = {
  womens: "Women's",
  mens: "Men's",
  childrens: "Children's",
  and: 'and',
  of: 'of',
  for: 'for',
  the: 'the',
  otc: 'OTC'
};

export function categoryEnglishName(node: CategoryNamed): string {
  const stored = node.nameEn?.trim();
  if (stored) return stored;

  const name = node.name.trim();
  if (name && !ARABIC.test(name)) {
    return name === name.toLowerCase() ? titleCaseSegment(name.replace(/\s+/g, '-')) : name;
  }

  const key = (node.externalKey || '').trim().replace(/^\/+|\/+$/g, '');
  const source = key || (node.slug || '').replace(/--/g, '/');
  if (!source || source.toLowerCase() === 'other') return 'Other';

  const segment = source.split('/').filter(Boolean).at(-1) ?? source;
  return titleCaseSegment(segment);
}

export function categoryDisplayName(node: CategoryNamed, locale: CategoryLocale): string {
  if (locale === 'en') {
    const english = categoryEnglishName(node);
    return english === english.toLowerCase()
      ? titleCaseSegment(english.replace(/\s+/g, '-'))
      : english;
  }
  return ARABIC_ROOT_NAMES[node.slug.toLowerCase()] ?? node.name;
}

function titleCaseSegment(segment: string): string {
  return segment
    .split('-')
    .filter(Boolean)
    .map((raw, index) => {
      const mapped = TOKEN_MAP[raw.toLowerCase()];
      if (mapped) {
        if (index === 0 && ['and', 'of', 'for', 'the'].includes(mapped)) {
          return mapped[0].toUpperCase() + mapped.slice(1);
        }
        return mapped;
      }
      return raw[0].toUpperCase() + raw.slice(1).toLowerCase();
    })
    .join(' ');
}

export function categoryIconName(node: CategoryNamed): CategoryIconName {
  const haystack = `${node.externalKey} ${node.slug} ${node.name} ${node.nameEn ?? ''}`.toLowerCase();
  for (const rule of ICON_RULES) {
    if (rule.needles.some((needle) => haystack.includes(needle.toLowerCase()))) {
      return rule.icon;
    }
  }
  return 'tag';
}

/** @deprecated Prefer categoryIconName — kept for any leftover PrimeIcons callers. */
export function categoryIconClass(node: CategoryNamed): string {
  return `pi-${categoryIconName(node)}`;
}

export function filterCategoryTree<T extends CategoryNamed>(nodes: T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return nodes;

  const out: T[] = [];
  for (const n of nodes) {
    const kids = filterCategoryTree((n.children ?? []) as T[], q);
    const selfHit =
      n.name.toLowerCase().includes(q) ||
      categoryEnglishName(n).toLowerCase().includes(q) ||
      n.slug.toLowerCase().includes(q) ||
      n.externalKey.toLowerCase().includes(q);
    if (selfHit || kids.length) {
      out.push({ ...n, children: selfHit ? n.children : kids });
    }
  }
  return out;
}
