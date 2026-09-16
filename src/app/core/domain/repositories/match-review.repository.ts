import { Observable } from 'rxjs';
import {
  MatchReviewActionResult,
  MatchReviewDetail,
  MatchReviewPage,
  MatchReviewQuery
} from '../models/match-review.model';

export abstract class MatchReviewRepository {
  abstract listQueue(query?: MatchReviewQuery): Observable<MatchReviewPage>;
  abstract getDetail(matchId: string): Observable<MatchReviewDetail>;
  abstract accept(matchId: string, masterProductId?: string | null, notes?: string): Observable<MatchReviewActionResult>;
  abstract reject(matchId: string, notes?: string): Observable<MatchReviewActionResult>;
  abstract forceMatch(matchId: string, masterProductId: string, notes?: string): Observable<MatchReviewActionResult>;
  abstract bulk(
    items: Array<{ matchId: string; action: 'accept' | 'reject'; masterProductId?: string | null }>
  ): Observable<MatchReviewActionResult[]>;
}
