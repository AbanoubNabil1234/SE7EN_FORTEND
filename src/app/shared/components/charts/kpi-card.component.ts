import { Component, input } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  template: `
    <div
      class="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[#E8D5BE] bg-white p-5 shadow-xs transition-opacity duration-150 hover:border-[#C27938]/60 dark:border-neutral-800 dark:bg-[#14171C]"
    >
      <!-- Top Accent Line -->
      <div
        class="absolute inset-x-0 top-0 h-1 opacity-80 transition-opacity duration-150 group-hover:opacity-100"
        [ngClass]="accentColor()"
      ></div>

      <div>
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0 space-y-1">
            <span class="text-balance text-xs font-bold text-[#8A735C] dark:text-neutral-400">
              {{ title() }}
            </span>
            <div class="flex items-baseline gap-1.5">
              <span class="text-2xl font-black tabular-nums text-[#181A1D] dark:text-white sm:text-3xl">
                @if (isPercent()) {
                  {{ value() | number: '1.0-1' }}%
                } @else {
                  {{ value() | number }}
                }
              </span>
              @if (suffix()) {
                <span class="text-xs font-semibold text-[#8A735C] dark:text-neutral-400">
                  {{ suffix() }}
                </span>
              }
            </div>
          </div>

          <!-- Icon Badge -->
          <div
            class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800/80"
            [ngClass]="iconBgClass()"
          >
            <i [class]="'pi ' + icon() + ' text-base ' + iconColorClass()" aria-hidden="true"></i>
          </div>
        </div>
      </div>

      <!-- Bottom Subtitle & Badge -->
      <div class="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3 text-xs font-medium dark:border-neutral-800/80">
        <span class="truncate text-pretty text-[#8A735C] dark:text-neutral-400" [title]="subtitle()">
          {{ subtitle() }}
        </span>
        @if (badge()) {
          <span
            class="shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold tabular-nums"
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
  readonly badgeClass = input('bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300');
}
