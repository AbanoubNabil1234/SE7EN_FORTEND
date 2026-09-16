import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { firstValueFrom, of } from 'rxjs';
import { TtlCache } from './ttl-cache.ts';

class MemoryStorage {
  private readonly map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
}

describe('TtlCache', () => {
  it('returns a fresh value without refreshing', async () => {
    const storage = new MemoryStorage();
    const cache = new TtlCache<string>('k', 60_000, storage);
    cache.write('cached');

    const value = await firstValueFrom(cache.staleWhileRevalidate(45_000, of('fresh')));
    assert.equal(value, 'cached');
  });

  it('emits stale then refreshed value after the fresh window', async () => {
    const storage = new MemoryStorage();
    const cache = new TtlCache<string>('k', 60_000, storage);
    storage.setItem('k', JSON.stringify({ at: Date.now() - 50_000, value: 'stale' }));

    const seen: string[] = [];
    await new Promise<void>((resolve, reject) => {
      cache.staleWhileRevalidate(45_000, of('fresh')).subscribe({
        next: (value) => seen.push(value),
        error: reject,
        complete: resolve
      });
    });

    assert.deepEqual(seen, ['stale', 'fresh']);
    assert.equal(cache.readFresh(45_000), 'fresh');
  });

  it('clear drops a cached value', () => {
    const storage = new MemoryStorage();
    const cache = new TtlCache<string>('k', 60_000, storage);
    cache.write('cached');
    cache.clear();
    assert.equal(cache.readFresh(45_000), null);
  });
});
