import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      [type]="type()"
      [disabled]="disabled() || loading()"
      (click)="clicked.emit($event)"
      [class]="buttonClasses()"
    >
      @if (loading()) {
        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-current inline" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      }
      <ng-content></ng-content>
    </button>
  `
})
export class ButtonComponent {
  variant = input<'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'brand-dark'>('primary');
  size = input<'sm' | 'md' | 'lg'>('md');
  type = input<'button' | 'submit' | 'reset'>('button');
  disabled = input<boolean>(false);
  loading = input<boolean>(false);
  clicked = output<MouseEvent>();

  buttonClasses(): string {
    const base = 'inline-flex items-center justify-center font-bold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-[0.98] cursor-pointer';

    const sizes = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2.5 text-sm',
      lg: 'px-6 py-3.5 text-base'
    };

    const variants = {
      primary: 'bg-brand-500 hover:bg-brand-600 text-carbon-950 shadow-brand focus:ring-brand-500 border border-brand-400/40',
      'brand-dark': 'bg-carbon-900 hover:bg-carbon-800 text-brand-300 border border-brand-500/30 focus:ring-carbon-800 shadow-carbon',
      secondary: 'bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-700 dark:hover:bg-slate-600 focus:ring-slate-500',
      outline: 'border border-brand-500/40 bg-transparent hover:bg-brand-50/80 dark:hover:bg-brand-950/40 text-brand-800 dark:text-brand-300 focus:ring-brand-500',
      danger: 'bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500',
      ghost: 'bg-transparent hover:bg-brand-100/60 dark:hover:bg-carbon-800 text-carbon-700 dark:text-carbon-200 shadow-none'
    };

    return `${base} ${sizes[this.size()]} ${variants[this.variant()]}`;
  }
}
