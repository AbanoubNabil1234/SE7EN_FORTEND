import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../../services/notification.service';
import { I18nService } from '../../i18n/i18n.service';
import { API_ENDPOINTS } from '../http/api-endpoints.constants';
import { LocalStorageService } from '../storage/local-storage.service';
import { TokenRefreshService, IS_RETRIED_REQUEST } from '../services/token-refresh.service';
import { User } from '../../domain/models/user.model';

const AUTH_USER_KEY = 'se7en_auth_user';

/**
 * Functional Error Interceptor: Intercepts HTTP errors and surfaces user-friendly alerts.
 * Seamlessly refreshes expired access tokens via RefreshToken on 401 Unauthorized.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notificationService = inject(NotificationService);
  const i18n = inject(I18nService);
  const router = inject(Router);
  const storage = inject(LocalStorageService);
  const tokenRefreshService = inject(TokenRefreshService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // 1. If 401 occurs on the refresh-token endpoint itself, the refresh token is invalid/expired -> logout immediately
      if (req.url.includes(API_ENDPOINTS.AUTH_REFRESH_TOKEN)) {
        tokenRefreshService.logoutAndRedirect();
        return throwError(() => error);
      }

      // 2. Auth flow errors and non-critical endpoints bypass auto-refresh/redirect
      if (
        req.url.includes(API_ENDPOINTS.AUTH_LOGOUT) ||
        req.url.includes(API_ENDPOINTS.AUTH_LOGIN) ||
        req.url.includes(API_ENDPOINTS.AUTH_REGISTER) ||
        req.url.includes(API_ENDPOINTS.AUTH_FORGOT_PASSWORD) ||
        req.url.includes(API_ENDPOINTS.AUTH_VERIFY_RESET_CODE) ||
        req.url.includes(API_ENDPOINTS.AUTH_VERIFY_REGISTER_CODE) ||
        req.url.includes(API_ENDPOINTS.AUTH_RESET_PASSWORD) ||
        req.url.includes('/search/live') ||
        req.url.includes('/catalog.xlsx') ||
        req.url.includes('/image-proxy')
      ) {
        return throwError(() => error);
      }

      // 3. If 401 Unauthorized occurs on an authenticated route
      if (error.status === 401) {
        // If we already attempted refresh once for this request, do not loop
        if (req.context.get(IS_RETRIED_REQUEST)) {
          tokenRefreshService.logoutAndRedirect();
          return throwError(() => error);
        }

        const user = storage.getItem<User>(AUTH_USER_KEY);
        if (user?.refreshToken) {
          return tokenRefreshService.handle401(req, next);
        }

        // No refresh token available in storage -> session expired
        tokenRefreshService.logoutAndRedirect();
        return throwError(() => error);
      }

      // 4. Other HTTP errors (403, 500, etc.)
      let message = i18n.t('common.networkError');
      if (error.status === 403) {
        message = i18n.t('common.forbiddenError');
      } else if (error.error?.message) {
        message = error.error.message;
      }
      notificationService.showError(message, i18n.t('common.systemAlert'));
      return throwError(() => error);
    })
  );
};


