import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { messagesAr, messagesEn } from '../../core/i18n/messages.ts';
import { isAdminRole } from './catalog-moderation.ts';
import { normalizeHiddenFlag } from '../../core/domain/models/catalog-family.model.ts';

const template = readFileSync(
  new URL('./products-admin.component.html', import.meta.url),
  'utf8'
);
const component = readFileSync(
  new URL('./products-admin.component.ts', import.meta.url),
  'utf8'
);

describe('catalog moderation role gating', () => {
  it('grants moderation only to the Admin role', () => {
    assert.equal(isAdminRole('Admin'), true);
    assert.equal(isAdminRole('ADMIN'), true);
    assert.equal(isAdminRole(' admin '), true);
  });

  it('denies staff with product permission, wildcard staff and logged-out users', () => {
    assert.equal(isAdminRole('Staff'), false);
    assert.equal(isAdminRole('Editor'), false);
    assert.equal(isAdminRole('Customer'), false);
    assert.equal(isAdminRole(''), false);
    assert.equal(isAdminRole(null), false);
    assert.equal(isAdminRole(undefined), false);
  });

  it('the component gate uses isAdminRole, not permission wildcards', () => {
    assert.match(component, /isAdminRole\(this\.permissionService\.currentRole\(\)\)/);
    assert.ok(!component.includes("hasPermission('*')"));
  });

  it('gates every moderation action in the template behind canModerateCatalog', () => {
    const occurrences = [...template.matchAll(/canModerateCatalog\(\)/g)].length;
    assert.ok(occurrences >= 2, 'moderation buttons must be role-gated in the template');
    for (const handler of ['toggleFamilyVisibility', 'deleteFamily', 'toggleOfferVisibility', 'deleteOffer']) {
      assert.ok(template.includes(`(click)=${handler}`.replace('(click)=', `(click)="`)) || template.includes(`${handler}(offer, family)`) || template.includes(`${handler}(family)`), `${handler} must be wired in the template`);
      const handlerDecl = component.indexOf(`async ${handler}`) >= 0 || component.indexOf(`${handler}(offer: CatalogOffer`) >= 0 || component.indexOf(`${handler}(family: CatalogFamily`) >= 0;
      assert.ok(handlerDecl, `${handler} must exist on the component`);
    }
  });
});

describe('catalog moderation flag normalization', () => {
  it('treats absent flags on older API payloads as visible', () => {
    assert.equal(normalizeHiddenFlag(undefined), false);
    assert.equal(normalizeHiddenFlag(null), false);
    assert.equal(normalizeHiddenFlag(false), false);
    assert.equal(normalizeHiddenFlag('true'), false);
  });

  it('treats an explicit true as hidden', () => {
    assert.equal(normalizeHiddenFlag(true), true);
  });
});

describe('productsAdmin.moderation translations', () => {
  const expectedKeys = [
    'hide',
    'show',
    'delete',
    'visible',
    'hidden',
    'hiddenByFamily',
    'hideFamilyConfirm',
    'hideProductConfirm',
    'deleteFamilyConfirm',
    'deleteProductConfirm',
    'affectedOffers',
    'updated',
    'deleted',
    'failed',
    'unavailable'
  ];

  it('defines every moderation key in both Arabic and English', () => {
    const ar = (messagesAr.productsAdmin as Record<string, unknown>)['moderation'] as Record<string, string> | undefined;
    const en = (messagesEn.productsAdmin as Record<string, unknown>)['moderation'] as Record<string, string> | undefined;
    assert.ok(ar, 'messagesAr.productsAdmin.moderation is required');
    assert.ok(en, 'messagesEn.productsAdmin.moderation is required');
    const missing = expectedKeys.filter((key) => !(key in ar!) || !(key in en!));
    assert.deepEqual(missing, [], 'moderation keys missing from one or both languages');
    for (const key of expectedKeys) {
      assert.equal(typeof ar![key], 'string');
      assert.equal(typeof en![key], 'string');
      assert.ok(ar![key].length > 0 && en![key].length > 0);
    }
  });

  it('keeps deletion copy distinct from hide copy in both languages', () => {
    const ar = (messagesAr.productsAdmin as Record<string, unknown>)['moderation'] as Record<string, string>;
    const en = (messagesEn.productsAdmin as Record<string, unknown>)['moderation'] as Record<string, string>;
    assert.notEqual(ar['deleteFamilyConfirm'], ar['hideFamilyConfirm']);
    assert.notEqual(en['deleteFamilyConfirm'], en['hideFamilyConfirm']);
  });
});
