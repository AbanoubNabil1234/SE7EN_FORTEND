import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, take } from 'rxjs';
import { AuthRepository } from '../domain/repositories/auth.repository';

/**
 * Checks whether a JWT token is expired by decoding its payload and inspecting the 'exp' claim.
 */
export function isTokenExpired(token: string | null | undefined): boolean {
  if (!token) return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const decoded = JSON.parse(jsonPayload) as { exp?: number };
    if (!decoded.exp) return false;
    // Add 5 second buffer for clock skew
    return decoded.exp * 1000 <= Date.now() + 5000;
  } catch {
    return true;
  }
}

/** Requires any authenticated user with a valid, unexpired token. */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthRepository);
  const router = inject(Router);

  return auth.getCurrentUser().pipe(
    take(1),
    map((user) => {
      if (user?.token && !isTokenExpired(user.token)) {
        return true;
      }
      if (user?.token) {
        auth.logout().subscribe({ next: () => undefined, error: () => undefined });
      }
      return router.createUrlTree(['/login']);
    })
  );
};

/** Requires Admin role with a valid, unexpired token. */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthRepository);
  const router = inject(Router);

  return auth.getCurrentUser().pipe(
    take(1),
    map((user) => {
      if (user?.token && !isTokenExpired(user.token) && user.role === 'Admin') {
        return true;
      }
      if (user?.token) {
        auth.logout().subscribe({ next: () => undefined, error: () => undefined });
      }
      return router.createUrlTree(['/login']);
    })
  );
};

