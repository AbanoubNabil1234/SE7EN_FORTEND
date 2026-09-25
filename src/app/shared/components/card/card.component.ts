import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-card',
  standalone: true,
  templateUrl: './card.component.html'
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
