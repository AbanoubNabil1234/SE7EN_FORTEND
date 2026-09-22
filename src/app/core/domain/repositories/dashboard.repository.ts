import { Observable } from 'rxjs';
import { OpsDashboardSnapshot } from '../models/dashboard.model';

export abstract class DashboardRepository {
  abstract getSnapshot(): Observable<OpsDashboardSnapshot>;
  abstract refreshSnapshot(): Observable<OpsDashboardSnapshot>;
}
