// @ts-nocheck
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { of, throwError, defer } from 'rxjs';
import { messagesAr, messagesEn } from '../../core/i18n/messages.ts';
import { isAdminRole } from './catalog-moderation.ts';
import { normalizeHiddenFlag } from '../../core/domain/models/catalog-family.model.ts';

const require = createRequire(import.meta.url);

function load(file, dependencies) {
  const source = readFileSync(new URL(file, import.meta.url), 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      experimentalDecorators: true
    }
  }).outputText;
  const exports = {};
  runInNewContext(output, { exports, require: (name) => dependencies[name] ?? require(name) });
  return exports;
}

const modalTemplate = readFileSync(
  new URL('./components/quick-add-product-modal/quick-add-product-modal.component.html', import.meta.url),
  'utf8'
);
const modalComponent = readFileSync(
  new URL('./components/quick-add-product-modal/quick-add-product-modal.component.ts', import.meta.url),
  'utf8'
);

describe('isolated product restore translations (messages.ts)', () => {
  const expectedKeys = [
    'isolated',
    'catalog',
    'andLink',
    'familyWarning',
    'confirmCatalog',
    'confirmLink',
    'success',
    'linkSuccess',
    'failed',
    'hiddenTarget'
  ];

  it('defines all quickAdd.restore keys in both Arabic and English without duplicates', () => {
    const arQuickAdd = messagesAr.quickAdd as Record<string, unknown>;
    const enQuickAdd = messagesEn.quickAdd as Record<string, unknown>;
    assert.ok(arQuickAdd, 'messagesAr.quickAdd is required');
    assert.ok(enQuickAdd, 'messagesEn.quickAdd is required');

    const arRestore = arQuickAdd['restore'] as Record<string, string>;
    const enRestore = enQuickAdd['restore'] as Record<string, string>;
    assert.ok(arRestore, 'messagesAr.quickAdd.restore is required');
    assert.ok(enRestore, 'messagesEn.quickAdd.restore is required');

    for (const key of expectedKeys) {
      assert.ok(key in arRestore, `missing Arabic key: quickAdd.restore.${key}`);
      assert.ok(key in enRestore, `missing English key: quickAdd.restore.${key}`);
      assert.ok(typeof arRestore[key] === 'string' && arRestore[key].length > 0);
      assert.ok(typeof enRestore[key] === 'string' && enRestore[key].length > 0);
    }
  });

  it('bilingual translations are distinct and non-empty', () => {
    const arRestore = (messagesAr.quickAdd as Record<string, unknown>)['restore'] as Record<string, string>;
    const enRestore = (messagesEn.quickAdd as Record<string, unknown>)['restore'] as Record<string, string>;
    assert.notEqual(arRestore['catalog'], enRestore['catalog']);
    assert.notEqual(arRestore['andLink'], enRestore['andLink']);
    assert.notEqual(arRestore['familyWarning'], enRestore['familyWarning']);
  });
});

describe('quick-add modal template wiring', () => {
  it('exposes the isolated badge for effectively hidden products', () => {
    assert.ok(modalTemplate.includes('hit.isEffectivelyHidden'));
    assert.ok(modalTemplate.includes('quickAdd.restore.isolated'));
  });

  it('exposes the family warning when hit.masterIsHidden is true', () => {
    assert.ok(modalTemplate.includes('hit.masterIsHidden'));
    assert.ok(modalTemplate.includes('quickAdd.restore.familyWarning'));
  });

  it('wires both restore buttons behind canModerateCatalog', () => {
    assert.ok(modalTemplate.includes('canModerateCatalog()'));
    assert.ok(modalTemplate.includes('restoreHitOnly(hit)'));
    assert.ok(modalTemplate.includes('restoreAndLinkHit(hit)'));
    assert.ok(modalTemplate.includes('quickAdd.restore.catalog'));
    assert.ok(modalTemplate.includes('quickAdd.restore.andLink'));
  });

  it('disables buttons when isBusy is true across all rows', () => {
    assert.ok(modalTemplate.includes('[disabled]="isBusy()"'));
  });
});

describe('quick-add modal component methods', () => {
  it('declares productRestored output, restoringId, isConfirming and isBusy signals', () => {
    assert.ok(modalComponent.includes('readonly productRestored = output<CatalogProductRestoreResult>()'));
    assert.ok(modalComponent.includes('readonly restoringId = signal<string | null>(null)'));
    assert.ok(modalComponent.includes('readonly isConfirming = signal<boolean>(false)'));
    assert.ok(modalComponent.includes('readonly isBusy = computed('));
  });

  it('implements restoreHitOnly and restoreAndLinkHit', () => {
    assert.ok(modalComponent.includes('async restoreHitOnly(hit: PharmacyProductSearchHit)'));
    assert.ok(modalComponent.includes('async restoreAndLinkHit(hit: PharmacyProductSearchHit)'));
  });

  it('gates both restore actions on canModerateCatalog and isBusy', () => {
    assert.ok(modalComponent.includes('if (!this.canModerateCatalog() || this.isBusy()) return;'));
  });
});

describe('HttpCatalogBrowseRepository.restoreProduct', () => {
  class FakeParams {
    constructor() { this.map = new Map(); }
    set(key, value) { this.map.set(key, String(value)); return this; }
  }

  it('sends POST to restore endpoint with real backend JSON contract and clears caches on success', async () => {
    const posts = [];
    let cachesCleared = false;

    // Real serialized backend JSON shapes (from C# CatalogProductRestoreResult)
    const http = {
      post: (url, body) => defer(() => {
        posts.push({ url, body });
        if (body?.targetGroupCode) {
          return of({
            pharmacyProductId: 'prod-123',
            previousMasterProductId: '00000000-0000-0000-0000-000000000001',
            masterProductId: '00000000-0000-0000-0000-000000000002',
            groupCode: body.targetGroupCode,
            detachedFromHiddenFamily: true,
            linked: true,
            isHidden: false,
            restoredAtUtc: '2026-10-23T06:00:00.0000000+00:00'
          });
        }
        return of({
          pharmacyProductId: 'prod-123',
          previousMasterProductId: '00000000-0000-0000-0000-000000000001',
          masterProductId: '00000000-0000-0000-0000-000000000003',
          groupCode: null,
          detachedFromHiddenFamily: true,
          linked: false,
          isHidden: false,
          restoredAtUtc: '2026-10-23T06:00:00.0000000+00:00'
        });
      })
    };

    const { HttpCatalogBrowseRepository } = load(
      '../../core/infrastructure/repositories/http-catalog-browse.repository.ts',
      {
        '@angular/core': { Injectable: () => (type) => type, inject: () => http },
        '@angular/common/http': { HttpClient: 'http', HttpParams: FakeParams },
        '../../domain/repositories/catalog-browse.repository': { CatalogBrowseRepository: class {} },
        '../../domain/models/category.model': { CategoryNode: class {} },
        '../../domain/category-display': { categoryEnglishName: (x) => x },
        '../../domain/models/catalog-family.model': {
          normalizeHiddenFlag,
          CatalogFamily: class {}, CatalogFamilyPage: class {}, CatalogModerationResult: class {},
          CatalogOffer: class {}, CatalogPack: class {}, CatalogProductRestoreResult: class {},
          FamilyAiSuggestion: class {}, GroupCodeLinkResult: class {}, GroupCodeMergeResult: class {},
          PharmacyProductSearchHit: class {}, ProductImagesResponse: class {}
        },
        '../http/api-endpoints.constants': {
          API_ENDPOINTS: {
            ADMIN_CATALOG_MODERATION_PRODUCT_RESTORE: (id) => `/api/v1/admin/catalog-moderation/products/${id}/restore`
          }
        },
        '../http/api-origin': { resolveApiUrl: (x) => x },
        '../http/ttl-cache': { TtlCache: class { clear() { cachesCleared = true; } } },
        '../http/category-image': { compressCategoryImage: (x) => Promise.resolve(x) }
      }
    );

    const repo = new HttpCatalogBrowseRepository();

    // 1. Restore-only (no target code) - detach from hidden family
    const resultOnly = await new Promise((resolve) => {
      repo.restoreProduct('prod-123', null).subscribe(resolve);
    });

    assert.equal(posts.length, 1);
    assert.equal(posts[0].url, '/api/v1/admin/catalog-moderation/products/prod-123/restore');
    assert.equal(JSON.stringify(posts[0].body), '{}');
    assert.equal(resultOnly.pharmacyProductId, 'prod-123');
    assert.equal(resultOnly.previousMasterProductId, '00000000-0000-0000-0000-000000000001');
    assert.equal(resultOnly.masterProductId, '00000000-0000-0000-0000-000000000003');
    assert.equal(resultOnly.groupCode, null);
    assert.equal(resultOnly.detachedFromHiddenFamily, true);
    assert.equal(resultOnly.linked, false);
    assert.equal(resultOnly.isHidden, false);
    assert.equal(cachesCleared, true);

    // 2. Restore and link (with target code)
    const resultLinked = await new Promise((resolve) => {
      repo.restoreProduct('prod-123', 'G-DEST99').subscribe(resolve);
    });

    assert.equal(posts.length, 2);
    assert.equal(posts[1].url, '/api/v1/admin/catalog-moderation/products/prod-123/restore');
    assert.equal(posts[1].body.targetGroupCode, 'G-DEST99');
    assert.equal(resultLinked.groupCode, 'G-DEST99');
    assert.equal(resultLinked.masterProductId, '00000000-0000-0000-0000-000000000002');
    assert.equal(resultLinked.linked, true);
    assert.equal(resultLinked.isHidden, false);
  });

  it('normalizes moderation flags in searchPharmacyProducts', async () => {
    const rawList = [
      {
        id: 'hit-1',
        name: 'Product 1',
        pharmacyCode: 'nahdi',
        pharmacyName: 'Nahdi',
        isHidden: true,
        masterIsHidden: true,
        isEffectivelyHidden: true
      },
      {
        id: 'hit-2',
        name: 'Product 2',
        pharmacyCode: 'al-dawaa',
        pharmacyName: 'Al-Dawaa',
        isHidden: false,
        masterIsHidden: false,
        isEffectivelyHidden: false
      }
    ];

    const http = {
      get: () => of(rawList)
    };

    const { HttpCatalogBrowseRepository } = load(
      '../../core/infrastructure/repositories/http-catalog-browse.repository.ts',
      {
        '@angular/core': { Injectable: () => (type) => type, inject: () => http },
        '@angular/common/http': { HttpClient: 'http', HttpParams: FakeParams },
        '../../domain/repositories/catalog-browse.repository': { CatalogBrowseRepository: class {} },
        '../../domain/models/category.model': { CategoryNode: class {} },
        '../../domain/category-display': { categoryEnglishName: (x) => x },
        '../../domain/models/catalog-family.model': {
          normalizeHiddenFlag,
          CatalogFamily: class {}, CatalogFamilyPage: class {}, CatalogModerationResult: class {},
          CatalogOffer: class {}, CatalogPack: class {}, CatalogProductRestoreResult: class {},
          FamilyAiSuggestion: class {}, GroupCodeLinkResult: class {}, GroupCodeMergeResult: class {},
          PharmacyProductSearchHit: class {}, ProductImagesResponse: class {}
        },
        '../http/api-endpoints.constants': {
          API_ENDPOINTS: {
            ADMIN_PHARMACY_PRODUCT_SEARCH: '/admin/pharmacy-products/search'
          }
        },
        '../http/api-origin': { resolveApiUrl: (x) => x },
        '../http/ttl-cache': { TtlCache: class { clear() {} } },
        '../http/category-image': { compressCategoryImage: (x) => Promise.resolve(x) }
      }
    );

    const repo = new HttpCatalogBrowseRepository();
    const hits = await new Promise((resolve) => {
      repo.searchPharmacyProducts('panadol').subscribe(resolve);
    });

    assert.equal(hits.length, 2);
    assert.equal(hits[0].isHidden, true);
    assert.equal(hits[0].masterIsHidden, true);
    assert.equal(hits[0].isEffectivelyHidden, true);
    assert.equal(hits[1].isHidden, false);
    assert.equal(hits[1].masterIsHidden, false);
    assert.equal(hits[1].isEffectivelyHidden, false);
  });
});
