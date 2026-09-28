import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { NotificationRepository } from '../../domain/repositories/notification.repository';
import { AdminNotificationPage, BroadcastNotificationPayload } from '../../domain/models/notification.model';

@Injectable({ providedIn: 'root' })
export class HttpNotificationRepository implements NotificationRepository {
  private readonly http = inject(HttpClient);

  listAdmin(params?: {
    q?: string;
    type?: string;
    page?: number;
    pageSize?: number;
  }): Observable<AdminNotificationPage> {
    let httpParams = new HttpParams();
    if (params?.q) httpParams = httpParams.set('q', params.q);
    if (params?.type && params.type !== 'all') httpParams = httpParams.set('type', params.type);
    if (params?.page) httpParams = httpParams.set('page', params.page.toString());
    if (params?.pageSize) httpParams = httpParams.set('pageSize', params.pageSize.toString());

    return this.http.get<AdminNotificationPage>('/api/v1/admin/notifications', { params: httpParams });
  }

  broadcast(payload: BroadcastNotificationPayload): Observable<{ id: string; message: string }> {
    return this.http.post<{ id: string; message: string }>('/api/v1/admin/notifications/broadcast', payload);
  }
}
