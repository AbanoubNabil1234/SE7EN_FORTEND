import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of, tap, catchError } from 'rxjs';
import {
  AuthRepository,
  ChangePasswordPayload,
  ForgotPasswordPayload,
  LoginCredentials,
  ResetPasswordPayload,
  UpdateProfilePayload,
  VerifyResetCodePayload
} from '../../domain/repositories/auth.repository';
import { AuthTokenResponse, User } from '../../domain/models/user.model';
import { LocalStorageService } from '../storage/local-storage.service';
import { API_ENDPOINTS } from '../http/api-endpoints.constants';

const AUTH_USER_KEY = 'se7en_auth_user';

interface AuthUserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: string;
  phone?: string | null;
  isActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class HttpAuthRepository extends AuthRepository {
  private readonly http = inject(HttpClient);
  private readonly storage = inject(LocalStorageService);

  login(credentials: LoginCredentials): Observable<User> {
    return this.http.post<AuthTokenResponse>(API_ENDPOINTS.AUTH_LOGIN, credentials).pipe(
      map((res) => this.toUserFromToken(res)),
      tap((user) => this.storage.setItem(AUTH_USER_KEY, user))
    );
  }

  getCurrentUser(): Observable<User | null> {
    return of(this.storage.getItem<User>(AUTH_USER_KEY));
  }

  refreshMe(): Observable<User | null> {
    const cached = this.storage.getItem<User>(AUTH_USER_KEY);
    if (!cached?.token) {
      return of(null);
    }
    return this.http.get<AuthUserDto>(API_ENDPOINTS.AUTH_ME).pipe(
      map((dto) => this.toUserFromDto(dto, cached.token!)),
      tap((user) => this.storage.setItem(AUTH_USER_KEY, user)),
      catchError(() => of(cached))
    );
  }

  updateProfile(payload: UpdateProfilePayload): Observable<User> {
    const cached = this.storage.getItem<User>(AUTH_USER_KEY);
    return this.http.put<AuthUserDto>(API_ENDPOINTS.AUTH_ME, payload).pipe(
      map((dto) => this.toUserFromDto(dto, cached?.token)),
      tap((user) => this.storage.setItem(AUTH_USER_KEY, user))
    );
  }

  changePassword(payload: ChangePasswordPayload): Observable<void> {
    return this.http.post<void>(API_ENDPOINTS.AUTH_CHANGE_PASSWORD, payload).pipe(map(() => void 0));
  }

  logout(): Observable<void> {
    const cached = this.storage.getItem<User>(AUTH_USER_KEY);
    if (!cached?.token) {
      this.storage.removeItem(AUTH_USER_KEY);
      return of(void 0);
    }
    // Keep token until after the request so the auth interceptor can attach Bearer.
    return this.http.post<void>(API_ENDPOINTS.AUTH_LOGOUT, {}).pipe(
      map(() => void 0),
      catchError(() => of(void 0)),
      tap(() => this.storage.removeItem(AUTH_USER_KEY))
    );
  }

  forgotPassword(payload: ForgotPasswordPayload): Observable<void> {
    return this.http.post<void>(API_ENDPOINTS.AUTH_FORGOT_PASSWORD, payload).pipe(map(() => void 0));
  }

  verifyResetCode(payload: VerifyResetCodePayload): Observable<void> {
    return this.http.post<void>(API_ENDPOINTS.AUTH_VERIFY_RESET_CODE, payload).pipe(map(() => void 0));
  }

  resetPassword(payload: ResetPasswordPayload): Observable<void> {
    return this.http
      .post<void>(API_ENDPOINTS.AUTH_RESET_PASSWORD, {
        email: payload.email,
        code: payload.code,
        newPassword: payload.newPassword
      })
      .pipe(map(() => void 0));
  }

  private toUserFromToken(res: AuthTokenResponse): User {
    return this.toUserFromDto(res.user, res.accessToken);
  }

  private toUserFromDto(dto: AuthUserDto, token?: string): User {
    return {
      id: dto.id,
      email: dto.email,
      fullName: dto.fullName,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: dto.role === 'Admin' ? 'Admin' : 'Customer',
      phone: dto.phone,
      token
    };
  }
}
