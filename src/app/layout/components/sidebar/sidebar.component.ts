import { Component, computed, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { LocaleService } from '../../../core/services/locale.service';
import { AuthRepository } from '../../../core/domain/repositories/auth.repository';
import { PermissionService } from '../../../core/services/permission.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

interface NavItem {
  path: string;
  icon: string;
  labelKey: string;
  permission?: string;
  badge?: number;
  exact?: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  readonly open = input(false);
  readonly closed = output<void>();

  readonly locale = inject(LocaleService);
  private readonly auth = inject(AuthRepository);
  private readonly router = inject(Router);
  private readonly permissionService = inject(PermissionService);

  private readonly allNav: NavItem[] = [
    { path: '/dashboard', icon: 'pi-th-large', labelKey: 'nav.dashboard', exact: true, permission: 'dashboard.view' },
    { path: '/categories', icon: 'pi-sitemap', labelKey: 'nav.categories', permission: 'categories.view' },
    { path: '/products', icon: 'pi-box', labelKey: 'nav.products', permission: 'products.view' },
    { path: '/product-linking', icon: 'pi-link', labelKey: 'nav.productLinking', permission: 'product_linking.view' },
    { path: '/billboards', icon: 'pi-tag', labelKey: 'nav.billboards', permission: 'billboards.view' },
    { path: '/search-pharmacies', icon: 'pi-building', labelKey: 'nav.searchPharmacies', permission: 'pharmacies.view' },
    { path: '/magazines', icon: 'pi-book', labelKey: 'nav.magazines', permission: 'magazines.view' },
    { path: '/coupons', icon: 'pi-ticket', labelKey: 'nav.coupons', permission: 'coupons.view' },
    { path: '/match-review', icon: 'pi-check-square', labelKey: 'nav.matchReview', permission: 'match_review.view' },
    { path: '/best-deals', icon: 'pi-shopping-bag', labelKey: 'nav.bestDeals', permission: 'best_deals.view' },
    { path: '/users', icon: 'pi-users', labelKey: 'nav.users', permission: 'users.view' }
  ];

  readonly mainNav = computed(() => {
    return this.allNav.filter(
      (item) => !item.permission || this.permissionService.hasPermission(item.permission)
    );
  });

  readonly canViewSettings = computed(() => this.permissionService.hasPermission('settings.view'));

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
