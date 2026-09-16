import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, take } from 'rxjs';
import { AuthRepository } from '../domain/repositories/auth.repository';

/** Requires any authenticated user. */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthRepository);
  const router = inject(Router);

  return auth.getCurrentUser().pipe(
    take(1),
    map((user) => {
      if (user?.token) {
        return true;
      }
      return router.createUrlTree(['/login']);
    })
  );
};

/** Requires Admin role. */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthRepository);
  const router = inject(Router);

  return auth.getCurrentUser().pipe(
    take(1),
    map((user) => {
      if (user?.token && user.role === 'Admin') {
        return true;
      }
      if (user?.token) {
        return router.createUrlTree(['/login']);
      }
      return router.createUrlTree(['/login']);
    })
  );
};
