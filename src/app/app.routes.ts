import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { adminGuard } from './core/guards/auth.guard';
import { permissionGuard } from './core/guards/permission.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login'
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent)
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [adminGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent)
      },
      {
        path: 'categories',
        canActivate: [permissionGuard],
        data: { permission: 'categories.view' },
        loadComponent: () =>
          import('./features/categories/categories.component').then((m) => m.CategoriesComponent)
      },
      {
        path: 'products/detail',
        canActivate: [permissionGuard],
        data: { permission: 'products.view' },
        loadComponent: () =>
          import('./features/products/product-detail.component').then((m) => m.ProductDetailComponent)
      },
      {
        path: 'products/:key',
        canActivate: [permissionGuard],
        data: { permission: 'products.view' },
        loadComponent: () =>
          import('./features/products/product-detail.component').then((m) => m.ProductDetailComponent)
      },
      {
        path: 'products',
        canActivate: [permissionGuard],
        data: { permission: 'products.view' },
        loadComponent: () =>
          import('./features/products/products-admin.component').then((m) => m.ProductsAdminComponent)
      },
      {
        path: 'product-linking',
        canActivate: [permissionGuard],
        data: { permission: 'product_linking.view' },
        loadComponent: () =>
          import('./features/products/product-linking/product-linking.component').then(
            (m) => m.ProductLinkingComponent
          )
      },
      {
        path: 'products/linking',
        redirectTo: 'product-linking',
        pathMatch: 'full'
      },
      {
        path: 'billboards',
        canActivate: [permissionGuard],
        data: { permission: 'billboards.view' },
        loadComponent: () =>
          import('./features/billboards/billboards.component').then((m) => m.BillboardsComponent)
      },
      {
        path: 'search-pharmacies',
        canActivate: [permissionGuard],
        data: { permission: 'pharmacies.view' },
        loadComponent: () =>
          import('./features/pharmacies/search-pharmacies.component').then(
            (m) => m.SearchPharmaciesComponent
          )
      },
      {
        path: 'top-pharmacy',
        redirectTo: 'search-pharmacies',
        pathMatch: 'full'
      },
      {
        path: 'magazines',
        canActivate: [permissionGuard],
        data: { permission: 'magazines.view' },
        loadComponent: () =>
          import('./features/magazines/magazines.component').then((m) => m.MagazinesComponent)
      },
      {
        path: 'coupons',
        canActivate: [permissionGuard],
        data: { permission: 'coupons.view' },
        loadComponent: () =>
          import('./features/coupons/coupons.component').then((m) => m.CouponsComponent)
      },
      {
        path: 'best-deals',
        canActivate: [permissionGuard],
        data: { permission: 'best_deals.view' },
        loadComponent: () =>
          import('./features/deals/best-deals.component').then((m) => m.BestDealsComponent)
      },
      {
        path: 'match-review',
        canActivate: [permissionGuard],
        data: { permission: 'match_review.view' },
        loadComponent: () =>
          import('./features/match-review/match-review.component').then((m) => m.MatchReviewComponent)
      },
      {
        path: 'audit-logs',
        redirectTo: () => {
          const router = inject(Router);
          return router.createUrlTree(['/settings'], { queryParams: { tab: 'logs' } });
        }
      },
      {
        path: 'users',
        canActivate: [permissionGuard],
        data: { permission: 'users.view' },
        loadComponent: () =>
          import('./features/users/users.component').then((m) => m.UsersComponent)
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/auth/profile/profile.component').then((m) => m.ProfileComponent)
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/settings.component').then((m) => m.SettingsComponent)
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
