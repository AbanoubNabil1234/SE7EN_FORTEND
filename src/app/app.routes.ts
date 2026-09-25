import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { adminGuard } from './core/guards/auth.guard';

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
        loadComponent: () =>
          import('./features/categories/categories.component').then((m) => m.CategoriesComponent)
      },
      {
        path: 'products/detail',
        loadComponent: () =>
          import('./features/products/product-detail.component').then((m) => m.ProductDetailComponent)
      },
      {
        path: 'products/:key',
        loadComponent: () =>
          import('./features/products/product-detail.component').then((m) => m.ProductDetailComponent)
      },
      {
        path: 'products',
        loadComponent: () =>
          import('./features/products/products-admin.component').then((m) => m.ProductsAdminComponent)
      },
      {
        path: 'billboards',
        loadComponent: () =>
          import('./features/billboards/billboards.component').then((m) => m.BillboardsComponent)
      },
      {
        path: 'search-pharmacies',
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
        loadComponent: () =>
          import('./features/magazines/magazines.component').then((m) => m.MagazinesComponent)
      },
      {
        path: 'coupons',
        loadComponent: () =>
          import('./features/coupons/coupons.component').then((m) => m.CouponsComponent)
      },
      {
        path: 'best-deals',
        loadComponent: () =>
          import('./features/deals/best-deals.component').then((m) => m.BestDealsComponent)
      },
      {
        path: 'match-review',
        loadComponent: () =>
          import('./features/match-review/match-review.component').then((m) => m.MatchReviewComponent)
      },
      {
        path: 'audit-logs',
        loadComponent: () =>
          import('./features/audit-logs/audit-logs.component').then((m) => m.AuditLogsComponent)
      },
      {
        path: 'users',
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
