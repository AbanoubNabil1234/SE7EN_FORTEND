import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DashboardRepository } from '../../domain/repositories/dashboard.repository';
import { OpsDashboardSnapshot } from '../../domain/models/dashboard.model';
import { API_ENDPOINTS } from '../http/api-endpoints.constants';
import { TtlCache } from '../http/ttl-cache';

const FRESH_MS = 3 * 60_000;
const STALE_MS = 30 * 60_000;

@Injectable({
  providedIn: 'root'
})
export class HttpDashboardRepository implements DashboardRepository {
  private readonly http = inject(HttpClient);
  private readonly cache = new TtlCache<OpsDashboardSnapshot>('se7en.admin.dashboard.v1', STALE_MS);

  getSnapshot(): Observable<OpsDashboardSnapshot> {
    return this.cache.staleWhileRevalidate(
      FRESH_MS,
      this.http.get<OpsDashboardSnapshot>(API_ENDPOINTS.ADMIN_DASHBOARD)
    );
  }
}
