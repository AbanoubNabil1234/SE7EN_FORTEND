import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { routes } from './app.routes';
import { apiOriginInterceptor } from './core/infrastructure/interceptors/api-origin.interceptor';
import { authInterceptor } from './core/infrastructure/interceptors/auth.interceptor';
import { loadingInterceptor } from './core/infrastructure/interceptors/loading.interceptor';
import { errorInterceptor } from './core/infrastructure/interceptors/error.interceptor';
import { ProductRepository } from './core/domain/repositories/product.repository';
import { HttpProductRepository } from './core/infrastructure/repositories/http-product.repository';
import { AuthRepository } from './core/domain/repositories/auth.repository';
import { HttpAuthRepository } from './core/infrastructure/repositories/http-auth.repository';
import { CatalogBrowseRepository } from './core/domain/repositories/catalog-browse.repository';
import { HttpCatalogBrowseRepository } from './core/infrastructure/repositories/http-catalog-browse.repository';
import { BillboardRepository } from './core/domain/repositories/billboard.repository';
import { HttpBillboardRepository } from './core/infrastructure/repositories/http-billboard.repository';
import { MagazineRepository } from './core/domain/repositories/magazine.repository';
import { HttpMagazineRepository } from './core/infrastructure/repositories/http-magazine.repository';
import { CouponRepository } from './core/domain/repositories/coupon.repository';
import { HttpCouponRepository } from './core/infrastructure/repositories/http-coupon.repository';
import { BestDealsRepository } from './core/domain/repositories/best-deals.repository';
import { HttpBestDealsRepository } from './core/infrastructure/repositories/http-best-deals.repository';
import { LiveSearchRepository } from './core/domain/repositories/live-search.repository';
import { HttpLiveSearchRepository } from './core/infrastructure/repositories/http-live-search.repository';
import { DashboardRepository } from './core/domain/repositories/dashboard.repository';
import { HttpDashboardRepository } from './core/infrastructure/repositories/http-dashboard.repository';
import { MatchReviewRepository } from './core/domain/repositories/match-review.repository';
import { HttpMatchReviewRepository } from './core/infrastructure/repositories/http-match-review.repository';
import { AuditLogRepository } from './core/domain/repositories/audit-log.repository';
import { HttpAuditLogRepository } from './core/infrastructure/repositories/http-audit-log.repository';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(
      withInterceptors([apiOriginInterceptor, authInterceptor, loadingInterceptor, errorInterceptor])
    ),
    provideAnimationsAsync(),
    // Clean Architecture Dependency Inversion Principle (DIP):
    // Bind pure Domain Repository Contracts to concrete Infrastructure HTTP Repositories
    { provide: ProductRepository, useClass: HttpProductRepository },
    { provide: AuthRepository, useClass: HttpAuthRepository },
    { provide: CatalogBrowseRepository, useClass: HttpCatalogBrowseRepository },
    { provide: BillboardRepository, useClass: HttpBillboardRepository },
    { provide: MagazineRepository, useClass: HttpMagazineRepository },
    { provide: CouponRepository, useClass: HttpCouponRepository },
    { provide: BestDealsRepository, useClass: HttpBestDealsRepository },
    { provide: LiveSearchRepository, useClass: HttpLiveSearchRepository },
    { provide: DashboardRepository, useClass: HttpDashboardRepository },
    { provide: MatchReviewRepository, useClass: HttpMatchReviewRepository },
    { provide: AuditLogRepository, useClass: HttpAuditLogRepository }
  ]
};
