import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CatalogReloadScheduler } from './catalog-reload-scheduler.ts';

describe('CatalogReloadScheduler', () => {
  it('coalesces rapid filter updates into one reload while preserving a distribution refresh', async () => {
    const calls: boolean[] = [];
    const scheduler = new CatalogReloadScheduler((refreshDistribution) => calls.push(refreshDistribution), 20);

    scheduler.schedule(false);
    scheduler.schedule(true);
    scheduler.schedule(false);

    await new Promise((resolve) => setTimeout(resolve, 40));

    assert.deepEqual(calls, [true]);
  });
});
