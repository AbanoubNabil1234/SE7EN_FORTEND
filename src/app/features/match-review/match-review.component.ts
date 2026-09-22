import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';
import { MatchReviewRepository } from '../../core/domain/repositories/match-review.repository';
import {
  canAccept,
  distinctPharmacyCount,
  MatchReviewActionResult,
  MatchReviewDetail,
  MatchReviewQueueItem
} from '../../core/domain/models/match-review.model';
import { PHARMACY_BRANDS } from '../../core/domain/pharmacy-brands';
import { LocaleService } from '../../core/services/locale.service';
import { NotificationService } from '../../core/services/notification.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { ProxyImgPipe } from '../../shared/pipes/proxy-img.pipe';

@Component({
  selector: 'app-match-review',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, ProxyImgPipe],
  template: `
    <section class="w-full space-y-4" [class.px-4]="!isEmbedded()" [class.py-4]="!isEmbedded()" [class.sm:px-5]="!isEmbedded()" [class.sm:py-5]="!isEmbedded()" [attr.dir]="locale.isRtl() ? 'rtl' : 'ltr'">
      
      <!-- Top Mode Switcher Tabs Bar -->
      <div class="flex items-center justify-between gap-3 p-1.5 rounded-2xl bg-white border border-[#E8D5BE] shadow-xs flex-wrap">
        <div class="flex items-center gap-2">
          <!-- Tab 1: Auto Catalog (98% - 99%) -->
          <button
            type="button"
            (click)="switchMode('auto_98_99')"
            [class]="selectedMode() === 'auto_98_99'
              ? 'bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-700 text-white shadow-sm font-black'
              : 'text-[#5C4936] hover:text-[#181A1D] hover:bg-[#F8EEE2]/60 font-bold'"
            class="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 sm:px-4 py-1.5 text-xs sm:text-sm transition-all cursor-pointer"
          >
            <i class="pi pi-check-circle text-xs" [class.text-emerald-200]="selectedMode() === 'auto_98_99'"></i>
            <span>{{ 'matchReview.tabAutoMatches' | t }}</span>
            <span
              [class]="selectedMode() === 'auto_98_99' ? 'bg-white/25 text-white' : 'bg-[#F0E4D5] text-[#2C231B]'"
              class="rounded-full px-2.5 py-0.5 text-xs font-black tabular-nums transition-colors"
            >
              {{ autoMatchesCount() | number }}
            </span>
          </button>

          <!-- Tab 2: Review Queue (<98%) -->
          <button
            type="button"
            (click)="switchMode('review')"
            [class]="selectedMode() === 'review'
              ? 'bg-gradient-to-r from-amber-600 to-[#C27938] text-white shadow-sm font-black'
              : 'text-[#5C4936] hover:text-[#181A1D] hover:bg-[#F8EEE2]/60 font-bold'"
            class="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 sm:px-4 py-1.5 text-xs sm:text-sm transition-all cursor-pointer"
          >
            <i class="pi pi-clock text-xs"></i>
            <span>{{ 'matchReview.tabPendingReview' | t }}</span>
            <span
              [class]="selectedMode() === 'review' ? 'bg-white/25 text-white' : 'bg-[#F0E4D5] text-[#2C231B]'"
              class="rounded-full px-2.5 py-0.5 text-xs font-black tabular-nums transition-colors"
            >
              {{ reviewQueueCount() | number }}
            </span>
          </button>
        </div>

        <div class="px-3 py-1 rounded-xl bg-[#F8EEE2] text-[#C27938] text-xs font-bold flex items-center gap-1.5 border border-[#E8D5BE]">
          <i class="pi pi-sparkles text-amber-600 animate-pulse"></i>
          <span>AI Model v4</span>
        </div>
      </div>

      @if (!isEmbedded()) {
        <div class="overflow-hidden rounded-2xl border border-[#E8D5BE] bg-white shadow-sm">
          <div class="h-1.5 bg-[#C27938]"></div>
          <div class="p-5 sm:p-6">
            <div class="inline-flex items-center gap-2 rounded-full bg-[#F8EEE2] px-3 py-1 text-[11px] font-bold text-[#C27938]">
              {{ 'matchReview.badge' | t }}
            </div>
            <h1 class="mt-3 text-3xl font-extrabold text-[#181A1D]">
              {{ (selectedMode() === 'auto_98_99' ? 'matchReview.tabAutoMatches' : 'matchReview.title') | t }}
            </h1>
            <p class="mt-1.5 max-w-2xl text-sm font-medium text-[#8A735C]">
              {{ selectedMode() === 'auto_98_99' 
                ? 'استعرض جميع المنتجات التي تم ربطها وإضافتها للكتالوج تلقائياً بدقة 98% و 99%، مع إمكانية فصلها أو نقلها لعائلة أخرى.'
                : ('matchReview.subtitle' | t) }}
            </p>
          </div>
          <div class="grid grid-cols-3 border-t border-[#EDE0D0]">
            <div class="border-e border-[#EDE0D0] px-5 py-3.5">
              <div class="text-[11px] font-bold text-[#A68B6D]">
                {{ (selectedMode() === 'auto_98_99' ? 'matchReview.statLinkedCatalog' : 'matchReview.queue') | t }}
              </div>
              <div class="mt-1 text-2xl font-extrabold tabular-nums text-[#181A1D]">{{ queueDepth() | number }}</div>
            </div>
            <div class="border-e border-[#EDE0D0] px-5 py-3.5">
              <div class="text-[11px] font-bold text-[#A68B6D]">{{ 'matchReview.selected' | t }}</div>
              <div class="mt-1 text-2xl font-extrabold tabular-nums text-[#181A1D]">{{ selectedIds().size }}</div>
            </div>
            <div class="px-5 py-3.5">
              <div class="text-[11px] font-bold text-[#A68B6D]">{{ 'matchReview.statFamilyMembers' | t }}</div>
              <div class="mt-1 text-2xl font-extrabold tabular-nums text-[#C27938]">{{ groupCount() }}/8</div>
            </div>
          </div>
        </div>
      } @else {
        <!-- Compact header metrics for embedded tab inside /products -->
        <div class="grid grid-cols-3 gap-3 rounded-2xl border border-[#E8D5BE] bg-white p-3 shadow-sm">
          <div class="rounded-xl bg-[#FBF8F4] px-4 py-3 text-center border border-[#EDE0D0]">
            <div class="text-[11px] font-bold text-[#A68B6D]">
              {{ (selectedMode() === 'auto_98_99' ? 'matchReview.statLinkedCatalog' : 'matchReview.queue') | t }}
            </div>
            <div class="mt-1 text-2xl font-extrabold text-[#181A1D] tabular-nums">{{ queueDepth() | number }}</div>
            <div class="text-[10px] font-medium text-[#8A735C] mt-0.5">
              {{ selectedMode() === 'auto_98_99' ? '98% - 100% تطابق مؤكد' : 'تحت المراجعة والتأكيد' }}
            </div>
          </div>
          <div class="rounded-xl bg-[#FBF8F4] px-4 py-3 text-center border border-[#EDE0D0]">
            <div class="text-[11px] font-bold text-[#A68B6D]">{{ 'matchReview.selected' | t }}</div>
            <div class="mt-1 text-2xl font-extrabold text-[#181A1D] tabular-nums">{{ selectedIds().size }}</div>
            <div class="text-[10px] font-medium text-[#8A735C] mt-0.5">
              {{ selectedMode() === 'auto_98_99' ? 'محدد للفصل' : 'محدد للإجراء' }}
            </div>
          </div>
          <div class="rounded-xl bg-[#FBF8F4] px-4 py-3 text-center border border-[#EDE0D0]">
            <div class="text-[11px] font-bold text-[#A68B6D]">{{ 'matchReview.statFamilyMembers' | t }}</div>
            <div class="mt-1 text-2xl font-extrabold text-[#C27938] tabular-nums">{{ groupCount() }}/8</div>
            <div class="text-[10px] font-medium text-[#8A735C] mt-0.5">
              صيدليات مرتبطة بنفس الماستر
            </div>
          </div>
        </div>
      }

      <!-- Filters & Search Toolbar -->
      <div class="flex flex-col gap-3 rounded-2xl border border-[#E8D5BE] bg-white p-3 sm:flex-row sm:flex-wrap sm:items-center">
        <!-- Search bar -->
        <div class="relative min-w-48 flex-1">
          <i class="pi pi-search absolute top-1/2 -translate-y-1/2 start-3 text-xs text-[#A68B6D] pointer-events-none"></i>
          <input
            type="search"
            class="min-h-11 w-full rounded-xl border border-[#E8D5BE] bg-[#FBF8F4] ps-9 pe-3 text-sm font-medium text-[#181A1D] outline-none focus:border-[#C27938] focus:bg-white"
            [value]="searchFilter()"
            (input)="searchFilter.set($any($event.target).value)"
            (keydown.enter)="onFilterChange()"
            [attr.placeholder]="'matchReview.searchPlaceholder' | t"
          />
        </div>

        <select
          class="min-h-11 rounded-xl border border-[#E8D5BE] bg-white px-3 text-sm"
          [value]="pharmacyFilter()"
          (change)="pharmacyFilter.set($any($event.target).value); onFilterChange()"
        >
          <option value="">{{ 'matchReview.allPharmacies' | t }}</option>
          @for (p of pharmacies; track p.code) {
            <option [value]="p.code">{{ locale.locale() === 'ar' ? p.nameAr : p.nameEn }}</option>
          }
        </select>
        <input
          class="min-h-11 min-w-36 rounded-xl border border-[#E8D5BE] px-3 text-sm"
          [value]="reasonFilter()"
          (change)="reasonFilter.set($any($event.target).value); onFilterChange()"
          [attr.placeholder]="'matchReview.reason' | t"
        />
        <input
          type="number"
          step="0.01"
          min="0"
          max="1"
          class="min-h-11 w-24 rounded-xl border border-[#E8D5BE] px-3 text-sm"
          [value]="minScore()"
          (change)="minScore.set($any($event.target).value); onFilterChange()"
          [attr.placeholder]="'matchReview.minScore' | t"
        />

        <div class="flex flex-wrap gap-2">
          @if (selectedMode() === 'auto_98_99') {
            <button
              type="button"
              class="min-h-11 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 px-4 text-sm font-bold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              [disabled]="selectedIds().size === 0"
              (click)="bulkUnlink()"
            >
              <i class="pi pi-unlink"></i>
              <span>{{ 'matchReview.bulkUnlink' | t }}</span>
              @if (selectedIds().size > 0) {
                <span class="rounded-full bg-rose-200/80 px-2 py-0.5 text-xs font-black">{{ selectedIds().size }}</span>
              }
            </button>
          } @else {
            <button type="button" class="min-h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 text-sm font-bold text-white transition-colors cursor-pointer" (click)="bulk('accept')">
              <i class="pi pi-check me-1"></i>
              {{ 'matchReview.bulkAccept' | t }}
            </button>
            <button type="button" class="min-h-11 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 px-4 text-sm font-bold transition-colors cursor-pointer" (click)="bulk('reject')">
              <i class="pi pi-times me-1"></i>
              {{ 'matchReview.bulkReject' | t }}
            </button>
          }
        </div>
      </div>

      <!-- Pagination & Count Bar -->
      <div class="flex flex-wrap items-center justify-between gap-3 px-1 text-xs font-semibold tabular-nums text-[#8A735C]">
        <div class="flex items-center gap-1.5">
          <span>
            {{ 'matchReview.showing' | t }}:
            <span class="font-bold text-[#181A1D]">{{ rangeStart() }}–{{ rangeEnd() }}</span>
            {{ 'matchReview.pageOf' | t }}
            <span class="font-bold text-[#181A1D]">{{ queueDepth() | number }}</span>
          </span>
        </div>
        <div class="flex items-center gap-2">
          <span>{{ 'matchReview.perPage' | t }}:</span>
          <select
            class="rounded-lg border border-[#E8D5BE] bg-white px-2.5 py-1 text-xs font-bold text-[#181A1D] outline-none cursor-pointer"
            [value]="pageSize()"
            (change)="setPageSize(+$any($event.target).value)"
          >
            <option [value]="10">10</option>
            <option [value]="15">15</option>
            <option [value]="25">25</option>
            <option [value]="50">50</option>
            <option [value]="100">100</option>
          </select>
        </div>
      </div>

      @if (loading()) {
        <!-- Match Review Split Skeleton -->
        <div class="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)] animate-pulse">
          <!-- Left Table Skeleton -->
          <div class="overflow-hidden rounded-2xl border border-[#E8D5BE] bg-white">
            <div class="border-b border-[#EDE0D0] bg-[#FBF8F4] px-4 py-3 flex items-center justify-between">
              <div class="h-4 w-28 rounded bg-[#E8D5BE]"></div>
              <div class="h-4 w-20 rounded bg-[#F3E7D8]"></div>
            </div>
            <div class="divide-y divide-[#F2E8DC] p-4 space-y-3">
              @for (row of [1, 2, 3, 4, 5]; track row) {
                <div class="flex items-center justify-between gap-3 pt-3 first:pt-0">
                  <div class="flex items-center gap-3">
                    <div class="size-8 rounded-lg bg-[#F3E7D8]"></div>
                    <div class="space-y-1.5">
                      <div class="h-4 w-40 rounded bg-[#E8D5BE]"></div>
                      <div class="h-3 w-24 rounded bg-[#F3E7D8]"></div>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <div class="h-5 w-14 rounded-full bg-[#F8EEE2]"></div>
                    <div class="h-4 w-16 rounded bg-[#F3E7D8]"></div>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Right Detail Card Skeleton -->
          <div class="space-y-4 rounded-2xl border border-[#E8D5BE] bg-white p-5">
            <div class="h-5 w-32 rounded bg-[#E8D5BE]"></div>
            <div class="flex items-center gap-3">
              <div class="size-20 rounded-xl bg-[#F8EEE2] border border-[#EDE0D0]"></div>
              <div class="space-y-2 flex-1">
                <div class="h-4 w-3/4 rounded bg-[#E8D5BE]"></div>
                <div class="h-3.5 w-1/2 rounded bg-[#F3E7D8]"></div>
                <div class="h-5 w-20 rounded-full bg-[#F8EEE2]"></div>
              </div>
            </div>
            <div class="space-y-2 pt-3 border-t border-[#EDE0D0]">
              <div class="h-4 w-24 rounded bg-[#F3E7D8]"></div>
              <div class="h-10 w-full rounded-xl bg-[#F8EEE2]"></div>
            </div>
            <div class="flex gap-2 pt-2">
              <div class="h-9 flex-1 rounded-xl bg-[#E8D5BE]/70"></div>
              <div class="h-9 flex-1 rounded-xl bg-[#181A1D]/30"></div>
            </div>
          </div>
        </div>
      } @else if (error()) {
        <div class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{{ 'matchReview.error' | t }}</div>
      } @else {
        <div class="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(19rem,0.75fr)] items-start">
          <!-- Bounded Table Container with Internal Scroll -->
          <div class="flex flex-col rounded-2xl border border-[#E8D5BE] bg-white max-h-[calc(100vh-14rem)] min-h-[460px] overflow-hidden shadow-xs">
            @if (items().length === 0) {
              <div class="flex-1 flex items-center justify-center px-6 py-16 text-center text-sm text-[#8A735C]">{{ 'matchReview.empty' | t }}</div>
            } @else {
              <!-- Scrollable Table Body with Sticky Header -->
              <div class="flex-1 overflow-auto min-h-0">
                <table class="min-w-full text-sm">
                  <thead class="sticky top-0 z-10 bg-[#FBF8F4] text-[11px] font-bold text-[#A68B6D] border-b border-[#EDE0D0] shadow-xs">
                    <tr>
                      <th class="px-3 py-2.5 bg-[#FBF8F4]"></th>
                      <th class="px-3 py-2.5 text-start bg-[#FBF8F4]">{{ 'matchReview.listing' | t }}</th>
                      <th class="px-3 py-2.5 text-start bg-[#FBF8F4]">{{ 'matchReview.score' | t }}</th>
                      <th class="px-3 py-2.5 text-start bg-[#FBF8F4]">{{ 'matchReview.reason' | t }}</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-[#EDE0D0]">
                    @for (row of items(); track row.matchId) {
                      <tr
                        class="cursor-pointer hover:bg-[#FBF8F4] transition-colors"
                        [class.bg-review-selected]="selected()?.matchId === row.matchId"
                        (click)="open(row)"
                      >
                        <td class="px-3 py-2">
                          <input type="checkbox" [checked]="selectedIds().has(row.matchId)" (click)="$event.stopPropagation(); toggle(row.matchId)" />
                        </td>
                        <td class="px-3 py-2">
                          <div class="flex items-center gap-2.5">
                            <div class="size-9 shrink-0 overflow-hidden rounded-lg bg-[#FBF8F4] border border-[#EDE0D0] flex items-center justify-center relative">
                              @if (row.imageUrl) {
                                <img
                                  #rowImg
                                  [src]="row.imageUrl | proxyImg"
                                  [alt]="row.name"
                                  loading="lazy"
                                  class="size-full object-contain p-0.5 relative z-10 transition-opacity duration-200"
                                  [class.opacity-0]="rowImg.dataset['failed'] === 'true'"
                                  (load)="rowImg.dataset['failed'] = 'false'"
                                  (error)="rowImg.dataset['failed'] = 'true'"
                                />
                              }
                              <i class="pi pi-image text-[#C27938]/40 text-xs absolute inset-0 m-auto flex items-center justify-center pointer-events-none"></i>
                            </div>
                            <div class="min-w-0 max-w-[280px] sm:max-w-md">
                              <div class="font-semibold text-xs sm:text-sm text-[#181A1D] truncate">{{ row.name }}</div>
                              <div class="flex items-center gap-1.5 text-[11px] text-[#8A735C] mt-0.5 flex-wrap">
                                <span class="font-medium text-[#181A1D]">{{ row.pharmacyName }}</span>
                                @if (selectedMode() === 'auto_98_99') {
                                  <span class="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 text-[9px] font-extrabold">
                                    <i class="pi pi-check text-[7px]"></i>
                                    {{ 'matchReview.autoMatchesBadge' | t }}
                                  </span>
                                } @else {
                                  <span>· {{ row.matchMethod }}</span>
                                }
                              </div>
                            </div>
                          </div>
                        </td>
                        <td class="px-3 py-2 tabular-nums whitespace-nowrap">
                          <span
                            class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold"
                            [class.bg-emerald-50]="row.confidence >= 0.9"
                            [class.text-emerald-700]="row.confidence >= 0.9"
                            [class.border]="row.confidence >= 0.9"
                            [class.border-emerald-200]="row.confidence >= 0.9"
                            [class.bg-amber-50]="row.confidence >= 0.8 && row.confidence < 0.9"
                            [class.text-amber-700]="row.confidence >= 0.8 && row.confidence < 0.9"
                            [class.bg-sky-50]="row.confidence < 0.8"
                            [class.text-sky-700]="row.confidence < 0.8"
                          >
                            <i class="pi pi-sparkles text-[9px]"></i>
                            {{ (row.confidence * 100) | number: '1.1-1' }}%
                          </span>
                        </td>
                        <td class="px-3 py-2 text-xs text-[#8A735C] max-w-[200px] truncate">
                          @if (selectedMode() === 'auto_98_99') {
                            <span class="text-emerald-800 font-medium">تطابق عالي آلي (AI Model v4)</span>
                          } @else {
                            <span>{{ row.decisionReason || '—' }}</span>
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
            <!-- Fixed Pinned Pagination at Table Bottom -->
            @if (totalPages() > 1) {
              <div class="shrink-0 flex flex-wrap items-center justify-center gap-1.5 border-t border-[#EDE0D0] bg-[#FBF8F4] p-2">
                <button
                  type="button"
                  class="inline-flex min-h-8 items-center gap-1 rounded-lg border border-[#E8D5BE] bg-white px-2.5 text-xs font-bold text-[#181A1D] hover:bg-[#FBF8F4] disabled:opacity-40 transition-colors cursor-pointer"
                  [disabled]="page() <= 1 || loading()"
                  (click)="goToPage(page() - 1)"
                >
                  <i class="pi pi-chevron-right text-[10px]" [class.rotate-180]="!locale.isRtl()"></i>
                  {{ 'matchReview.pagePrev' | t }}
                </button>
                @for (p of pageButtons(); track p) {
                  @if (p === '…') {
                    <span class="px-1 text-xs font-bold text-[#A68B6D]">…</span>
                  } @else {
                    <button
                      type="button"
                      class="inline-flex size-8 items-center justify-center rounded-lg text-xs font-bold tabular-nums transition-colors cursor-pointer"
                      [ngClass]="
                        page() === p
                          ? 'bg-[#181A1D] text-white shadow-xs'
                          : 'border border-[#E8D5BE] bg-white text-[#181A1D] hover:bg-[#FBF8F4]'
                      "
                      [disabled]="loading()"
                      (click)="goToPage(+$any(p))"
                    >
                      {{ p }}
                    </button>
                  }
                }
                <button
                  type="button"
                  class="inline-flex min-h-8 items-center gap-1 rounded-lg border border-[#E8D5BE] bg-white px-2.5 text-xs font-bold text-[#181A1D] hover:bg-[#FBF8F4] disabled:opacity-40 transition-colors cursor-pointer"
                  [disabled]="page() >= totalPages() || loading()"
                  (click)="goToPage(page() + 1)"
                >
                  {{ 'matchReview.pageNext' | t }}
                  <i class="pi pi-chevron-left text-[10px]" [class.rotate-180]="!locale.isRtl()"></i>
                </button>
              </div>
            }
          </div>

          <!-- Bounded Detail Sidebar with Pinned Action Buttons -->
          <aside class="flex flex-col rounded-2xl border border-[#E8D5BE] bg-white p-3.5 max-h-[calc(100vh-14rem)] min-h-[460px] overflow-hidden shadow-xs">
            @if (detail(); as d) {
              <!-- Scrollable Cards & Group Details -->
              <div class="flex-1 overflow-y-auto space-y-3 pe-1 min-h-0">
                <!-- Listing Card -->
                <div>
                  <div class="flex items-center justify-between">
                    <h2 class="text-[11px] font-bold text-[#A68B6D] uppercase tracking-wider">{{ 'matchReview.listing' | t }}</h2>
                    <span class="rounded bg-[#F8EEE2] px-2 py-0.5 text-[10px] font-bold text-[#C27938]">{{ d.listing.pharmacyName }}</span>
                  </div>
                  <ng-container *ngTemplateOutlet="cardTpl; context: { $implicit: d.listing }"></ng-container>
                </div>

                <!-- Linked Master / Candidate Card -->
                <div>
                  @if (selectedMode() === 'auto_98_99') {
                    <div class="flex items-center justify-between">
                      <h2 class="text-[11px] font-extrabold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                        <i class="pi pi-check-circle text-emerald-600"></i>
                        {{ 'matchReview.linkedMaster' | t }}
                      </h2>
                      <span class="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-black">مربوط بالماستر</span>
                    </div>

                    @if (d.masterTitle) {
                      <div class="mt-1.5 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50/60 border border-emerald-200 p-2.5 shadow-2xs">
                        <div class="text-[10px] font-bold text-emerald-700">اسم عائلة الكتالوج (Master Family)</div>
                        <div class="text-xs font-black text-[#181A1D] mt-0.5 leading-snug">{{ d.masterTitle }}</div>
                        @if (d.familyKey) {
                          <div class="text-[10px] font-mono text-emerald-800 mt-1 truncate">{{ 'matchReview.familyKey' | t }}: {{ d.familyKey }}</div>
                        }
                      </div>
                    }

                    @if (d.candidate) {
                      <ng-container *ngTemplateOutlet="cardTpl; context: { $implicit: d.candidate }"></ng-container>
                    }
                  } @else {
                    @if (d.candidate) {
                      <div>
                        <h2 class="text-[11px] font-bold text-[#C27938] uppercase tracking-wider">{{ 'matchReview.candidate' | t }}</h2>
                        <ng-container *ngTemplateOutlet="cardTpl; context: { $implicit: d.candidate }"></ng-container>
                      </div>
                    }
                  }
                </div>

                <!-- Group Members -->
                @if (d.groupMembers.length > 0) {
                  <div>
                    <div class="flex items-center justify-between">
                      <h2 class="text-[11px] font-bold text-[#A68B6D] uppercase tracking-wider">
                        {{ 'matchReview.group' | t }} ({{ d.groupMembers.length }})
                      </h2>
                      <span class="text-[10px] font-bold text-[#C27938]">{{ groupCount() }} صيدليات</span>
                    </div>
                    <div class="mt-1 space-y-1.5 max-h-36 overflow-y-auto">
                      @for (member of d.groupMembers; track member.pharmacyProductId) {
                        <div
                          class="rounded-xl p-2 text-xs border flex items-center justify-between gap-2"
                          [class.bg-emerald-50/50]="member.pharmacyProductId === d.listing.pharmacyProductId"
                          [class.border-emerald-300]="member.pharmacyProductId === d.listing.pharmacyProductId"
                          [class.bg-[#FBF8F4]]="member.pharmacyProductId !== d.listing.pharmacyProductId"
                          [class.border-[#EDE0D0]]="member.pharmacyProductId !== d.listing.pharmacyProductId"
                        >
                          <div class="min-w-0 flex-1">
                            <div class="font-medium text-[#181A1D] truncate">{{ member.name }}</div>
                            <div class="text-[10px] text-[#8A735C] flex items-center gap-1.5 mt-0.5">
                              <span class="font-bold text-[#A68B6D]">{{ member.pharmacyName || member.pharmacyCode }}</span>
                              @if (member.pharmacyProductId === d.listing.pharmacyProductId) {
                                <span class="rounded bg-emerald-100 text-emerald-800 px-1 text-[9px] font-extrabold">العرض الحالي</span>
                              }
                            </div>
                          </div>
                          @if (member.price != null) {
                            <div class="text-xs font-black text-[#181A1D] shrink-0 tabular-nums">
                              {{ member.price | number: '1.2-2' }} <span class="text-[9px] font-normal text-[#8A735C]">SAR</span>
                            </div>
                          }
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>

              <!-- Pinned Actions Container -->
              <div class="shrink-0 pt-2.5 border-t border-[#EDE0D0] flex flex-col gap-2 bg-white">
                @if (selectedMode() === 'auto_98_99') {
                  <!-- Unlink Button for Auto-Linked items -->
                  <button
                    type="button"
                    class="min-h-10 w-full rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-2xs"
                    (click)="unlink(d.queueItem)"
                  >
                    <i class="pi pi-unlink text-sm"></i>
                    <span>{{ 'matchReview.unlink' | t }}</span>
                  </button>

                  <!-- Reassign / Change Master -->
                  <div class="flex items-center gap-1.5 pt-0.5">
                    <input
                      class="min-h-9 flex-1 rounded-xl border border-[#E8D5BE] bg-[#FBF8F4] px-2.5 text-xs font-mono"
                      [value]="forceMasterId()"
                      (input)="forceMasterId.set($any($event.target).value)"
                      [placeholder]="'matchReview.reassignMaster' | t"
                    />
                    <button
                      type="button"
                      class="min-h-9 shrink-0 rounded-xl bg-[#181A1D] hover:bg-black px-3 text-xs font-bold text-white transition-colors cursor-pointer"
                      (click)="forceMatch(d.queueItem)"
                    >
                      {{ 'matchReview.reassign' | t }}
                    </button>
                  </div>
                } @else {
                  <input
                    class="min-h-9 rounded-xl border border-[#E8D5BE] px-3 text-xs font-mono"
                    [value]="forceMasterId()"
                    (input)="forceMasterId.set($any($event.target).value)"
                    [attr.placeholder]="'matchReview.masterId' | t"
                  />
                  <div class="flex gap-2">
                    <button
                      type="button"
                      class="min-h-10 flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                      (click)="accept(d.queueItem)"
                    >
                      <i class="pi pi-check text-xs"></i>
                      {{ 'matchReview.acceptMatch' | t }}
                    </button>
                    <button
                      type="button"
                      class="min-h-10 flex-1 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                      (click)="reject(d.queueItem)"
                    >
                      <i class="pi pi-times text-xs"></i>
                      {{ 'matchReview.rejectMatch' | t }}
                    </button>
                  </div>
                  <button
                    type="button"
                    class="min-h-9 rounded-xl border border-[#E8D5BE] text-xs font-bold text-[#8A735C] hover:text-[#181A1D] hover:bg-[#FBF8F4] transition-colors"
                    (click)="forceMatch(d.queueItem)"
                  >
                    {{ 'matchReview.forceMatch' | t }}
                  </button>
                }
              </div>
            } @else {
              <p class="text-sm text-[#8A735C] py-8 text-center">{{ 'matchReview.empty' | t }}</p>
            }
          </aside>
        </div>
      }
    </section>

    <ng-template #cardTpl let-card>
      <article class="mt-1.5 rounded-xl border border-[#EDE0D0] p-2.5 bg-white shadow-xs">
        <div class="mb-1.5 h-28 w-full rounded-lg overflow-hidden bg-[#FBF8F4] border border-[#EDE0D0] flex items-center justify-center relative">
          @if (card.imageUrl) {
            <img
              #imgEl
              [src]="card.imageUrl | proxyImg"
              [alt]="card.name"
              loading="lazy"
              class="size-full object-contain p-1.5 relative z-10 transition-opacity duration-200"
              [class.opacity-0]="imgEl.dataset['failed'] === 'true'"
              (load)="imgEl.dataset['failed'] = 'false'"
              (error)="imgEl.dataset['failed'] = 'true'"
            />
          }
          <div class="absolute inset-0 flex flex-col items-center justify-center text-[#C27938]/40 gap-1 p-2 text-center pointer-events-none">
            <i class="pi pi-image text-xl" aria-hidden="true"></i>
            <span class="text-[10px] font-semibold text-[#A68B6D]">
              {{ card.imageUrl ? (card.pharmacyCode === 'aldawaa' ? 'صورة الدواء غير متاحة خارجياً' : 'تعذر تحميل الصورة') : 'لا توجد صورة' }}
            </span>
          </div>
        </div>
        <div class="font-semibold text-xs sm:text-sm text-[#181A1D] leading-snug line-clamp-2">{{ card.name }}</div>
        @if (card.englishName) {
          <div class="text-[11px] text-[#8A735C] mt-0.5 truncate">{{ card.englishName }}</div>
        }
        <div class="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-[#8A735C]">
          <span 
            class="rounded px-1.5 py-0.5 font-bold text-[10px] sm:text-[11px]"
            [class.bg-emerald-100]="card.pharmacyCode === 'master'"
            [class.text-emerald-800]="card.pharmacyCode === 'master'"
            [class.bg-[#F8EEE2]]="card.pharmacyCode !== 'master'"
            [class.text-[#C27938]]="card.pharmacyCode !== 'master'"
          >
            {{ card.pharmacyCode === 'master' ? 'كتالوج المنصة الرئيسي' : card.pharmacyName }}
          </span>
          @if (card.barcode || card.gtinNorm) {
            <span class="rounded bg-[#FBF8F4] px-1.5 py-0.5 border border-[#EDE0D0] font-mono text-[10px]">{{ card.gtinNorm || card.barcode }}</span>
          }
          @if (card.brandName) {
            <span class="rounded bg-[#FBF8F4] px-1.5 py-0.5 border border-[#EDE0D0] text-[10px] sm:text-[11px]">{{ card.brandName }}</span>
          }
        </div>
        @if (card.price != null) {
          <div class="mt-1.5 text-sm font-extrabold text-[#181A1D] tabular-nums">{{ card.price | number: '1.2-2' }} <span class="text-[10px] font-medium text-[#8A735C]">SAR</span></div>
        }
      </article>
    </ng-template>
  `,
  styles: `
    .bg-review-selected { background: #F8EEE2; }
    /* Slim sleek scrollbars */
    ::-webkit-scrollbar {
      width: 5px;
      height: 5px;
    }
    ::-webkit-scrollbar-track {
      background: transparent;
    }
    ::-webkit-scrollbar-thumb {
      background: #E8D5BE;
      border-radius: 9999px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: #C27938;
    }
  `
})
export class MatchReviewComponent implements OnInit {
  readonly isEmbedded = input<boolean>(false);
  readonly initialMode = input<'auto_98_99' | 'review'>('auto_98_99');

  readonly locale = inject(LocaleService);
  private readonly i18n = inject(I18nService);
  private readonly repo = inject(MatchReviewRepository);
  private readonly notify = inject(NotificationService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly route = inject(ActivatedRoute, { optional: true });

  readonly pharmacies = PHARMACY_BRANDS;

  readonly selectedMode = signal<'auto_98_99' | 'review'>('auto_98_99');
  readonly autoMatchesCount = signal<number>(2312);
  readonly reviewQueueCount = signal<number>(3712);

  readonly items = signal<MatchReviewQueueItem[]>([]);
  readonly queueDepth = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly totalPages = signal(1);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly searchFilter = signal('');
  readonly pharmacyFilter = signal('');
  readonly methodFilter = signal('');
  readonly reasonFilter = signal('');
  readonly minScore = signal('');
  readonly minAgeHours = signal('');
  readonly forceMasterId = signal('');
  readonly selected = signal<MatchReviewQueueItem | null>(null);
  readonly detail = signal<MatchReviewDetail | null>(null);
  readonly selectedIds = signal(new Set<string>());

  readonly groupCount = computed(() => distinctPharmacyCount(this.detail()?.groupMembers ?? []));
  readonly rangeStart = computed(() =>
    this.queueDepth() === 0 ? 0 : (this.page() - 1) * this.pageSize() + 1
  );
  readonly rangeEnd = computed(() =>
    Math.min(this.page() * this.pageSize(), this.queueDepth())
  );
  readonly pageButtons = computed(() => this.buildPageButtons(this.page(), this.totalPages()));

  ngOnInit(): void {
    const routeMode = this.route?.snapshot?.queryParamMap?.get('mode');
    if (routeMode === 'review' || routeMode === 'auto_98_99') {
      this.selectedMode.set(routeMode);
    } else if (this.initialMode()) {
      this.selectedMode.set(this.initialMode());
    }

    this.reload();
    this.fetchCounts();
  }

  switchMode(mode: 'auto_98_99' | 'review'): void {
    if (this.selectedMode() === mode) return;
    this.selectedMode.set(mode);
    this.page.set(1);
    this.selectedIds.set(new Set());
    this.reload();
  }

  fetchCounts(): void {
    this.repo.listQueue({ take: 1, mode: 'auto_98_99' }).subscribe({
      next: (res) => this.autoMatchesCount.set(res.queueDepth)
    });
    this.repo.listQueue({ take: 1 }).subscribe({
      next: (res) => this.reviewQueueCount.set(res.queueDepth)
    });
  }

  onFilterChange(): void {
    this.page.set(1);
    this.reload();
  }

  goToPage(targetPage: number): void {
    const target = Math.min(Math.max(1, targetPage), this.totalPages());
    if (target === this.page() || this.loading()) return;
    this.page.set(target);
    this.reload();
  }

  setPageSize(size: number): void {
    if (this.pageSize() === size) return;
    this.pageSize.set(size);
    this.page.set(1);
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(false);
    this.repo
      .listQueue({
        page: this.page(),
        take: this.pageSize(),
        pharmacyCode: this.pharmacyFilter() || null,
        method: this.methodFilter() || null,
        reason: this.reasonFilter() || null,
        search: this.searchFilter() || null,
        minScore: this.minScore() ? Number(this.minScore()) : null,
        minAgeHours: this.minAgeHours() ? Number(this.minAgeHours()) : null,
        mode: this.selectedMode()
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (page) => {
          this.items.set(page.items);
          this.queueDepth.set(page.queueDepth);
          if (this.selectedMode() === 'auto_98_99') {
            this.autoMatchesCount.set(page.queueDepth);
          } else {
            this.reviewQueueCount.set(page.queueDepth);
          }
          this.totalPages.set(page.totalPages ?? 1);
          if (page.page) this.page.set(page.page);
          if (page.items[0]) {
            this.open(page.items[0]);
          } else {
            this.selected.set(null);
            this.detail.set(null);
          }
        },
        error: () => this.error.set(true)
      });
  }

  private buildPageButtons(current: number, total: number): (number | string)[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = new Set<number>([1, total, current, current - 1, current + 1, 2, total - 1]);
    const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
    const result: (number | string)[] = [];
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push('…');
      result.push(sorted[i]);
    }
    return result;
  }

  open(row: MatchReviewQueueItem): void {
    this.selected.set(row);
    this.repo.getDetail(row.matchId).subscribe({
      next: (detail) => this.detail.set(detail),
      error: () => this.notify.showError(this.i18n.t('matchReview.error'))
    });
  }

  toggle(id: string): void {
    const next = new Set(this.selectedIds());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.selectedIds.set(next);
  }

  async accept(row: MatchReviewQueueItem): Promise<void> {
    if (!canAccept(row) && !row.proposedMasterProductId) {
      this.notify.showError(this.i18n.t('matchReview.needsMaster'));
      return;
    }
    const confirmed = await this.confirmDialog.confirm({
      title: this.i18n.t('matchReview.accept'),
      message: this.i18n.t('matchReview.confirmAccept'),
      type: 'info',
      confirmText: this.i18n.t('matchReview.accept'),
    });
    if (!confirmed) return;
    this.repo.accept(row.matchId, row.proposedMasterProductId).subscribe({
      next: (result) => this.afterAction(result),
      error: () => this.notify.showError(this.i18n.t('matchReview.stale'))
    });
  }

  async reject(row: MatchReviewQueueItem): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: this.i18n.t('matchReview.reject'),
      message: this.i18n.t('matchReview.confirmReject'),
      type: 'danger',
      confirmText: this.i18n.t('matchReview.reject'),
    });
    if (!confirmed) return;
    this.repo.reject(row.matchId).subscribe({
      next: (result) => this.afterAction(result),
      error: () => this.notify.showError(this.i18n.t('matchReview.stale'))
    });
  }

  async unlink(row: MatchReviewQueueItem): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: this.i18n.t('matchReview.unlink'),
      message: this.i18n.t('matchReview.confirmUnlink'),
      type: 'danger',
      confirmText: this.i18n.t('matchReview.unlink'),
    });
    if (!confirmed) return;
    this.repo.reject(row.matchId, 'Unlinked by admin from catalog').subscribe({
      next: (result) => this.afterAction(result),
      error: () => this.notify.showError(this.i18n.t('matchReview.stale'))
    });
  }

  async forceMatch(row: MatchReviewQueueItem): Promise<void> {
    const masterId = this.forceMasterId().trim() || row.proposedMasterProductId;
    if (!masterId) {
      this.notify.showError(this.i18n.t('matchReview.needsMaster'));
      return;
    }
    const confirmed = await this.confirmDialog.confirm({
      title: this.i18n.t('matchReview.forceMatch'),
      message: this.i18n.t('matchReview.confirmForce'),
      type: 'warning',
      confirmText: this.i18n.t('matchReview.forceMatch'),
    });
    if (!confirmed) return;
    this.repo.forceMatch(row.matchId, masterId).subscribe({
      next: (result) => this.afterAction(result),
      error: () => this.notify.showError(this.i18n.t('matchReview.stale'))
    });
  }

  bulk(action: 'accept' | 'reject'): void {
    const ids = [...this.selectedIds()];
    if (!ids.length) return;
    const items = this.items()
      .filter((row) => ids.includes(row.matchId))
      .map((row) => ({ matchId: row.matchId, action, masterProductId: row.proposedMasterProductId }));
    this.repo.bulk(items).subscribe({
      next: (results) => {
        const failed = results.filter((r) => !r.ok).length;
        this.notify.showSuccess(`${results.length - failed} ok / ${failed} failed`);
        this.selectedIds.set(new Set());
        this.reload();
        this.fetchCounts();
      },
      error: () => this.notify.showError(this.i18n.t('matchReview.error'))
    });
  }

  async bulkUnlink(): Promise<void> {
    const ids = [...this.selectedIds()];
    if (!ids.length) return;
    const confirmed = await this.confirmDialog.confirm({
      title: this.i18n.t('matchReview.unlink'),
      message: `${this.i18n.t('matchReview.confirmUnlink')} (${ids.length})`,
      type: 'danger',
      confirmText: this.i18n.t('matchReview.unlink'),
    });
    if (!confirmed) return;
    const items = this.items()
      .filter((row) => ids.includes(row.matchId))
      .map((row) => ({ matchId: row.matchId, action: 'reject' as const }));
    this.repo.bulk(items).subscribe({
      next: (results) => {
        const failed = results.filter((r) => !r.ok).length;
        this.notify.showSuccess(`${results.length - failed} ok / ${failed} failed`);
        this.selectedIds.set(new Set());
        this.reload();
        this.fetchCounts();
      },
      error: () => this.notify.showError(this.i18n.t('matchReview.error'))
    });
  }

  private afterAction(result: MatchReviewActionResult): void {
    if (!result.ok) {
      this.notify.showError(result.message || this.i18n.t('matchReview.stale'));
      return;
    }
    this.notify.showSuccess(result.message);
    this.reload();
    this.fetchCounts();
  }
}
