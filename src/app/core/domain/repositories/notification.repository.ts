import { Observable } from 'rxjs';
import { AdminNotificationPage, BroadcastNotificationPayload } from '../models/notification.model';

export abstract class NotificationRepository {
  abstract listAdmin(params?: {
    q?: string;
    type?: string;
    page?: number;
    pageSize?: number;
  }): Observable<AdminNotificationPage>;

  abstract broadcast(payload: BroadcastNotificationPayload): Observable<{ id: string; message: string }>;
}
