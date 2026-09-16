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

const ROUTE_KEYS: Record<string, { eyebrow: string; title: string }> = {
  dashboard: { eyebrow: 'page.dashboardEyebrow', title: 'page.dashboardTitle' },
  categories: { eyebrow: 'page.categoriesEyebrow', title: 'page.categoriesTitle' },
  products: { eyebrow: 'page.productsEyebrow', title: 'page.productsTitle' },
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
  imports: [CommonModule, RouterOutlet, RouterLink, SidebarComponent, TranslatePipe],
  template: `
    <div
      class="h-dvh bg-[#FAF7F2] p-3 text-[#181A1D] sm:p-4"
      [attr.dir]="locale.isRtl() ? 'rtl' : 'ltr'"
      [class.font-ar]="locale.isRtl()"
    >
      @if (loadingService.isLoading()) {
        <div class="fixed inset-x-0 top-0 z-50 h-1 bg-[#C27938]"></div>
      }

      <div class="pointer-events-none fixed end-4 top-4 z-50 flex w-full max-w-sm flex-col gap-2">
        @for (toast of notificationService.toasts(); track toast.id) {
          <div
            class="pointer-events-auto flex items-start gap-3 rounded-xl border border-[#E8D5BE] bg-white p-3 shadow-sm"
            [ngClass]="{
              'border-emerald-200 bg-emerald-50 text-emerald-950': toast.type === 'success',
              'border-rose-200 bg-rose-50 text-rose-950': toast.type === 'error',
              'border-amber-200 bg-amber-50 text-amber-950': toast.type === 'warn'
            }"
          >
            <div class="min-w-0 flex-1">
              @if (toast.title) {
                <div class="text-sm font-semibold text-balance">{{ toast.title }}</div>
              }
              <div class="mt-0.5 text-xs text-pretty text-[#6B5A48]">{{ toast.message }}</div>
            </div>
            <button
              type="button"
              class="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-[#A68B6D] hover:text-[#181A1D]"
              [attr.aria-label]="'common.dismiss' | t"
              (click)="notificationService.remove(toast.id)"
            >
              ✕
            </button>
          </div>
        }
      </div>

      <div class="flex h-full gap-3 sm:gap-4">
        <app-sidebar [open]="sidebarOpen()" (closed)="sidebarOpen.set(false)" />

        <section class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#E8D5BE] bg-white shadow-sm">
          <header class="flex h-14 shrink-0 items-center gap-3 border-b border-[#EDE0D0] px-4 sm:px-5">
            <button
              type="button"
              class="inline-flex size-10 items-center justify-center rounded-xl border border-[#E8D5BE] text-[#4A4038] hover:bg-[#F8EEE2] lg:hidden"
              [attr.aria-label]="'common.openMenu' | t"
              (click)="sidebarOpen.set(true)"
            >
              <i class="pi pi-bars text-base" aria-hidden="true"></i>
            </button>

            <div class="min-w-0 flex-1">
              <p class="truncate text-[11px] font-bold text-[#C27938]">
                {{ pageEyebrow() }}
              </p>
              <h1 class="truncate text-base font-bold text-balance text-[#181A1D] sm:text-lg">
                {{ pageTitle() }}
              </h1>
            </div>

            <div class="flex shrink-0 items-center gap-2">
              <div
                class="inline-flex overflow-hidden rounded-xl border border-[#E8D5BE]"
                role="group"
                [attr.aria-label]="'common.language' | t"
              >
                <button
                  type="button"
                  class="min-h-9 px-2.5 text-[11px] font-bold"
                  [class]="locale.locale() === 'ar' ? 'bg-[#181A1D] text-white' : 'bg-white text-[#8A735C] hover:bg-[#FBF8F4]'"
                  (click)="locale.setLocale('ar')"
                >
                  عربي
                </button>
                <button
                  type="button"
                  class="min-h-9 px-2.5 text-[11px] font-bold"
                  [class]="locale.locale() === 'en' ? 'bg-[#181A1D] text-white' : 'bg-white text-[#8A735C] hover:bg-[#FBF8F4]'"
                  (click)="locale.setLocale('en')"
                >
                  EN
                </button>
              </div>

              <a
                routerLink="/profile"
                class="inline-flex items-center gap-2.5 rounded-xl border border-[#E8D5BE] bg-[#F8EEE2] py-1.5 pe-3.5 ps-1.5 hover:border-[#C27938]"
                [attr.aria-label]="'common.adminProfile' | t"
              >
              <img
                src="assets/logo.png"
                alt=""
                class="size-9 rounded-[10px] object-cover"
                aria-hidden="true"
              />
              <div class="min-w-0 text-start">
                <div class="truncate text-sm font-bold leading-tight text-[#181A1D]">
                  {{ headerName() }}
                </div>
                <div class="truncate text-[11px] font-medium leading-tight text-[#8A735C]">
                  {{ 'shell.brand' | t }}
                </div>
              </div>
            </a>
            </div>
          </header>

          <main class="min-h-0 flex-1 overflow-y-auto bg-[#FBF8F4]">
            <router-outlet />
          </main>
        </section>
      </div>
    </div>
  `,
  styles: `
    .font-ar {
      font-family: 'Cairo', 'Plus Jakarta Sans', sans-serif;
    }
  `
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
