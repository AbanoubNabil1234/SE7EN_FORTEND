import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../../services/notification.service';
import { I18nService } from '../../i18n/i18n.service';
import { API_ENDPOINTS } from '../http/api-endpoints.constants';
import { LocalStorageService } from '../storage/local-storage.service';

const AUTH_USER_KEY = 'se7en_auth_user';

/**
 * Functional Error Interceptor: Intercepts HTTP errors and surfaces user-friendly alerts.
 * Redirects to /login and clears stored session when 401 Unauthorized occurs on authenticated routes.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notificationService = inject(NotificationService);
  const i18n = inject(I18nService);
  const router = inject(Router);
  const storage = inject(LocalStorageService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Logout and auth flow errors are handled by their own forms/actions; never auto-redirect here.
      if (
        req.url.includes(API_ENDPOINTS.AUTH_LOGOUT) ||
        req.url.includes(API_ENDPOINTS.AUTH_LOGIN) ||
        req.url.includes(API_ENDPOINTS.AUTH_REGISTER) ||
        req.url.includes(API_ENDPOINTS.AUTH_FORGOT_PASSWORD) ||
        req.url.includes(API_ENDPOINTS.AUTH_VERIFY_RESET_CODE) ||
        req.url.includes(API_ENDPOINTS.AUTH_VERIFY_REGISTER_CODE) ||
        req.url.includes(API_ENDPOINTS.AUTH_RESET_PASSWORD) ||
        req.url.includes('/search/live') ||
        req.url.includes('/catalog.xlsx')
      ) {
        return throwError(() => error);
      }

      let message = i18n.t('common.networkError');
      if (error.status === 401) {
        message = i18n.t('common.sessionExpired');
        storage.removeItem(AUTH_USER_KEY);
        if (!router.url.includes('/login')) {
          router.navigate(['/login']);
        }
      } else if (error.status === 403) {
        message = i18n.t('common.forbiddenError');
      } else if (error.error?.message) {
        message = error.error.message;
      }
      notificationService.showError(message, i18n.t('common.systemAlert'));
      return throwError(() => error);
    })
  );
};

