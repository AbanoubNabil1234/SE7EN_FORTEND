import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  categoryDisplayName,
  categoryEnglishName,
  categoryIconName,
  filterCategoryTree
} from './category-display.ts';

function node(partial: {
  slug: string;
  name: string;
  nameEn?: string;
  externalKey?: string;
  children?: ReturnType<typeof node>[];
}) {
  return {
    externalKey: '',
    children: [] as ReturnType<typeof node>[],
    ...partial
  };
}

describe('categoryDisplayName', () => {
  const perfume = node({
    slug: 'fragrances',
    name: 'العطور',
    nameEn: 'Fragrances',
    externalKey: 'fragrances'
  });

  it('returns Arabic name for ar locale', () => {
    assert.equal(categoryDisplayName(perfume, 'ar'), 'العطور');
  });

  it('normalizes known English root names to Arabic', () => {
    assert.equal(
      categoryDisplayName(node({ slug: 'skin-care', name: 'skin care' }), 'ar'),
      'العناية بالبشرة'
    );
  });

  it('returns English name for en locale', () => {
    assert.equal(categoryDisplayName(perfume, 'en'), 'Fragrances');
  });

  it('title-cases a lowercase English name returned by the API', () => {
    assert.equal(
      categoryDisplayName(
        node({ slug: 'skin-care', name: 'العناية بالبشرة', nameEn: 'skin care' }),
        'en'
      ),
      'Skin Care'
    );
  });

  it('derives English from the key when nameEn is missing', () => {
    assert.equal(
      categoryDisplayName(node({ slug: 'baby--diapers', name: 'حفاضات', externalKey: 'baby/diapers' }), 'en'),
      'Diapers'
    );
  });

  it('uses Other for the catch-all slug', () => {
    assert.equal(categoryDisplayName(node({ slug: 'other', name: 'أخرى' }), 'en'), 'Other');
  });

  it('title-cases lowercase English names from the API', () => {
    assert.equal(
      categoryDisplayName(node({ slug: 'skin-care', name: 'skin care', externalKey: 'skin-care' }), 'en'),
      'Skin Care'
    );
  });

  it("title-cases women's segments", () => {
    assert.equal(
      categoryDisplayName(
        node({ slug: 'womens-perfumes', name: 'عطور نسائية', externalKey: 'fragrances/womens-perfumes' }),
        'en'
      ),
      "Women's Perfumes"
    );
  });
});

describe('categoryIconName', () => {
  it('maps fragrance categories to sparkles', () => {
    assert.equal(
      categoryIconName(node({ slug: 'fragrances', name: 'العطور', externalKey: 'fragrances' })),
      'sparkles'
    );
  });

  it('maps baby categories to baby', () => {
    assert.equal(
      categoryIconName(node({ slug: 'baby', name: 'العناية بالأطفال', externalKey: 'baby' })),
      'baby'
    );
  });

  it('maps skin care to droplets', () => {
    assert.equal(
      categoryIconName(node({ slug: 'skincare', name: 'العناية بالبشرة', externalKey: 'skincare' })),
      'droplets'
    );
  });

  it('falls back to tag for unknown categories', () => {
    assert.equal(categoryIconName(node({ slug: 'misc-xyz', name: 'misc-xyz' })), 'tag');
  });
});

describe('filterCategoryTree', () => {
  const tree = [
    node({
      slug: 'fragrances',
      name: 'العطور',
      nameEn: 'Fragrances',
      children: [
        node({
          slug: 'womens-perfumes',
          name: 'عطور نسائية',
          nameEn: "Women's Perfumes"
        })
      ]
    }),
    node({
      slug: 'vitamins',
      name: 'الفيتامينات',
      nameEn: 'Vitamins'
    })
  ];

  it('keeps a parent when an English child name matches', () => {
    const filtered = filterCategoryTree(tree, "women's");
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].slug, 'fragrances');
    assert.equal(filtered[0].children?.length, 1);
  });
});
