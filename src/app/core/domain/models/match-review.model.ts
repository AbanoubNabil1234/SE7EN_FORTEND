export interface MatchReviewQueueItem {
  matchId: string;
  pharmacyProductId: string;
  proposedMasterProductId: string | null;
  pharmacyCode: string;
  pharmacyName: string;
  name: string;
  englishName: string;
  imageUrl: string;
  barcode: string;
  matchMethod: string;
  decisionReason: string;
  confidence: number;
  bestScore: number | null;
  margin: number | null;
  matchedAtUtc: string;
  isCurrent: boolean;
}

export interface MatchReviewPage {
  items: MatchReviewQueueItem[];
  nextCursor: string | null;
  queueDepth: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
}

export interface MatchReviewListingCard {
  pharmacyProductId: string;
  pharmacyCode: string;
  pharmacyName: string;
  name: string;
  englishName: string;
  brandName: string;
  imageUrl: string;
  barcode: string;
  gtinNorm: string;
  strength: string;
  dosageForm: string;
  packSize: string;
  price: number | null;
  masterProductId: string | null;
}

export interface MatchReviewDetail {
  queueItem: MatchReviewQueueItem;
  listing: MatchReviewListingCard;
  candidate: MatchReviewListingCard | null;
  groupMembers: MatchReviewListingCard[];
  candidateSnapshotJson: string;
}

export interface MatchReviewActionResult {
  matchId: string;
  ok: boolean;
  code: string;
  message: string;
  newMatchId: string | null;
}

export interface MatchReviewQuery {
  cursor?: string | null;
  take?: number;
  page?: number | null;
  pharmacyId?: string | null;
  method?: string | null;
  minScore?: number | null;
  maxScore?: number | null;
  reason?: string | null;
  minAgeHours?: number | null;
  pharmacyCode?: string | null;
  search?: string | null;
}

export function distinctPharmacyCount(members: MatchReviewListingCard[]): number {
  return new Set(members.map((m) => m.pharmacyCode.trim().toLowerCase()).filter(Boolean)).size;
}

export function canAccept(item: MatchReviewQueueItem | null | undefined): boolean {
  return Boolean(item?.isCurrent && item.proposedMasterProductId);
}
