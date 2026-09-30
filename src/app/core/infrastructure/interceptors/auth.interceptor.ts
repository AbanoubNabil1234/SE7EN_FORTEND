import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { LocalStorageService } from '../storage/local-storage.service';
import { User } from '../../domain/models/user.model';
import { API_ENDPOINTS } from '../http/api-endpoints.constants';

/**
 * Functional Auth Interceptor: Attaches JWT Bearer token to outgoing HTTP requests.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const storage = inject(LocalStorageService);
  const user = storage.getItem<User>('se7en_auth_user');

  let headers = req.headers;

  const isAuthEndpoint =
    req.url.includes(API_ENDPOINTS.AUTH_LOGIN) ||
    req.url.includes(API_ENDPOINTS.AUTH_REFRESH_TOKEN) ||
    req.url.includes(API_ENDPOINTS.AUTH_REVOKE_TOKEN) ||
    req.url.includes(API_ENDPOINTS.AUTH_REGISTER) ||
    req.url.includes(API_ENDPOINTS.AUTH_FORGOT_PASSWORD) ||
    req.url.includes(API_ENDPOINTS.AUTH_RESET_PASSWORD);

  if (user?.token && !isAuthEndpoint) {
    headers = headers.set('Authorization', `Bearer ${user.token}`);
  }

  return next(req.clone({ headers }));
};
