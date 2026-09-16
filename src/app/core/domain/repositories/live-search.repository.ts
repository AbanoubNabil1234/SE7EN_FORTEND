import { Observable } from 'rxjs';
import { LiveSearchReport } from '../models/live-search.model';

export abstract class LiveSearchRepository {
  abstract search(query: string): Observable<LiveSearchReport>;
}
