import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { SidebarComponent } from '../components/sidebar/sidebar.component';
import { NotificationService } from '../../core/services/notification.service';
import { LoadingService } from '../../core/services/loading.service';
import { LocaleService } from '../../core/services/locale.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { AuthRepository } from '../../core/domain/repositories/auth.repository';
import { User } from '../../core/domain/models/user.model';

import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

const ROUTE_KEYS: Record<string, { eyebrow: string; title: string }> = {
  dashboard: { eyebrow: 'page.dashboardEyebrow', title: 'page.dashboardTitle' },
  categories: { eyebrow: 'page.categoriesEyebrow', title: 'page.categoriesTitle' },
  products: { eyebrow: 'page.productsEyebrow', title: 'page.productsTitle' },
  'product-linking': { eyebrow: 'page.productLinkingEyebrow', title: 'page.productLinkingTitle' },
  billboards: { eyebrow: 'page.billboardsEyebrow', title: 'page.billboardsTitle' },
  'search-pharmacies': { eyebrow: 'page.searchPharmaciesEyebrow', title: 'page.searchPharmaciesTitle' },
  magazines: { eyebrow: 'page.magazinesEyebrow', title: 'page.magazinesTitle' },
  coupons: { eyebrow: 'page.couponsEyebrow', title: 'page.couponsTitle' },
  'match-review': { eyebrow: 'page.matchReviewEyebrow', title: 'page.matchReviewTitle' },
  'best-deals': { eyebrow: 'page.bestDealsEyebrow', title: 'page.bestDealsTitle' },
  users: { eyebrow: 'page.usersEyebrow', title: 'page.usersTitle' },
  profile: { eyebrow: 'page.profileEyebrow', title: 'page.profileTitle' },
  settings: { eyebrow: 'page.settingsEyebrow', title: 'page.settingsTitle' }
};

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, SidebarComponent, TranslatePipe, ConfirmDialogComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css'
})
export class MainLayoutComponent {
  readonly notificationService = inject(NotificationService);
  readonly loadingService = inject(LoadingService);
  readonly locale = inject(LocaleService);
  private readonly i18n = inject(I18nService);
  private readonly auth = inject(AuthRepository);
  readonly sidebarOpen = signal(false);
  readonly currentUser = signal<User | null>(null);

  private readonly router = inject(Router);

  private readonly routeKey = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      startWith(null),
      map(() => {
        const url = this.router.url.split('?')[0];
        return url.split('/').filter(Boolean)[0] || 'dashboard';
      })
    ),
    { initialValue: 'dashboard' }
  );

  readonly headerName = computed(() => {
    this.locale.locale();
    const u = this.currentUser();
    return u?.fullName?.trim() || this.i18n.t('shell.admin');
  });

  readonly pageEyebrow = computed(() => {
    this.locale.locale();
    const keys = ROUTE_KEYS[this.routeKey()] ?? ROUTE_KEYS['dashboard'];
    return this.i18n.t(keys.eyebrow);
  });

  readonly pageTitle = computed(() => {
    this.locale.locale();
    const keys = ROUTE_KEYS[this.routeKey()] ?? ROUTE_KEYS['dashboard'];
    return this.i18n.t(keys.title);
  });

  constructor() {
    this.auth.getCurrentUser().subscribe((u) => this.currentUser.set(u));
    this.auth.refreshMe().subscribe((u) => {
      if (u) this.currentUser.set(u);
    });
  }
}
