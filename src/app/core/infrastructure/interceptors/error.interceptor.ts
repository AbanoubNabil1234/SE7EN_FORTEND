import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../../services/notification.service';
import { API_ENDPOINTS } from '../http/api-endpoints.constants';

/**
 * Functional Error Interceptor: Intercepts HTTP errors and surfaces user-friendly alerts.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notificationService = inject(NotificationService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Logout is best-effort; never surface "session expired" while clearing the session.
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

      let message = 'An unexpected network error occurred';
      if (error.status === 401) {
        message = 'Session expired. Please log in again.';
      } else if (error.status === 403) {
        message = 'You do not have permission to perform this action.';
      } else if (error.error?.message) {
        message = error.error.message;
      }
      notificationService.showError(message, 'Network Alert');
      return throwError(() => error);
    })
  );
};
