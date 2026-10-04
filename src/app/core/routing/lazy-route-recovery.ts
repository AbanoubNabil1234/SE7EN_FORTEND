export function recoverLazyRoute(
  error: unknown,
  url: string,
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  location: Pick<Location, 'assign'>,
  now = Date.now()
): boolean {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error ?? '');
  const isChunkFailure = /ChunkLoadError|Loading chunk .+ failed|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Failed to load module script/i.test(message);
  if (!isChunkFailure || !url.startsWith('/') || url.startsWith('//')) return false;

  // Persist before leaving the document so a genuinely broken release cannot reload forever.
  const key = 'se7en.route-recovery.v1';
  try {
    const saved = storage.getItem(key);
    let previous: { url?: string; at?: number } | null = null;
    if (saved) {
      try { previous = JSON.parse(saved); } catch { /* Ignore a damaged marker. */ }
    }
    if (previous?.url === url && typeof previous.at === 'number' && now - previous.at < 60_000) {
      return false;
    }
    storage.setItem(key, JSON.stringify({ url, at: now }));
    location.assign(url);
    return true;
  } catch {
    return false;
  }
}
