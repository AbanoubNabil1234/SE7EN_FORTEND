import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = readFileSync(new URL('./products-admin.component.ts', import.meta.url), 'utf8');
const parsed = ts.createSourceFile('component.ts', source, ts.ScriptTarget.Latest, true);
const component = parsed.statements.find((n: any) => ts.isClassDeclaration(n) && n.name?.text === 'ProductsAdminComponent');
function makeComponent() {
  const methods = component.members.filter((n: any) => ts.isMethodDeclaration(n)
    && ['setHiddenOnly', 'resetFilters'].includes(n.name.getText(parsed))).map((n: any) => n.getText(parsed)).join('\n');
  const exported: any = {};
  runInNewContext(ts.transpileModule('export class TestComponent {' + methods + '}',
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: exported });
  const instance = new exported.TestComponent();
  const signal = (initial: any) => { let value = initial; return Object.assign(() => value, { set: (v: any) => value = v }); };
  for (const [key, value] of Object.entries({ hiddenOnly: false, pharmacyCount: 4, query: 'test', brand: 'brand',
    primaryCategorySlug: 'skin', subcategorySlug: 'cream', categorySlug: 'cream', sort: 'nameDesc',
    families: [{}], total: 1, pharmacyDistribution: { 4: 1 }, distributionTotal: 1 })) instance[key] = signal(value);
  instance.cacheClears = 0;
  instance.catalog = { clearCache: () => instance.cacheClears++ };
  instance.reloads = [];
  instance.scheduleReload = (distribution: boolean) => instance.reloads.push(distribution);
  return instance;
}
describe('products admin filter usability', () => {
  it('changing scope clears pharmacy coverage while preserving search and brand', () => {
    const c = makeComponent(); c.setHiddenOnly(true);
    assert.equal(c.hiddenOnly(), true); assert.equal(c.pharmacyCount(), null);
    assert.equal(c.query(), 'test'); assert.equal(c.brand(), 'brand');
    assert.equal(c.cacheClears, 1); assert.deepEqual(c.reloads, [true]);
    c.setHiddenOnly(true); assert.deepEqual(c.reloads, [true]);
  });
  it('clear filters resets the complete search once and preserves the catalog scope', () => {
    const c = makeComponent(); c.hiddenOnly.set(true); c.resetFilters();
    for (const key of ['query', 'brand', 'primaryCategorySlug', 'subcategorySlug', 'categorySlug']) assert.equal(c[key](), '');
    assert.equal(c.pharmacyCount(), null); assert.equal(c.sort(), 'pharmaciesDesc');
    assert.equal(c.hiddenOnly(), true); assert.deepEqual(c.reloads, [true]);
  });
});
