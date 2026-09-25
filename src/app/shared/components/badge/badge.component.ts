import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-badge',
  standalone: true,
  templateUrl: './badge.component.html'
})
export class BadgeComponent {
  variant = input<'brand' | 'success' | 'warning' | 'info' | 'danger' | 'neutral'>('brand');

  badgeClasses(): string {
    const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide';
    const variants = {
      brand: 'bg-brand-100 text-brand-900 dark:bg-brand-950/70 dark:text-brand-300 border border-brand-300 dark:border-brand-800',
      success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
      warning: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
      info: 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800',
      danger: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800',
      neutral: 'bg-carbon-100 text-carbon-800 dark:bg-carbon-800 dark:text-carbon-200 border border-carbon-200 dark:border-carbon-700'
    };
    return `${base} ${variants[this.variant()]}`;
  }
}
