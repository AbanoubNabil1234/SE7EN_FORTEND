/** Live pharmacy search matches short brand+size queries, not full listing titles. */
export function compactLiveQuery(query: string): string {
  const trimmed = query.trim();
  if (!trimmed) return trimmed;

  const tokens = trimmed.split(/\s+/).filter((token) => token && !/^[\-–—()[\]،,]+$/.test(token));
  const packCounts = tokens
    .map((token) => token.replace(/[^\d]/g, ''))
    .filter((digits) => digits.length >= 2);
  const head = tokens[0];

  if (head && packCounts.length > 0 && tokens.length > 3) {
    return `${head} ${packCounts[packCounts.length - 1]}`;
  }

  if (tokens.length > 5) {
    return tokens.slice(0, 2).join(' ');
  }

  return trimmed;
}
