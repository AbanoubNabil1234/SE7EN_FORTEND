import { Component, input } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  template: `
    <div
      class="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs transition-shadow hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
    >
      <!-- Top Row: Title & Icon -->
      <div class="flex items-center justify-between gap-2">
        <span class="text-xs font-bold text-slate-500 dark:text-neutral-400 truncate">
          {{ title() }}
        </span>

        <div
          class="flex size-8 shrink-0 items-center justify-center rounded-lg"
          [ngClass]="iconBgClass()"
        >
          <i [class]="'pi ' + icon() + ' text-xs ' + iconColorClass()" aria-hidden="true"></i>
        </div>
      </div>

      <!-- Center: Big Clean Number -->
      <div class="my-2 flex items-baseline gap-1.5">
        <span class="text-2xl sm:text-3xl font-black tabular-nums text-slate-900 dark:text-white">
          @if (isPercent()) {
            {{ value() | number: '1.0-1' }}%
          } @else {
            {{ value() | number }}
          }
        </span>
        @if (suffix()) {
          <span class="text-xs font-semibold text-slate-400">
            {{ suffix() }}
          </span>
        }
      </div>

      <!-- Bottom Row: Subtitle & Status Badge -->
      <div class="flex items-center justify-between gap-2 text-xs pt-1 border-t border-slate-50 dark:border-neutral-800/60">
        <span class="truncate text-[11px] font-medium text-slate-400" [title]="subtitle()">
          {{ subtitle() }}
        </span>
        @if (badge()) {
          <span
            class="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums"
            [ngClass]="badgeClass()"
          >
            {{ badge() }}
          </span>
        }
      </div>
    </div>
  `
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
