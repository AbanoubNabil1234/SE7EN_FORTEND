import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { LocalStorageService } from '../storage/local-storage.service';
import { User } from '../../domain/models/user.model';

/**
 * Functional Auth Interceptor: Attaches JWT Bearer token to outgoing HTTP requests.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const storage = inject(LocalStorageService);
  const user = storage.getItem<User>('se7en_auth_user');

  let headers = req.headers;

  if (user?.token) {
    headers = headers.set('Authorization', `Bearer ${user.token}`);
  }

  if (req.url.includes('/api/v1/admin/') || req.url.includes('/admin/')) {
    headers = headers.set('X-Admin-Key', 'se7en_admin_key_2026_pharmacy');
  }

  return next(req.clone({ headers }));
};
