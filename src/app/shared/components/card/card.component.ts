import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [class]="cardClasses()">
      @if (title()) {
        <div class="px-6 py-4 border-b border-brand-100/60 dark:border-carbon-800/80 flex items-center justify-between">
          <h3 class="text-base font-bold text-carbon-900 dark:text-brand-100">{{ title() }}</h3>
          <ng-content select="[card-header-action]"></ng-content>
        </div>
      }
      <div class="p-6">
        <ng-content></ng-content>
      </div>
      @if (hasFooter()) {
        <div class="px-6 py-4 bg-brand-50/30 dark:bg-carbon-950/40 border-t border-brand-100/60 dark:border-carbon-800/80 rounded-b-2xl">
          <ng-content select="[card-footer]"></ng-content>
        </div>
      }
    </div>
  `
})
export class CardComponent {
  title = input<string>();
  hasFooter = input<boolean>(false);
  hoverable = input<boolean>(true);

  cardClasses(): string {
    const base = 'bg-white dark:bg-carbon-900/90 rounded-2xl border border-brand-200/50 dark:border-carbon-800 shadow-sm transition-all duration-300 backdrop-blur-sm';
    const hover = this.hoverable() ? 'hover:shadow-brand hover:border-brand-400/60 dark:hover:border-brand-500/40 hover:-translate-y-0.5' : '';
    return `${base} ${hover}`;
  }
}
