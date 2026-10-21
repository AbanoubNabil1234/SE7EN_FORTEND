import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, switchMap } from 'rxjs';
import { DashboardRepository } from '../../domain/repositories/dashboard.repository';
import { OpsDashboardSnapshot } from '../../domain/models/dashboard.model';
import { API_ENDPOINTS } from '../http/api-endpoints.constants';
import { PriceRefreshRepository } from '../../domain/repositories/price-refresh.repository';
import { PriceRefreshRunRow } from '../../domain/models/price-refresh.model';
import { applyDashboardCycle, isDashboardCycle } from '../../domain/models/dashboard-cycle';
import { PermissionService } from '../../services/permission.service';

@Injectable({
  providedIn: 'root'
})
export class HttpDashboardRepository implements DashboardRepository {
  private readonly http = inject(HttpClient);
  private readonly refresh = inject(PriceRefreshRepository);
  private readonly permissions = inject(PermissionService);

  getSnapshot(): Observable<OpsDashboardSnapshot> {
    // Keep the server's catalog cache; read the latest cycle from its ledger.
    return this.http.get<OpsDashboardSnapshot>(API_ENDPOINTS.ADMIN_DASHBOARD).pipe(
      switchMap((snapshot) => this.withLatestCycle(snapshot))
    );
  }

  refreshSnapshot(): Observable<OpsDashboardSnapshot> {
    return this.http.post<OpsDashboardSnapshot>(`${API_ENDPOINTS.ADMIN_DASHBOARD}/refresh`, {}).pipe(
      switchMap((snapshot) => this.withLatestCycle(snapshot))
    );
  }

  private withLatestCycle(snapshot: OpsDashboardSnapshot): Observable<OpsDashboardSnapshot> {
    if (!this.permissions.hasPermission('products.view')) return of(snapshot);
    return this.latestCycle().pipe(
      map((run) => applyDashboardCycle(snapshot, run)),
      catchError(() => of(snapshot))
    );
  }

  private latestCycle(page = 1): Observable<PriceRefreshRunRow | null> {
    return this.refresh.getRuns({ page, pageSize: 10 }).pipe(
      switchMap((result) => {
        const latest = result.items.find(isDashboardCycle);
        if (latest) return of(latest);
        if (!result.items.length || page * result.pageSize >= result.totalCount) return of(null);
        return this.latestCycle(page + 1);
      })
    );
  }
}
