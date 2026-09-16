import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { compactLiveQuery } from './compact-live-query.ts';

describe('compactLiveQuery', () => {
  it('keeps a short brand query unchanged', () => {
    assert.equal(compactLiveQuery('bioderma'), 'bioderma');
    assert.equal(compactLiveQuery('بامبرز'), 'بامبرز');
  });

  it('turns a long listing title into brand plus pack count', () => {
    assert.equal(
      compactLiveQuery('بامبرز صندوق رقم (1) ضخم 136 قطعة'),
      'بامبرز 136'
    );
  });

  it('keeps an already compact brand+size query', () => {
    assert.equal(compactLiveQuery('pampers 116'), 'pampers 116');
  });
});
