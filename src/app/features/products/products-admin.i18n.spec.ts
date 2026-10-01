import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { messagesAr, messagesEn } from '../../core/i18n/messages.ts';

const template = readFileSync(
  new URL('./products-admin.component.html', import.meta.url),
  'utf8'
);

describe('products admin translations', () => {
  it('defines every productsAdmin translation key used by the template in both languages', () => {
    const keys = [...template.matchAll(/productsAdmin\.([A-Za-z0-9_]+)/g)]
      .map((match) => match[1]);

    const missing = [...new Set(keys)].filter(
      (key) => !(key in messagesAr.productsAdmin) || !(key in messagesEn.productsAdmin)
    );

    assert.deepEqual(missing, [], 'productsAdmin contains translation keys missing from one or both languages');
  });
});
