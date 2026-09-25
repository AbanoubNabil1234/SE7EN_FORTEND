import { Component, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { LocaleService } from '../../../core/services/locale.service';
import { AuthRepository } from '../../../core/domain/repositories/auth.repository';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

interface NavItem {
  path: string;
  icon: string;
  labelKey: string;
  badge?: number;
  exact?: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, TranslatePipe],
  template: `
    @if (open()) {
      <button
        type="button"
        class="fixed inset-0 z-30 bg-[#181A1D]/50 lg:hidden"
        [attr.aria-label]="'shell.closeMenu' | t"
        (click)="closed.emit()"
      ></button>
    }

    <aside
      class="shell-sidebar z-40 flex w-[17rem] shrink-0 flex-col overflow-hidden rounded-2xl bg-[#181A1D] text-white"
      [class.shell-sidebar--open]="open()"
      [class.shell-sidebar--closed]="!open()"
      [class.is-rtl]="locale.isRtl()"
      [attr.aria-label]="'shell.navLabel' | t"
    >
      <div class="px-4 pb-2 pt-4">
        <div class="flex items-center gap-3 rounded-xl bg-[#C27938] p-3">
          <img
            src="assets/logo.png"
            alt="se7en"
            class="size-11 shrink-0 rounded-[12px] object-cover"
          />
          <div class="min-w-0">
            <div class="truncate text-[15px] font-bold text-white">SE7EN</div>
            <div class="truncate text-[11px] font-medium text-white/85">
              {{ 'shell.product' | t }}
            </div>
          </div>
        </div>
      </div>

      <nav class="flex-1 overflow-y-auto px-3 py-3">
        <p class="mb-2 px-2 text-[10px] font-bold uppercase text-white/40">
          {{ 'shell.menu' | t }}
        </p>
        <ul class="space-y-1">
          @for (item of mainNav; track item.path) {
            <li>
              <a
                [routerLink]="item.path"
                routerLinkActive="nav-active"
                [routerLinkActiveOptions]="{ exact: item.exact === true }"
                class="nav-link group flex min-h-11 items-center gap-3 rounded-xl px-2.5 text-[13px] font-semibold text-white/70 hover:bg-white/5 hover:text-white"
                (click)="onNavigate()"
              >
                <span
                  class="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-white/70"
                >
                  <i class="pi text-sm leading-none" [ngClass]="item.icon" aria-hidden="true"></i>
                </span>
                <span class="min-w-0 flex-1 truncate">{{ item.labelKey | t }}</span>
                @if (item.badge) {
                  <span
                    class="inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold tabular-nums text-white"
                  >
                    {{ item.badge }}
                  </span>
                }
              </a>
            </li>
          }
        </ul>
      </nav>

      <div class="shrink-0 space-y-1 border-t border-white/10 p-3">
        <a
          routerLink="/settings"
          routerLinkActive="nav-active"
          class="nav-link group flex min-h-11 items-center gap-3 rounded-xl px-2.5 text-[13px] font-semibold text-white/70 hover:bg-white/5 hover:text-white"
          (click)="onNavigate()"
        >
          <span class="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/5">
            <i class="pi pi-cog text-sm leading-none" aria-hidden="true"></i>
          </span>
          <span>{{ 'shell.settings' | t }}</span>
        </a>
        <button
          type="button"
          class="flex min-h-11 w-full items-center gap-3 rounded-xl px-2.5 text-[13px] font-semibold text-white/70 hover:bg-white/5 hover:text-white"
          (click)="logout()"
        >
          <span class="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/5">
            <i class="pi pi-sign-out text-sm leading-none" aria-hidden="true"></i>
          </span>
          <span>{{ 'shell.logout' | t }}</span>
        </button>
      </div>
    </aside>
  `,
  styles: `
    :host { display: contents; }

    :host ::ng-deep a.nav-active {
      background: rgba(194, 121, 56, 0.18);
      color: #ffffff;
    }

    :host ::ng-deep a.nav-active > span:first-child {
      background: #c27938;
      color: #ffffff;
    }

    @media (max-width: 1023px) {
      .shell-sidebar {
        position: fixed;
        top: 0.75rem;
        bottom: 0.75rem;
        inset-inline-start: 0.75rem;
        height: auto;
      }
      .shell-sidebar--closed {
        transform: translateX(calc(-100% - 1.5rem));
        pointer-events: none;
      }
      .shell-sidebar--closed.is-rtl {
        transform: translateX(calc(100% + 1.5rem));
      }
      .shell-sidebar--open {
        transform: translateX(0);
        pointer-events: auto;
      }
    }

    @media (min-width: 1024px) {
      .shell-sidebar {
        position: relative;
        inset: auto;
        height: 100%;
        transform: none !important;
        pointer-events: auto;
      }
    }
  `
})
export class SidebarComponent {
  readonly open = input(false);
  readonly closed = output<void>();

  readonly locale = inject(LocaleService);
  private readonly auth = inject(AuthRepository);
  private readonly router = inject(Router);

  readonly mainNav: NavItem[] = [
    { path: '/dashboard', icon: 'pi-th-large', labelKey: 'nav.dashboard', exact: true },
    { path: '/categories', icon: 'pi-sitemap', labelKey: 'nav.categories' },
    { path: '/products', icon: 'pi-box', labelKey: 'nav.products' },
    { path: '/billboards', icon: 'pi-tag', labelKey: 'nav.billboards' },
    { path: '/search-pharmacies', icon: 'pi-building', labelKey: 'nav.searchPharmacies' },
    { path: '/magazines', icon: 'pi-book', labelKey: 'nav.magazines' },
    { path: '/coupons', icon: 'pi-ticket', labelKey: 'nav.coupons' },
    { path: '/match-review', icon: 'pi-check-square', labelKey: 'nav.matchReview' },
    { path: '/best-deals', icon: 'pi-shopping-bag', labelKey: 'nav.bestDeals' },
    { path: '/audit-logs', icon: 'pi-history', labelKey: 'nav.auditLogs' },
    { path: '/users', icon: 'pi-users', labelKey: 'nav.users' }
  ];

  onNavigate(): void {
    this.closed.emit();
  }

  logout(): void {
    this.auth.logout().subscribe({
      next: () => {
        this.closed.emit();
        void this.router.navigateByUrl('/login');
      }
    });
  }
}
