import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuditLogRepository } from '../../domain/repositories/audit-log.repository';
import {
  AuditLogDetail,
  AuditLogFilterOptions,
  AuditLogPagedResult,
  AuditLogQuery
} from '../../domain/models/audit-log.model';

@Injectable({ providedIn: 'root' })
export class HttpAuditLogRepository implements AuditLogRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/admin/audit-logs';

  query(q: AuditLogQuery): Observable<AuditLogPagedResult> {
    let params = new HttpParams()
      .set('page', q.page.toString())
      .set('pageSize', q.pageSize.toString());

    if (q.search?.trim()) params = params.set('search', q.search.trim());
    if (q.category?.trim()) params = params.set('category', q.category.trim());
    if (q.action?.trim()) params = params.set('action', q.action.trim());
    if (q.userId?.trim()) params = params.set('userId', q.userId.trim());
    if (q.fromDateUtc) params = params.set('fromDateUtc', q.fromDateUtc);
    if (q.toDateUtc) params = params.set('toDateUtc', q.toDateUtc);

    return this.http.get<AuditLogPagedResult>(this.baseUrl, { params });
  }

  getById(id: string): Observable<AuditLogDetail> {
    return this.http.get<AuditLogDetail>(`${this.baseUrl}/${id}`);
  }

  getFilterOptions(): Observable<AuditLogFilterOptions> {
    return this.http.get<AuditLogFilterOptions>(`${this.baseUrl}/filter-options`);
  }
}
