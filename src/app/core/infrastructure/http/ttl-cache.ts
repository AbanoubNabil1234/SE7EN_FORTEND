import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

interface CacheEnvelope<T> {
  at: number;
  value: T;
}

export class TtlCache<T> {
  private readonly storageKey: string;
  private readonly ttlMs: number;
  private readonly storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

  constructor(
    storageKey: string,
    ttlMs: number,
    storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
  ) {
    this.storageKey = storageKey;
    this.ttlMs = ttlMs;
    this.storage = storage ?? sessionStorage;
  }

  read(): { value: T; ageMs: number } | null {
    try {
      const raw = this.storage.getItem(this.storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as CacheEnvelope<T>;
      if (!parsed || parsed.value == null || typeof parsed.at !== 'number') return null;
      const ageMs = Date.now() - parsed.at;
      if (ageMs < 0 || ageMs > this.ttlMs) return null;
      return { value: parsed.value, ageMs };
    } catch {
      return null;
    }
  }

  write(value: T): void {
    try {
      const envelope: CacheEnvelope<T> = { at: Date.now(), value };
      this.storage.setItem(this.storageKey, JSON.stringify(envelope));
    } catch {
      // quota / private mode
    }
  }

  clear(): void {
    try {
      this.storage.removeItem(this.storageKey);
    } catch {
      // quota / private mode
    }
  }

  readFresh(freshMs: number): T | null {
    const hit = this.read();
    if (!hit || hit.ageMs > freshMs) return null;
    return hit.value;
  }

  staleWhileRevalidate(freshMs: number, refresh: Observable<T>): Observable<T> {
    const hit = this.read();
    const refresh$ = refresh.pipe(tap((value) => this.write(value)));
    if (!hit) return refresh$;
    if (hit.ageMs <= freshMs) return of(hit.value);
    return new Observable<T>((subscriber) => {
      subscriber.next(hit.value);
      const sub = refresh$.subscribe(subscriber);
      return () => sub.unsubscribe();
    });
  }
}
