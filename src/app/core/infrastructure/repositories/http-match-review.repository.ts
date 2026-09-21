import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { MatchReviewRepository } from '../../domain/repositories/match-review.repository';
import {
  MatchReviewActionResult,
  MatchReviewDetail,
  MatchReviewPage,
  MatchReviewQuery
} from '../../domain/models/match-review.model';
import { API_ENDPOINTS } from '../http/api-endpoints.constants';
import { mapAction, mapDetail, mapPage } from '../mappers/match-review.mapper';

@Injectable({ providedIn: 'root' })
export class HttpMatchReviewRepository extends MatchReviewRepository {
  private readonly http = inject(HttpClient);

  listQueue(query?: MatchReviewQuery): Observable<MatchReviewPage> {
    let params = new HttpParams();
    if (query?.cursor) params = params.set('cursor', query.cursor);
    if (query?.take) params = params.set('take', String(query.take));
    if (query?.pharmacyId) params = params.set('pharmacyId', query.pharmacyId);
    if (query?.pharmacyCode) params = params.set('pharmacyCode', query.pharmacyCode);
    if (query?.method) params = params.set('method', query.method);
    if (query?.minScore != null) params = params.set('minScore', String(query.minScore));
    if (query?.maxScore != null) params = params.set('maxScore', String(query.maxScore));
    if (query?.reason) params = params.set('reason', query.reason);
    if (query?.minAgeHours != null) params = params.set('minAgeHours', String(query.minAgeHours));
    if (query?.search) params = params.set('search', query.search);
    if (query?.page != null) params = params.set('page', String(query.page));
    return this.http.get<unknown>(API_ENDPOINTS.ADMIN_MATCH_REVIEWS, { params }).pipe(map(mapPage));
  }

  getDetail(matchId: string): Observable<MatchReviewDetail> {
    return this.http.get<unknown>(API_ENDPOINTS.ADMIN_MATCH_REVIEW(matchId)).pipe(map(mapDetail));
  }

  accept(matchId: string, masterProductId?: string | null, notes?: string): Observable<MatchReviewActionResult> {
    return this.http
      .post<unknown>(API_ENDPOINTS.ADMIN_MATCH_REVIEW_ACCEPT(matchId), {
        expectedIsCurrent: true,
        masterProductId,
        notes
      })
      .pipe(map(mapAction));
  }

  reject(matchId: string, notes?: string): Observable<MatchReviewActionResult> {
    return this.http
      .post<unknown>(API_ENDPOINTS.ADMIN_MATCH_REVIEW_REJECT(matchId), { expectedIsCurrent: true, notes })
      .pipe(map(mapAction));
  }

  forceMatch(matchId: string, masterProductId: string, notes?: string): Observable<MatchReviewActionResult> {
    return this.http
      .post<unknown>(API_ENDPOINTS.ADMIN_MATCH_REVIEW_FORCE(matchId), {
        expectedIsCurrent: true,
        masterProductId,
        notes
      })
      .pipe(map(mapAction));
  }

  bulk(
    items: Array<{ matchId: string; action: 'accept' | 'reject'; masterProductId?: string | null }>
  ): Observable<MatchReviewActionResult[]> {
    return this.http
      .post<unknown>(API_ENDPOINTS.ADMIN_MATCH_REVIEW_BULK, {
        items: items.map((item) => ({
          matchId: item.matchId,
          action: item.action,
          expectedIsCurrent: true,
          masterProductId: item.masterProductId
        }))
      })
      .pipe(map((raw) => (Array.isArray(raw) ? raw.map(mapAction) : [])));
  }
}
