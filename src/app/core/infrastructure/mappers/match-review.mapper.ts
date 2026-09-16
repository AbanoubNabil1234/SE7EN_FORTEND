import type { MatchReviewActionResult, MatchReviewDetail, MatchReviewListingCard, MatchReviewPage, MatchReviewQueueItem } from '../../domain/models/match-review.model.ts';

function text(raw: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = raw[key];
    if (value != null && String(value).trim()) return String(value);
  }
  return '';
}

function num(raw: Record<string, unknown>, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = raw[key];
    if (value == null || value === '') continue;
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function guid(raw: Record<string, unknown>, ...keys: string[]): string | null {
  const value = text(raw, ...keys);
  return value ? value : null;
}

export function mapQueueItem(raw: unknown): MatchReviewQueueItem {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    matchId: text(r, 'matchId', 'MatchId'),
    pharmacyProductId: text(r, 'pharmacyProductId', 'PharmacyProductId'),
    proposedMasterProductId: guid(r, 'proposedMasterProductId', 'ProposedMasterProductId'),
    pharmacyCode: text(r, 'pharmacyCode', 'PharmacyCode'),
    pharmacyName: text(r, 'pharmacyName', 'PharmacyName'),
    name: text(r, 'name', 'Name'),
    englishName: text(r, 'englishName', 'EnglishName'),
    imageUrl: text(r, 'imageUrl', 'ImageUrl'),
    barcode: text(r, 'barcode', 'Barcode'),
    matchMethod: text(r, 'matchMethod', 'MatchMethod'),
    decisionReason: text(r, 'decisionReason', 'DecisionReason'),
    confidence: num(r, 'confidence', 'Confidence') ?? 0,
    bestScore: num(r, 'bestScore', 'BestScore'),
    margin: num(r, 'margin', 'Margin'),
    matchedAtUtc: text(r, 'matchedAtUtc', 'MatchedAtUtc'),
    isCurrent: Boolean(r['isCurrent'] ?? r['IsCurrent'] ?? true)
  };
}

export function mapListingCard(raw: unknown): MatchReviewListingCard {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    pharmacyProductId: text(r, 'pharmacyProductId', 'PharmacyProductId'),
    pharmacyCode: text(r, 'pharmacyCode', 'PharmacyCode'),
    pharmacyName: text(r, 'pharmacyName', 'PharmacyName'),
    name: text(r, 'name', 'Name'),
    englishName: text(r, 'englishName', 'EnglishName'),
    brandName: text(r, 'brandName', 'BrandName'),
    imageUrl: text(r, 'imageUrl', 'ImageUrl'),
    barcode: text(r, 'barcode', 'Barcode'),
    gtinNorm: text(r, 'gtinNorm', 'GtinNorm'),
    strength: text(r, 'strength', 'Strength'),
    dosageForm: text(r, 'dosageForm', 'DosageForm'),
    packSize: text(r, 'packSize', 'PackSize'),
    price: num(r, 'price', 'Price'),
    masterProductId: guid(r, 'masterProductId', 'MasterProductId')
  };
}

export function mapPage(raw: unknown): MatchReviewPage {
  const r = (raw ?? {}) as Record<string, unknown>;
  const items = Array.isArray(r['items'] ?? r['Items'])
    ? ((r['items'] ?? r['Items']) as unknown[]).map(mapQueueItem)
    : [];
  return {
    items,
    nextCursor: text(r, 'nextCursor', 'NextCursor') || null,
    queueDepth: num(r, 'queueDepth', 'QueueDepth') ?? items.length
  };
}

export function mapDetail(raw: unknown): MatchReviewDetail {
  const r = (raw ?? {}) as Record<string, unknown>;
  const membersRaw = r['groupMembers'] ?? r['GroupMembers'];
  return {
    queueItem: mapQueueItem(r['queueItem'] ?? r['QueueItem'] ?? r),
    listing: mapListingCard(r['listing'] ?? r['Listing'] ?? {}),
    candidate: r['candidate'] || r['Candidate'] ? mapListingCard(r['candidate'] ?? r['Candidate']) : null,
    groupMembers: Array.isArray(membersRaw) ? membersRaw.map(mapListingCard) : [],
    candidateSnapshotJson: text(r, 'candidateSnapshotJson', 'CandidateSnapshotJson')
  };
}

export function mapAction(raw: unknown): MatchReviewActionResult {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    matchId: text(r, 'matchId', 'MatchId'),
    ok: Boolean(r['ok'] ?? r['Ok']),
    code: text(r, 'code', 'Code'),
    message: text(r, 'message', 'Message'),
    newMatchId: guid(r, 'newMatchId', 'NewMatchId')
  };
}
