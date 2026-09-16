import { Component, input } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  template: `
    <div
      class="group relative overflow-hidden rounded-2xl border border-[#E8D5BE] bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-neutral-800 dark:bg-neutral-900"
    >
      <!-- Top Decorative Accent Bar -->
      <div
        class="absolute inset-x-0 top-0 h-1 transition-all group-hover:h-1.5"
        [ngClass]="accentColor()"
      ></div>

      <div class="flex items-start justify-between gap-3">
        <div class="space-y-1">
          <span class="text-xs font-bold text-[#8A735C] dark:text-neutral-400">
            {{ title() }}
          </span>
          <div class="flex items-baseline gap-2">
            <span class="text-2xl font-black tabular-nums text-[#181A1D] dark:text-white sm:text-3xl">
              @if (isPercent()) {
                {{ value() | number: '1.0-1' }}%
              } @else {
                {{ value() | number }}
              }
            </span>
            @if (suffix()) {
              <span class="text-xs font-bold text-[#A68B6D] dark:text-neutral-400">
                {{ suffix() }}
              </span>
            }
          </div>
        </div>

        <!-- Icon Container -->
        <div
          class="flex size-11 shrink-0 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110"
          [ngClass]="iconBgClass()"
        >
          <i [class]="'pi ' + icon() + ' text-xl ' + iconColorClass()" aria-hidden="true"></i>
        </div>
      </div>

      <!-- Subtitle or Trend Pill -->
      <div class="mt-3 flex items-center justify-between border-t border-neutral-100 pt-3 text-xs font-semibold dark:border-neutral-800/80">
        <span class="text-[#8A735C] dark:text-neutral-400">
          {{ subtitle() }}
        </span>
        @if (badge()) {
          <span
            class="rounded-full px-2 py-0.5 text-[11px] font-extrabold"
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
  readonly iconBgClass = input('bg-[#F8EEE2] dark:bg-neutral-800');
  readonly iconColorClass = input('text-[#C27938]');
  readonly badgeClass = input('bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300');
}
