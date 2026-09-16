import { Observable } from 'rxjs';
import { User } from '../models/user.model';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface VerifyResetCodePayload {
  email: string;
  code: string;
}

export interface ResetPasswordPayload {
  email: string;
  code: string;
  newPassword: string;
}

export interface UpdateProfilePayload {
  firstName: string;
  lastName: string;
  phone?: string | null;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

/**
 * Authentication Repository Domain Contract.
 */
export abstract class AuthRepository {
  abstract login(credentials: LoginCredentials): Observable<User>;
  abstract getCurrentUser(): Observable<User | null>;
  abstract refreshMe(): Observable<User | null>;
  abstract updateProfile(payload: UpdateProfilePayload): Observable<User>;
  abstract changePassword(payload: ChangePasswordPayload): Observable<void>;
  abstract logout(): Observable<void>;
  abstract forgotPassword(payload: ForgotPasswordPayload): Observable<void>;
  abstract verifyResetCode(payload: VerifyResetCodePayload): Observable<void>;
  abstract resetPassword(payload: ResetPasswordPayload): Observable<void>;
}
