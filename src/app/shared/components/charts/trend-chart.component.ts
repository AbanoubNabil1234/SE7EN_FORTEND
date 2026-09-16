import { Component, computed, input, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { DashboardTrendPoint } from '../../../core/domain/models/dashboard.model';

@Component({
  selector: 'app-trend-chart',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  template: `
    <div class="relative w-full space-y-3 rounded-2xl border border-[#E8D5BE] bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 class="text-base font-bold text-[#181A1D] dark:text-white">
            {{ title() }}
          </h3>
          <p class="text-xs font-medium text-[#8A735C] dark:text-neutral-400">
            {{ subtitle() }}
          </p>
        </div>
        <div class="flex items-center gap-4 text-xs font-semibold">
          <div class="flex items-center gap-1.5">
            <span class="size-2.5 rounded-full bg-[#C27938]"></span>
            <span class="text-[#181A1D] dark:text-neutral-300">تحديث الأسعار</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="size-2.5 rounded-full bg-[#10B981]"></span>
            <span class="text-[#181A1D] dark:text-neutral-300">نسبة النجاح %</span>
          </div>
        </div>
      </div>

      <!-- SVG Canvas Chart -->
      <div class="relative h-64 w-full">
        @if (data().length === 0) {
          <div class="flex size-full items-center justify-center text-sm font-medium text-[#8A735C]">
            لا توجد بيانات سجلات كافية
          </div>
        } @else {
          <svg viewBox="0 0 700 240" class="size-full overflow-visible" preserveAspectRatio="none">
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#C27938" stop-opacity="0.35" />
                <stop offset="100%" stop-color="#C27938" stop-opacity="0.0" />
              </linearGradient>
              <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stop-color="#C27938" />
                <stop offset="100%" stop-color="#EAB308" />
              </linearGradient>
            </defs>

            <!-- Background Grid Lines -->
            <g class="stroke-neutral-200/60 dark:stroke-neutral-800" stroke-width="1" stroke-dasharray="4 4">
              <line x1="40" y1="30" x2="680" y2="30" />
              <line x1="40" y1="80" x2="680" y2="80" />
              <line x1="40" y1="130" x2="680" y2="130" />
              <line x1="40" y1="180" x2="680" y2="180" />
            </g>

            <!-- Gradient Area Fill -->
            <path [attr.d]="areaPath()" fill="url(#priceGradient)" />

            <!-- Price Updates Smooth Path -->
            <path
              [attr.d]="linePath()"
              fill="none"
              stroke="url(#priceGradient)"
              stroke-width="3.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />

            <!-- Success Rate Line Path -->
            <path
              [attr.d]="successLinePath()"
              fill="none"
              stroke="#10B981"
              stroke-width="2"
              stroke-dasharray="5 5"
              stroke-linecap="round"
            />

            <!-- Data Points -->
            @for (point of computedPoints(); track point.index) {
              <g class="group cursor-pointer" (mouseenter)="activePoint.set(point.raw)">
                <!-- Hover highlight line -->
                <line
                  [attr.x1]="point.x"
                  y1="20"
                  [attr.x2]="point.x"
                  y2="190"
                  stroke="#C27938"
                  stroke-width="1.5"
                  stroke-dasharray="3 3"
                  class="opacity-0 transition-opacity group-hover:opacity-100"
                />

                <!-- Price Circle -->
                <circle
                  [attr.cx]="point.x"
                  [attr.cy]="point.y"
                  r="5"
                  class="fill-[#C27938] stroke-white stroke-2 transition-all duration-200 group-hover:r-7 group-hover:stroke-[#181A1D]"
                />

                <!-- Success Rate Dot -->
                <circle
                  [attr.cx]="point.x"
                  [attr.cy]="point.sy"
                  r="3.5"
                  class="fill-[#10B981] stroke-white stroke-1.5"
                />
              </g>
            }

            <!-- X Axis Labels -->
            @for (point of computedPoints(); track point.index) {
              <text
                [attr.x]="point.x"
                y="215"
                text-anchor="middle"
                class="fill-[#8A735C] text-[11px] font-semibold dark:fill-neutral-400"
              >
                {{ point.raw.dateLabel }}
              </text>
            }
          </svg>

          <!-- Interactive Hover Tooltip -->
          @if (activePoint(); as hover) {
            <div
              class="pointer-events-none absolute start-1/2 top-4 -translate-x-1/2 rounded-xl border border-[#E8D5BE] bg-[#181A1D] px-4 py-2.5 text-xs text-white shadow-xl transition-all dark:border-neutral-700"
            >
              <div class="font-bold text-[#F59E0B]">{{ hover.dateLabel }}</div>
              <div class="mt-1 flex items-center justify-between gap-4">
                <span class="text-neutral-400">تحديثات الأسعار:</span>
                <span class="font-bold text-white">{{ hover.priceUpdates | number }}</span>
              </div>
              <div class="flex items-center justify-between gap-4">
                <span class="text-neutral-400">عمليات الحصاد:</span>
                <span class="font-bold text-white">{{ hover.scrapeRuns | number }}</span>
              </div>
              <div class="flex items-center justify-between gap-4">
                <span class="text-neutral-400">نسبة النجاح:</span>
                <span class="font-bold text-[#10B981]">{{ hover.successRate }}%</span>
              </div>
            </div>
          }
        }
      </div>
    </div>
  `
})
export class TrendChartComponent {
  readonly data = input<DashboardTrendPoint[]>([]);
  readonly title = input('نشاط المزامنة والأسعار');
  readonly subtitle = input('تطور التحديثات ونسب النجاح خلال السبعة أيام الماضية');

  readonly activePoint = signal<DashboardTrendPoint | null>(null);

  readonly computedPoints = computed(() => {
    const list = this.data();
    if (list.length === 0) return [];

    const maxVal = Math.max(...list.map((d) => d.priceUpdates), 10);
    const width = 640;
    const startX = 50;
    const stepX = list.length > 1 ? width / (list.length - 1) : width;

    return list.map((item, index) => {
      const x = startX + index * stepX;
      const y = 190 - (item.priceUpdates / maxVal) * 150;
      const sy = 190 - (item.successRate / 100) * 150;
      return { x, y, sy, index, raw: item };
    });
  });

  readonly linePath = computed(() => {
    const pts = this.computedPoints();
    if (pts.length === 0) return '';
    return pts.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
    }, '');
  });

  readonly areaPath = computed(() => {
    const pts = this.computedPoints();
    if (pts.length === 0) return '';
    const firstX = pts[0].x;
    const lastX = pts[pts.length - 1].x;
    return `${this.linePath()} L ${lastX} 190 L ${firstX} 190 Z`;
  });

  readonly successLinePath = computed(() => {
    const pts = this.computedPoints();
    if (pts.length === 0) return '';
    return pts.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt.x} ${pt.sy}` : `${acc} L ${pt.x} ${pt.sy}`;
    }, '');
  });
}
