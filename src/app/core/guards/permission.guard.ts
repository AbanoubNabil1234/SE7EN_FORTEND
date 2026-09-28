import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, take } from 'rxjs';
import { AuthRepository } from '../domain/repositories/auth.repository';
import { PermissionService } from '../services/permission.service';

export const permissionGuard: CanActivateFn = (route) => {
  const auth = inject(AuthRepository);
  const permissionService = inject(PermissionService);
  const router = inject(Router);

  const required = route.data?.['permission'] as string | undefined;
  if (!required) return true;

  return auth.getCurrentUser().pipe(
    take(1),
    map((user) => {
      if (!user) return router.createUrlTree(['/login']);
      if (user.role?.toLowerCase() === 'admin') return true;
      if (permissionService.hasPermission(required)) return true;
      return router.createUrlTree(['/dashboard']);
    })
  );
};
