import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContextToken, HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError, finalize, map, shareReplay, switchMap, take } from 'rxjs/operators';
import { LocalStorageService } from '../storage/local-storage.service';
import { API_ENDPOINTS } from '../http/api-endpoints.constants';
import { AuthTokenResponse, User } from '../../domain/models/user.model';
import { NotificationService } from '../../services/notification.service';
import { I18nService } from '../../i18n/i18n.service';

const AUTH_USER_KEY = 'se7en_auth_user';

/**
 * Context token attached to retried HTTP requests to prevent infinite refresh retry loops.
 */
export const IS_RETRIED_REQUEST = new HttpContextToken<boolean>(() => false);

@Injectable({ providedIn: 'root' })
export class TokenRefreshService {
  private readonly http = inject(HttpClient);
  private readonly storage = inject(LocalStorageService);
  private readonly router = inject(Router);
  private readonly notificationService = inject(NotificationService);
  private readonly i18n = inject(I18nService);

  private refreshInFlight$: Observable<string> | null = null;
  private isLoggingOut = false;

  /**
   * Handles 401 Unauthorized by executing a single silent token refresh and retrying the request.
   * If multiple requests trigger 401 concurrently, they queue on the single in-flight refresh observable.
   */
  handle401(req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> {
    const user = this.storage.getItem<User>(AUTH_USER_KEY);
    if (!user?.refreshToken) {
      this.logoutAndRedirect();
      return throwError(() => new Error('No refresh token available.'));
    }

    if (!this.refreshInFlight$) {
      this.refreshInFlight$ = this.http
        .post<AuthTokenResponse>(API_ENDPOINTS.AUTH_REFRESH_TOKEN, {
          refreshToken: user.refreshToken
        })
        .pipe(
          map((res) => {
            const updatedUser: User = {
              ...user,
              token: res.accessToken,
              refreshToken: res.refreshToken,
              refreshTokenExpiresAt: res.refreshTokenExpiresAt
            };
            this.storage.setItem(AUTH_USER_KEY, updatedUser);
            return res.accessToken;
          }),
          catchError((err) => {
            this.logoutAndRedirect();
            return throwError(() => err);
          }),
          finalize(() => {
            this.refreshInFlight$ = null;
          }),
          shareReplay(1)
        );
    }

    return this.refreshInFlight$.pipe(
      take(1),
      switchMap((newAccessToken) => {
        const retryReq = req.clone({
          headers: req.headers.set('Authorization', `Bearer ${newAccessToken}`),
          context: req.context.set(IS_RETRIED_REQUEST, true)
        });
        return next(retryReq);
      })
    );
  }

  logoutAndRedirect(): void {
    this.storage.removeItem(AUTH_USER_KEY);
    if (!this.isLoggingOut) {
      this.isLoggingOut = true;
      this.notificationService.showError(
        this.i18n.t('common.sessionExpired'),
        this.i18n.t('common.systemAlert')
      );
      setTimeout(() => {
        this.isLoggingOut = false;
      }, 3000);
    }
    if (!this.router.url.includes('/login')) {
      this.router.navigate(['/login']);
    }
  }
}
