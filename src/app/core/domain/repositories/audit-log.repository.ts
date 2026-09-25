import { Observable } from 'rxjs';
import {
  AuditLogDetail,
  AuditLogFilterOptions,
  AuditLogPagedResult,
  AuditLogQuery
} from '../models/audit-log.model';

export abstract class AuditLogRepository {
  abstract query(query: AuditLogQuery): Observable<AuditLogPagedResult>;
  abstract getById(id: string): Observable<AuditLogDetail>;
  abstract getFilterOptions(): Observable<AuditLogFilterOptions>;
}
