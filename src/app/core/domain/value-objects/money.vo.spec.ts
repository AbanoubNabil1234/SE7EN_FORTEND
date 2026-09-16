import { describe, it, expect } from 'vitest';
import { Money } from './money.vo';
import { Result } from '../types/result.type';

describe('Domain: Value Objects & Types', () => {
  it('should format money properly', () => {
    const money = new Money(150.5, 'EGP');
    expect(money.format()).toBe('150.50 EGP');
  });

  it('should throw error for negative money', () => {
    expect(() => new Money(-10)).toThrow('Money amount cannot be negative');
  });

  it('should add money of same currency', () => {
    const m1 = new Money(100, 'EGP');
    const m2 = new Money(50, 'EGP');
    expect(m1.add(m2).amount).toBe(150);
  });

  it('should handle Result ok and fail correctly', () => {
    const okRes = Result.ok({ id: '1' });
    expect(okRes.success).toBe(true);
    if (okRes.success) {
      expect(okRes.data.id).toBe('1');
    }

    const failRes = Result.fail(new Error('Network error'));
    expect(failRes.success).toBe(false);
    if (!failRes.success) {
      expect(failRes.error.message).toBe('Network error');
    }
  });
});
