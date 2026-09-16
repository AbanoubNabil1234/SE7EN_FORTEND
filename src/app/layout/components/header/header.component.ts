import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ThemeService } from '../../../core/services/theme.service';
import { AuthRepository } from '../../../core/domain/repositories/auth.repository';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <header class="sticky top-0 z-40 w-full backdrop-blur-xl bg-[#FAF8F5]/85 dark:bg-carbon-950/85 border-b border-brand-200/50 dark:border-carbon-800 transition-colors">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <a routerLink="/dashboard" class="flex items-center gap-3 group">
          <img
            src="assets/logo.png"
            alt="se7en"
            class="w-10 h-10 rounded-2xl shadow-brand object-cover group-hover:scale-105 transition-transform"
          />
          <div class="flex flex-col leading-none">
            <span class="font-extrabold text-lg tracking-tight text-carbon-900 dark:text-white">
              se<span class="text-brand-500">7</span>en
            </span>
            <span class="text-[10px] text-brand-700/80 dark:text-brand-400 uppercase tracking-widest font-bold mt-1">
              Operations
            </span>
          </div>
        </a>

        <nav class="hidden sm:flex items-center gap-1">
          <a
            routerLink="/dashboard"
            routerLinkActive="bg-brand-100 dark:bg-carbon-800 text-brand-900 dark:text-brand-300 font-bold"
            class="px-4 py-2 rounded-xl text-sm font-semibold text-carbon-700 dark:text-carbon-300 hover:bg-brand-50 dark:hover:bg-carbon-900 transition-all"
          >
            Dashboard
          </a>
        </nav>

        <div class="flex items-center gap-2">
          <button
            type="button"
            (click)="themeService.toggleTheme()"
            class="p-2.5 rounded-xl text-carbon-600 dark:text-carbon-300 hover:bg-brand-100/70 dark:hover:bg-carbon-800 transition-colors border border-brand-200/40 dark:border-carbon-800"
            aria-label="Toggle theme"
          >
            @if (themeService.theme() === 'dark') {
              <i class="pi pi-sun text-lg text-brand-400"></i>
            } @else {
              <i class="pi pi-moon text-lg text-carbon-800"></i>
            }
          </button>

          <button
            type="button"
            (click)="logout()"
            class="px-3 py-2 rounded-xl text-xs font-bold text-carbon-700 dark:text-carbon-200 border border-brand-200/50 dark:border-carbon-700 hover:bg-brand-50 dark:hover:bg-carbon-900 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  `
})
export class HeaderComponent {
  readonly themeService = inject(ThemeService);
  private readonly auth = inject(AuthRepository);
  private readonly router = inject(Router);

  logout(): void {
    this.auth.logout().subscribe({
      next: () => void this.router.navigateByUrl('/login')
    });
  }
}
