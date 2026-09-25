import { Component, input } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  host: {
    class: 'block h-full w-full'
  },
  templateUrl: './kpi-card.component.html'
})
export class KpiCardComponent {
  readonly title = input.required<string>();
  readonly value = input.required<number>();
  readonly isPercent = input(false);
  readonly suffix = input('');
  readonly subtitle = input('');
  readonly badge = input('');
  readonly icon = input('pi-chart-line');
  readonly accentColor = input('bg-[#C27938]');
  readonly iconBgClass = input('bg-slate-50 dark:bg-neutral-800');
  readonly iconColorClass = input('text-slate-700 dark:text-neutral-200');
  readonly badgeClass = input('bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300');
}
