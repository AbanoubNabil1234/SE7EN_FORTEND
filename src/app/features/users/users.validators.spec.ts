import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getPasswordRequirements,
  hasMeaningfulText,
  isPhoneNumberValid
} from './users.validators.ts';
import { messagesAr, messagesEn } from '../../core/i18n/messages.ts';

describe('user creation validators', () => {
  it('keeps user-management translations synchronized', () => {
    assert.deepEqual(Object.keys(messagesAr.users).sort(), Object.keys(messagesEn.users).sort());
  });

  it('rejects whitespace-only names', () => {
    assert.equal(hasMeaningfulText('   '), false);
    assert.equal(hasMeaningfulText('مريم'), true);
  });

  it('reports every missing server password requirement', () => {
    assert.deepEqual(getPasswordRequirements('ABC'), {
      minLength: false,
      digit: false,
      lowercase: false
    });
    assert.deepEqual(getPasswordRequirements('secure1'), {
      minLength: true,
      digit: true,
      lowercase: true
    });
  });

  it('allows an empty optional phone and validates a supplied number', () => {
    assert.equal(isPhoneNumberValid(''), true);
    assert.equal(isPhoneNumberValid('+966 50 123 4567'), true);
    assert.equal(isPhoneNumberValid('abc'), false);
  });
});
