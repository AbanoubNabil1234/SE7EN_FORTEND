import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mapAction, mapPage } from './match-review.mapper.ts';

describe('match-review mapper', () => {
  it('maps camelCase and PascalCase queue pages', () => {
    const page = mapPage({
      Items: [{ MatchId: 'abc', Name: 'Panadol', Confidence: 0.99, IsCurrent: true }],
      QueueDepth: 4,
      NextCursor: 'tick:id'
    });
    assert.equal(page.queueDepth, 4);
    assert.equal(page.nextCursor, 'tick:id');
    assert.equal(page.items[0].matchId, 'abc');
    assert.equal(page.items[0].confidence, 0.99);
  });

  it('maps action results', () => {
    const row = mapAction({ Ok: true, Code: 'accepted', MatchId: 'm1' });
    assert.equal(row.ok, true);
    assert.equal(row.code, 'accepted');
  });
});
