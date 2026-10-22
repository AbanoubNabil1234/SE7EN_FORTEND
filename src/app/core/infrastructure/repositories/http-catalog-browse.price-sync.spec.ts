// @ts-nocheck
import { it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { of, throwError, defer, tap } from 'rxjs';

const require = createRequire(import.meta.url);
function load(file, dependencies) {
  const source = readFileSync(new URL(file, import.meta.url), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true
  }}).outputText;
  const exports = {};
  runInNewContext(output, { exports, require: (name) => dependencies[name] ?? require(name) });
  return exports;
}

class FakeParams {
  constructor() { this.map = new Map(); }
  set(key, value) { this.map.set(key, String(value)); return this; }
}

class FakeTtlCache {
  constructor(_key, _staleMs) { this.entry = null; }
  staleWhileRevalidate(freshMs, request$) {
    if (this.entry && Date.now() - this.entry.at < freshMs) return of(this.entry.value);
    return request$.pipe(tap((value) => { this.entry = { value, at: Date.now() }; }));
  }
  clear() { this.entry = null; }
}

function setup(postResponse) {
  const gets = [];
  const posts = [];
  const requests = [];
  // Angular HttpClient methods are cold: the request fires on subscription, so the
  // counters must also tick on subscription (defer), not on call.
  const http = {
    get: (_url, _opts) => defer(() => { gets.push(_url); requests.push({url: _url, params: _opts?.params?.map}); return of({ data: [], page: 1, pageSize: 24, total: 0 }); }),
    post: (_url, _body) => defer(() => { posts.push({ url: _url, body: _body }); return postResponse(); })
  };
  const { HttpCatalogBrowseRepository } = load('./http-catalog-browse.repository.ts', {
    '@angular/core': { Injectable: () => (type) => type, inject: () => http },
    '@angular/common/http': { HttpClient: 'http', HttpParams: FakeParams },
    '../../domain/repositories/catalog-browse.repository': { CatalogBrowseRepository: class {} },
    '../../domain/models/category.model': { CategoryNode: class {} },
    '../../domain/category-display': { categoryEnglishName: (x) => x },
    '../../domain/models/catalog-family.model': {
      normalizeHiddenFlag: () => false,
      CatalogFamily: class {}, CatalogFamilyPage: class {}, CatalogModerationResult: class {},
      CatalogOffer: class {}, CatalogPack: class {}, FamilyAiSuggestion: class {},
      GroupCodeLinkResult: class {}, GroupCodeMergeResult: class {},
      PharmacyProductSearchHit: class {}, ProductImagesResponse: class {}
    },
    '../http/api-endpoints.constants': {
      API_ENDPOINTS: {
        CATALOG_FAMILIES: '/catalog/families',
        CATALOG_FAMILIES_PHARMACY_COUNTS: '/catalog/families/pharmacy-counts',
        ADMIN_MASTER_PRICE_SYNC: (id) => `/admin/masters/${id}/price-sync`
      }
    },
    '../http/api-origin': { resolveApiUrl: () => '' },
    '../http/ttl-cache': { TtlCache: FakeTtlCache },
    '../http/category-image': { compressCategoryImage: async (x) => x }
  });
  return { repo: new HttpCatalogBrowseRepository(), gets, posts, requests };
}

it('setPriceSyncEnabled posts the toggled value and invalidates warmed catalog caches', () => {
  const { repo, gets, posts } = setup(() => of({ id: 'm1', enabled: false }));

  // Warm the default-page cache, then prove a second read is served from it.
  repo.listFamilies({}).subscribe(() => {});
  repo.listFamilies({}).subscribe(() => {});
  assert.equal(gets.length, 2 - 1); // 1 network GET, second read came from cache

  let result;
  repo.setPriceSyncEnabled('m1', false).subscribe((value) => { result = value; });
  assert.equal(posts.length, 1);
  // The body crosses a vm sandbox realm: compare primitives, not prototypes.
  assert.equal(posts[0].body.enabled, false);
  assert.equal(result.enabled, false);

  // The saved change must reach the next read: the warmed cache was invalidated.
  repo.listFamilies({}).subscribe(() => {});
  assert.equal(gets.length, 2);
});

it('setPriceSyncEnabled rejects a malformed response instead of fabricating success', () => {
  const { repo, gets, posts } = setup(() => of({ id: 'm1' }));

  repo.listFamilies({}).subscribe(() => {});
  let failed = false;
  repo.setPriceSyncEnabled('m1', true).subscribe({
    next: () => assert.fail('must not emit success'),
    error: () => { failed = true; }
  });

  assert.equal(posts.length, 1);
  assert.ok(failed, 'missing enabled field must surface as an error');
  // A failed request never invalidates caches: the UI keeps the previous state.
  repo.listFamilies({}).subscribe(() => {});
  assert.equal(gets.length, 1);
});

it('setPriceSyncEnabled surfaces HTTP failures as errors', () => {
  const { repo } = setup(() => throwError(() => new Error('403')));
  let failed = false;
  repo.setPriceSyncEnabled('m1', false).subscribe({
    next: () => assert.fail('must not emit success'),
    error: () => { failed = true; }
  });
  assert.ok(failed);
});


it('keeps normal and isolated list and distribution requests out of each other caches', () => {
  const { repo, requests } = setup(() => of({}));
  repo.listFamilies({}).subscribe(() => {});
  repo.listFamilies({ hiddenOnly: true }).subscribe(() => {});
  repo.getPharmacyDistributionCounts(undefined, false).subscribe(() => {});
  repo.getPharmacyDistributionCounts(undefined, true).subscribe(() => {});
  assert.equal(requests.length, 4);
  assert.equal(requests[0].params.get('hiddenOnly'), 'false');
  assert.equal(requests[1].params.get('hiddenOnly'), 'true');
  assert.equal(requests[2].params.get('hiddenOnly'), 'false');
  assert.equal(requests[3].params.get('hiddenOnly'), 'true');
});
