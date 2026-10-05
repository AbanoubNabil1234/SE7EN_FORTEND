import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, take } from 'rxjs';
import { AuthRepository } from '../domain/repositories/auth.repository';
import { PermissionService } from '../services/permission.service';

const ROUTE_PERMISSION_FALLBACKS: { path: string; permission: string }[] = [
  { path: '/dashboard', permission: 'dashboard.view' },
  { path: '/categories', permission: 'categories.view' },
  { path: '/products', permission: 'products.view' },
  { path: '/product-linking', permission: 'product_linking.view' },
  { path: '/billboards', permission: 'billboards.view' },
  { path: '/search-pharmacies', permission: 'pharmacies.view' },
  { path: '/magazines', permission: 'magazines.view' },
  { path: '/coupons', permission: 'coupons.view' },
  { path: '/best-deals', permission: 'best_deals.view' },
  { path: '/match-review', permission: 'match_review.view' },
  { path: '/users', permission: 'users.view' },
  { path: '/settings', permission: 'settings.view' }
];

export const permissionGuard: CanActivateFn = (route) => {
  const auth = inject(AuthRepository);
  const permissionService = inject(PermissionService);
  const router = inject(Router);

  const required = route.data?.['permission'] as string | undefined;

  return auth.getCurrentUser().pipe(
    take(1),
    map((user) => {
      if (!user) return router.createUrlTree(['/login']);
      if (user.role?.toLowerCase() === 'admin') return true;
      if (!required || permissionService.hasPermission(required)) return true;

      // Smart redirect: find the first permissible route for the user's role
      for (const item of ROUTE_PERMISSION_FALLBACKS) {
        if (permissionService.hasPermission(item.permission)) {
          return router.createUrlTree([item.path]);
        }
      }

      return router.createUrlTree(['/profile']);
    })
  );
};

