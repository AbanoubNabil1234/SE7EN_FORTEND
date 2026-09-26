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
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
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
    { path: '/product-linking', icon: 'pi-link', labelKey: 'nav.productLinking' },
    { path: '/billboards', icon: 'pi-tag', labelKey: 'nav.billboards' },
    { path: '/search-pharmacies', icon: 'pi-building', labelKey: 'nav.searchPharmacies' },
    { path: '/magazines', icon: 'pi-book', labelKey: 'nav.magazines' },
    { path: '/coupons', icon: 'pi-ticket', labelKey: 'nav.coupons' },
    { path: '/match-review', icon: 'pi-check-square', labelKey: 'nav.matchReview' },
    { path: '/best-deals', icon: 'pi-shopping-bag', labelKey: 'nav.bestDeals' },
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
