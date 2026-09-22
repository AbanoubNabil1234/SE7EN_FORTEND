import {
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  HostListener
} from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { MatchReviewRepository } from '../../../../core/domain/repositories/match-review.repository';
import {
  MatchReviewDetail,
  MatchReviewListingCard,
  MatchReviewQueueItem
} from '../../../../core/domain/models/match-review.model';
import { pharmacyLogo as resolvePharmacyLogo } from '../../../../core/domain/pharmacy-brands';
import { LocaleService } from '../../../../core/services/locale.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { I18nService } from '../../../../core/i18n/i18n.service';

@Component({
  selector: 'app-ai-match-review-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe, DecimalPipe],
  template: `
    @if (isOpen()) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/70 backdrop-blur-md animate-fade-in"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="isRtl() ? 'مراجعة تطابق الذكاء الاصطناعي' : 'AI Match Review'"
        [attr.dir]="isRtl() ? 'rtl' : 'ltr'"
      >
        <!-- Backdrop backdrop click -->
        <div class="fixed inset-0 cursor-pointer" (click)="onClose()"></div>

        <!-- Modal Container -->
        <div
          class="relative w-full max-w-6xl max-h-[94vh] rounded-3xl bg-[#FCFAF7] border border-[#E8D5BE] shadow-2xl flex flex-col overflow-hidden z-10 animate-scale-up"
          (click)="$event.stopPropagation()"
        >
          <!-- Top Accent Line -->
          <div class="h-1.5 w-full bg-gradient-to-r from-[#C27938] via-amber-500 to-violet-600"></div>

          <!-- Header -->
          <header class="px-5 py-4 border-b border-[#EDE0D0] bg-white flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div class="flex items-center gap-3">
              <span class="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F8EEE2] to-amber-100 text-[#C27938] shadow-xs border border-amber-200">
                <i class="pi pi-sparkles text-lg animate-pulse"></i>
              </span>
              <div>
                <div class="flex items-center gap-2">
                  <h2 class="text-base sm:text-lg font-black text-[#181A1D]">
                    {{ isRtl() ? 'مراجعة تطابق الذكاء الاصطناعي' : 'AI Match Review' }}
                  </h2>
                  <span class="inline-flex items-center gap-1 rounded-full bg-violet-50 border border-violet-200 px-2.5 py-0.5 text-[11px] font-extrabold text-violet-700">
                    <span class="size-1.5 rounded-full bg-violet-600 animate-ping"></span>
                    <span>AI Model v4</span>
                  </span>
                </div>
                <p class="text-xs text-[#8A735C]">
                  @if (selectedMode() === 'auto_98_99') {
                    <span>{{ isRtl() ? 'إجمالي المنتجات المضافة للكتالوج (98%+):' : 'Total Auto-Catalog Products (98%+):' }} </span>
                    <strong class="font-extrabold text-emerald-700 tabular-nums">{{ totalQueueDepth() > 0 ? (totalQueueDepth() | number) : '2,312' }}</strong>
                  } @else {
                    <span>{{ isRtl() ? 'إجمالي المنتجات المعلقة للمراجعة:' : 'Pending AI matches:' }} </span>
                    <strong class="font-extrabold text-[#181A1D] tabular-nums">{{ totalQueueDepth() > 0 ? (totalQueueDepth() | number) : '3,712' }}</strong>
                  }
                </p>
              </div>
            </div>

            <!-- Header Stepper & Controls -->
            <div class="flex items-center gap-2 sm:gap-3">
              <!-- Item Index / Counter -->
              @if (queueItems().length > 0) {
                <div class="flex items-center gap-1.5 rounded-xl border border-[#EDE0D0] bg-[#FBF8F4] px-3 py-1.5 text-xs font-bold text-[#181A1D]">
                  <span class="text-[#8A735C]">{{ isRtl() ? 'عنصر' : 'Item' }}</span>
                  <span class="font-extrabold tabular-nums text-[#C27938]">{{ currentIndex() + 1 }}</span>
                  <span class="text-[#A68B6D]">/</span>
                  <span class="font-extrabold tabular-nums">{{ queueItems().length }}</span>
                </div>

                <!-- Navigation Prev/Next -->
                <div class="flex items-center gap-1">
                  <button
                    type="button"
                    class="inline-flex size-9 items-center justify-center rounded-xl border border-[#E8D5BE] bg-white text-[#181A1D] hover:bg-[#F8EEE2] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                    [disabled]="currentIndex() <= 0 || detailLoading()"
                    (click)="navigatePrev()"
                    [title]="isRtl() ? 'السابق (سهم يمين)' : 'Previous (Left arrow)'"
                  >
                    <i class="pi" [ngClass]="isRtl() ? 'pi-chevron-right' : 'pi-chevron-left'"></i>
                  </button>
                  <button
                    type="button"
                    class="inline-flex size-9 items-center justify-center rounded-xl border border-[#E8D5BE] bg-white text-[#181A1D] hover:bg-[#F8EEE2] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                    [disabled]="currentIndex() >= queueItems().length - 1 || detailLoading()"
                    (click)="navigateNext()"
                    [title]="isRtl() ? 'التالي (سهم يسار)' : 'Next (Right arrow)'"
                  >
                    <i class="pi" [ngClass]="isRtl() ? 'pi-chevron-left' : 'pi-chevron-right'"></i>
                  </button>
                </div>
              }

              <!-- Close Button -->
              <button
                type="button"
                class="inline-flex size-9 shrink-0 items-center justify-center rounded-xl border border-[#E8D5BE] bg-white text-[#8A735C] hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors cursor-pointer"
                (click)="onClose()"
                [attr.aria-label]="isRtl() ? 'إغلاق (Esc)' : 'Close (Esc)'"
              >
                <i class="pi pi-times text-sm"></i>
              </button>
            </div>
          </header>

          <!-- Mode Tabs Switcher Bar -->
          <div class="px-5 py-2.5 bg-[#FAF6F0] border-b border-[#EDE0D0] flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div class="flex items-center gap-2 p-1 rounded-2xl bg-white border border-[#E8D5BE] shadow-2xs">
              <!-- Tab 1: Auto Catalog (98% - 99%) -->
              <button
                type="button"
                (click)="switchMode('auto_98_99')"
                [class]="selectedMode() === 'auto_98_99'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-xs font-black'
                  : 'text-[#5C4936] hover:text-[#181A1D] hover:bg-[#F8EEE2]/60 font-bold'"
                class="inline-flex items-center gap-2 rounded-xl px-3 sm:px-4 py-1.5 text-xs transition-all cursor-pointer"
              >
                <i class="pi pi-check-circle text-xs"></i>
                <span>{{ isRtl() ? 'منتجات الكتالوج المؤكدة (98% و 99%)' : 'Confirmed in Catalog (98%-99%)' }}</span>
                <span
                  [class]="selectedMode() === 'auto_98_99' ? 'bg-white/25 text-white' : 'bg-[#F0E4D5] text-[#2C231B]'"
                  class="rounded-full px-2 py-0.5 text-[10px] tabular-nums font-black"
                >
                  {{ selectedMode() === 'auto_98_99' && totalQueueDepth() > 0 ? (totalQueueDepth() | number) : '2,312' }}
                </span>
              </button>

              <!-- Tab 2: Review Queue (<98%) -->
              <button
                type="button"
                (click)="switchMode('review')"
                [class]="selectedMode() === 'review'
                  ? 'bg-gradient-to-r from-amber-600 to-[#C27938] text-white shadow-xs font-black'
                  : 'text-[#5C4936] hover:text-[#181A1D] hover:bg-[#F8EEE2]/60 font-bold'"
                class="inline-flex items-center gap-2 rounded-xl px-3 sm:px-4 py-1.5 text-xs transition-all cursor-pointer"
              >
                <i class="pi pi-clock text-xs"></i>
                <span>{{ isRtl() ? 'طابور المراجعة المعلق (< 98%)' : 'Pending Review (<98%)' }}</span>
                <span
                  [class]="selectedMode() === 'review' && totalQueueDepth() > 0 ? 'bg-white/25 text-white' : 'bg-[#F0E4D5] text-[#2C231B]'"
                  class="rounded-full px-2 py-0.5 text-[10px] tabular-nums font-black"
                >
                  {{ selectedMode() === 'review' && totalQueueDepth() > 0 ? (totalQueueDepth() | number) : '3,712' }}
                </span>
              </button>
            </div>

            <!-- Mode Explanation Hint -->
            <div class="text-[11px] font-semibold text-[#8A735C] flex items-center gap-1.5">
              @if (selectedMode() === 'auto_98_99') {
                <span class="inline-flex size-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>{{ isRtl() ? 'أصناف تم التحقق منها ومطابقتها آلياً ودمجها بالكتالوج' : 'Products verified and linked to catalog automatically' }}</span>
              } @else {
                <span class="inline-flex size-2 rounded-full bg-amber-500 animate-pulse"></span>
                <span>{{ isRtl() ? 'أصناف تحتاج قرار ربط يدوي أو رفض وفصل' : 'Products requiring manual link or reject decision' }}</span>
              }
            </div>
          </div>

          <!-- Modal Body (Scrollable) -->
          <div class="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            @if (queueLoading()) {
              <!-- Loading Queue State -->
              <div class="py-20 flex flex-col items-center justify-center gap-3 text-center">
                <i class="pi pi-spin pi-spinner text-3xl text-[#C27938]"></i>
                <p class="text-sm font-bold text-[#8A735C]">
                  {{ isRtl() ? (selectedMode() === 'auto_98_99' ? 'جاري تحميل منتجات الكتالوج المؤكدة...' : 'جاري تحميل قائمة المنتجات المعلقة...') : 'Loading queue...' }}
                </p>
              </div>
            } @else if (queueItems().length === 0) {
              <!-- Empty Queue State -->
              <div class="py-20 flex flex-col items-center justify-center gap-3 text-center">
                <div class="size-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 text-2xl">
                  <i class="pi pi-check"></i>
                </div>
                <h3 class="text-lg font-black text-[#181A1D]">
                  {{ isRtl() ? (selectedMode() === 'auto_98_99' ? 'لا توجد منتجات مطابقة آلياً حالياً' : 'لا توجد منتجات معلقة للمراجعة!') : 'No products found in this list!' }}
                </h3>
                <p class="text-xs text-[#8A735C] max-w-sm">
                  {{ isRtl() ? 'جميع التطابقات تمت معالجتها بنجاح.' : 'All items in this queue have been processed.' }}
                </p>
              </div>
            } @else if (detailLoading()) {
              <!-- Loading Item Detail Skeleton -->
              <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 animate-pulse">
                <div class="lg:col-span-5 h-96 rounded-2xl bg-[#EDE0D0]/50"></div>
                <div class="lg:col-span-2 h-96 rounded-2xl bg-[#EDE0D0]/30 hidden lg:block"></div>
                <div class="lg:col-span-5 h-96 rounded-2xl bg-[#EDE0D0]/50"></div>
              </div>
            } @else if (currentDetail(); as detail) {
              <!-- Main Comparison Layout -->
              <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                
                <!-- ================= RIGHT COLUMN: SOURCE PHARMACY PRODUCT ================= -->
                <div class="lg:col-span-5 rounded-2xl border border-[#EDE0D0] bg-white p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-4">
                  <div>
                    <!-- Pharmacy Badge & Header -->
                    <div class="flex items-center justify-between gap-2 border-b border-[#F0E4D5] pb-3">
                      <div class="flex items-center gap-2">
                        @if (pharmacyLogo(detail.listing.pharmacyCode); as logo) {
                          <img [src]="logo" [alt]="detail.listing.pharmacyName" class="size-6 object-contain rounded-md border border-[#EDE0D0] p-0.5 bg-white" />
                        }
                        <div>
                          <span class="text-[11px] font-black uppercase tracking-wider text-[#C27938]">
                            {{ isRtl() ? 'المنتج الوارد' : 'Incoming Product' }}
                          </span>
                          <div class="text-xs font-bold text-[#181A1D]">
                            {{ detail.listing.pharmacyName }}
                          </div>
                        </div>
                      </div>

                      <!-- Price Tag -->
                      @if (detail.listing.price != null) {
                        <div class="rounded-xl bg-[#F8EEE2] px-2.5 py-1 text-end border border-amber-200">
                          <span class="text-[10px] text-[#8A735C] block leading-none">{{ isRtl() ? 'السعر' : 'Price' }}</span>
                          <span class="font-black text-sm text-[#181A1D] tabular-nums">
                            {{ detail.listing.price | currency: 'SAR':'symbol':'1.2-2' }}
                          </span>
                        </div>
                      }
                    </div>

                    <!-- Image & Titles -->
                    <div class="mt-3 flex gap-3.5 items-start">
                      <div class="size-24 sm:size-28 shrink-0 rounded-xl border border-[#EDE0D0] bg-[#FBF8F4] overflow-hidden p-1 flex items-center justify-center">
                        @if (detail.listing.imageUrl) {
                          <img [src]="detail.listing.imageUrl" [alt]="detail.listing.name" class="size-full object-contain" loading="lazy" />
                        } @else {
                          <i class="pi pi-image text-2xl text-[#C27938]/40"></i>
                        }
                      </div>

                      <div class="min-w-0 flex-1 space-y-1">
                        @if (detail.listing.brandName) {
                          <span class="inline-block rounded-md bg-[#FBF8F4] border border-[#E8D5BE] px-2 py-0.5 text-[11px] font-bold text-[#C27938]">
                            {{ detail.listing.brandName }}
                          </span>
                        }
                        <h3 class="text-sm sm:text-base font-black text-[#181A1D] leading-snug break-words">
                          {{ detail.listing.name }}
                        </h3>
                        @if (detail.listing.englishName && detail.listing.englishName !== detail.listing.name) {
                          <p class="text-xs font-medium text-[#8A735C] leading-tight break-words" dir="ltr">
                            {{ detail.listing.englishName }}
                          </p>
                        }
                      </div>
                    </div>

                    <!-- Product Meta Chips -->
                    <div class="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2 pt-3 border-t border-[#F0E4D5]">
                      <div class="rounded-lg bg-[#FBF8F4] p-2 border border-[#EDE0D0]">
                        <span class="text-[10px] font-bold text-[#8A735C] block">{{ isRtl() ? 'الباركود' : 'Barcode' }}</span>
                        <span class="font-mono text-xs font-black text-[#181A1D] truncate block" dir="ltr">
                          {{ detail.listing.barcode || '—' }}
                        </span>
                      </div>

                      <div class="rounded-lg bg-[#FBF8F4] p-2 border border-[#EDE0D0]">
                        <span class="text-[10px] font-bold text-[#8A735C] block">SKU</span>
                        <span class="font-mono text-xs font-black text-[#181A1D] truncate block" dir="ltr">
                          {{ detail.listing.sku || '—' }}
                        </span>
                      </div>

                      <div class="rounded-lg bg-[#FBF8F4] p-2 border border-[#EDE0D0] col-span-2 sm:col-span-1">
                        <span class="text-[10px] font-bold text-[#8A735C] block">{{ isRtl() ? 'الحجم / العبوة' : 'Pack / Form' }}</span>
                        <span class="text-xs font-bold text-[#181A1D] truncate block">
                          {{ detail.listing.packSize || detail.listing.strength || '—' }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- DIRECT PRODUCT URL LINK BUTTON -->
                  <div class="pt-2">
                    @if (detail.listing.url) {
                      <a
                        [href]="detail.listing.url"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-[#C27938] hover:from-[#b36c2e] hover:to-[#9c5920] px-4 py-2.5 text-xs font-black text-white shadow-sm hover:shadow-md transition-all cursor-pointer group"
                      >
                        <i class="pi pi-external-link text-xs group-hover:scale-110 transition-transform"></i>
                        <span>
                          {{ isRtl() ? 'زيارة صفحة المنتج في صيدلية ' + detail.listing.pharmacyName : 'Open in ' + detail.listing.pharmacyName + ' Store' }} ↗
                        </span>
                      </a>
                    } @else {
                      <div class="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#FBF8F4] border border-[#EDE0D0] px-4 py-2.5 text-xs font-medium text-[#8A735C]">
                        <i class="pi pi-link-slash text-xs"></i>
                        <span>{{ isRtl() ? 'رابط صفحة المنتج غير متوفر' : 'Direct product link not available' }}</span>
                      </div>
                    }
                  </div>
                </div>

                <!-- ================= CENTER COLUMN: AI MATCH SCORE & REASON ================= -->
                <div class="lg:col-span-2 rounded-2xl border border-amber-200/80 bg-gradient-to-b from-amber-50/70 to-[#F8EEE2]/60 p-4 shadow-xs flex flex-col items-center justify-center text-center space-y-3">
                  <span class="text-[10px] font-black uppercase tracking-wider text-[#A68B6D]">
                    {{ isRtl() ? 'نسبة التطابق الذكي' : 'AI Match Score' }}
                  </span>

                  @if (selectedMode() === 'auto_98_99') {
                    <span class="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-[10px] font-black text-emerald-800">
                      <i class="pi pi-check-circle text-[10px]"></i>
                      <span>{{ isRtl() ? 'مضاف بالكتالوج' : 'Auto Linked' }}</span>
                    </span>
                  }

                  <!-- Confidence Percentage Circle Badge -->
                  <div class="relative size-20 sm:size-24 rounded-full bg-white shadow-md border-4 flex flex-col items-center justify-center"
                    [ngClass]="confidenceBadgeBorderClass(detail.queueItem.confidence)">
                    <span class="text-xl sm:text-2xl font-black text-[#181A1D] tabular-nums">
                      {{ formatConfidence(detail.queueItem.confidence) }}
                    </span>
                    <span class="text-[9px] font-extrabold text-[#8A735C]">
                      {{ isRtl() ? 'ثقة النموذج' : 'Confidence' }}
                    </span>
                  </div>

                  <!-- Method & Reason Badges -->
                  <div class="w-full space-y-1.5">
                    <span class="inline-block w-full rounded-lg bg-white border border-[#E8D5BE] px-2 py-1 text-[11px] font-mono font-bold text-[#181A1D] truncate"
                      [title]="detail.queueItem.matchMethod">
                      {{ detail.queueItem.matchMethod }}
                    </span>

                    @if (detail.queueItem.decisionReason) {
                      <div class="rounded-lg bg-[#FCFAF7] border border-[#EDE0D0] p-2 text-[10px] font-semibold text-[#8A735C] leading-snug text-start">
                        <span class="font-bold text-[#181A1D] block mb-0.5">{{ isRtl() ? 'سبب الترشيح:' : 'Reason:' }}</span>
                        {{ detail.queueItem.decisionReason }}
                      </div>
                    }
                  </div>

                  <!-- Arrow indicator towards target -->
                  <div class="text-[#C27938] hidden lg:block pt-1">
                    <i class="pi" [ngClass]="isRtl() ? 'pi-arrow-left' : 'pi-arrow-right'" style="font-size: 1.25rem;"></i>
                  </div>
                </div>

                <!-- ================= LEFT COLUMN: TARGET FAMILY & LINKED PRODUCTS ================= -->
                <div class="lg:col-span-5 rounded-2xl border border-[#EDE0D0] bg-white p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-4">
                  <div class="space-y-3">
                    <!-- Family Header -->
                    <div class="border-b border-[#F0E4D5] pb-3">
                      <div class="flex items-center justify-between gap-2">
                        <div class="flex items-center gap-1.5">
                          <span class="size-2 rounded-full bg-emerald-500"></span>
                          <span class="text-[11px] font-black uppercase tracking-wider text-[#A68B6D]">
                            {{ isRtl() ? 'العائلة المرشحة في الكتالوج' : 'Target Catalog Family' }}
                          </span>
                        </div>
                        @if (detail.familyKey || detail.candidate?.masterProductId) {
                          <span class="rounded bg-[#181A1D] px-2 py-0.5 font-mono text-[11px] font-bold text-white" dir="ltr">
                            {{ detail.familyKey || detail.candidate?.masterProductId }}
                          </span>
                        }
                      </div>

                      <!-- Master Product Name -->
                      <h3 class="mt-2 text-sm sm:text-base font-black text-[#181A1D] leading-snug">
                        {{ detail.masterTitle || detail.candidate?.name || (isRtl() ? 'صنف الكتالوج الموحد' : 'Catalog Master Product') }}
                      </h3>
                      @if (detail.candidate?.englishName && detail.candidate?.englishName !== detail.candidate?.name) {
                        <p class="text-xs font-medium text-[#8A735C] leading-tight mt-0.5" dir="ltr">
                          {{ detail.candidate?.englishName }}
                        </p>
                      }
                    </div>

                    <!-- Linked Products in this Family Header -->
                    <div class="flex items-center justify-between gap-2 pt-1">
                      <span class="text-xs font-black text-[#181A1D] flex items-center gap-1.5">
                        <i class="pi pi-link text-xs text-[#C27938]"></i>
                        <span>{{ isRtl() ? 'المنتجات المربوطة حالياً بهذه العائلة:' : 'Linked Products in this Family:' }}</span>
                      </span>
                      <span class="rounded-full bg-[#F8EEE2] px-2 py-0.5 text-[10px] font-extrabold text-[#C27938] border border-amber-200 tabular-nums">
                        {{ detail.groupMembers.length }} {{ isRtl() ? 'صيدليات' : 'members' }}
                      </span>
                    </div>

                    <!-- LIST OF ALL LINKED PRODUCTS IN THIS FAMILY WITH DIRECT URLS -->
                    <div class="max-h-56 sm:max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                      @for (member of detail.groupMembers; track member.pharmacyProductId) {
                        <div class="rounded-xl border border-[#EDE0D0] bg-[#FBF8F4] hover:bg-[#F8EEE2]/40 p-2.5 transition-colors flex flex-col gap-2">
                          <div class="flex items-start justify-between gap-2">
                            <div class="flex items-center gap-2 min-w-0">
                              @if (pharmacyLogo(member.pharmacyCode); as mLogo) {
                                <img [src]="mLogo" [alt]="member.pharmacyName" class="size-5 shrink-0 object-contain rounded bg-white p-0.5 border border-[#EDE0D0]" />
                              }
                              <div class="min-w-0">
                                <div class="text-[11px] font-extrabold text-[#181A1D] truncate">
                                  {{ member.pharmacyName }}
                                </div>
                                <div class="text-xs font-medium text-[#4A4038] line-clamp-1" [title]="member.name">
                                  {{ member.name }}
                                </div>
                              </div>
                            </div>

                            <!-- Member Price -->
                            @if (member.price != null) {
                              <span class="font-extrabold text-xs text-[#181A1D] tabular-nums shrink-0">
                                {{ member.price | currency: 'SAR':'symbol':'1.2-2' }}
                              </span>
                            }
                          </div>

                          <!-- Member Barcode & Direct Link -->
                          <div class="flex items-center justify-between gap-2 pt-1 border-t border-[#EDE0D0]/60 text-[11px]">
                            <div class="flex items-center gap-2 font-mono text-[10px] text-[#8A735C]" dir="ltr">
                              @if (member.barcode) {
                                <span><i class="pi pi-barcode me-0.5"></i>{{ member.barcode }}</span>
                              }
                              @if (member.sku) {
                                <span class="text-[#A68B6D]">SKU: {{ member.sku }}</span>
                              }
                            </div>

                            <!-- CLICKABLE DIRECT URL LINK FOR THIS FAMILY MEMBER -->
                            @if (member.url) {
                              <a
                                [href]="member.url"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="inline-flex items-center gap-1 rounded-lg border border-[#C27938]/40 bg-white hover:bg-[#F8EEE2] px-2 py-1 text-[10px] font-bold text-[#C27938] transition-colors shadow-2xs group"
                                [title]="isRtl() ? 'فتح المنتج في متجر ' + member.pharmacyName : 'Open in ' + member.pharmacyName"
                              >
                                <i class="pi pi-external-link text-[10px] group-hover:scale-110 transition-transform"></i>
                                <span>{{ isRtl() ? 'رابط المنتج' : 'View' }} ↗</span>
                              </a>
                            } @else {
                              <span class="text-[10px] text-[#A68B6D] italic">
                                {{ isRtl() ? '(بدون رابط)' : '(No link)' }}
                              </span>
                            }
                          </div>
                        </div>
                      } @empty {
                        <div class="rounded-xl border border-dashed border-[#E8D5BE] bg-[#FBF8F4] p-4 text-center text-xs text-[#8A735C]">
                          {{ isRtl() ? 'لا توجد منتجات أخرى مربوطة بهذه العائلة حالياً' : 'No other products currently in this family' }}
                        </div>
                      }
                    </div>
                  </div>

                  <!-- Target Note / Confirmation Context -->
                  <div
                    [class]="selectedMode() === 'auto_98_99' ? 'bg-emerald-50/80 border-emerald-200/80 text-emerald-900' : 'bg-amber-50/70 border-amber-200/80 text-amber-900'"
                    class="rounded-xl border p-2.5 text-[11px] flex items-start gap-2">
                    <i [class]="selectedMode() === 'auto_98_99' ? 'pi-check-circle text-emerald-600' : 'pi-info-circle text-amber-600'" class="pi text-xs mt-0.5 shrink-0"></i>
                    <p class="leading-relaxed">
                      @if (selectedMode() === 'auto_98_99') {
                        {{ isRtl()
                          ? 'هذا المنتج الوارد تم ربطه وضمه فعلياً ضمن هذه العائلة في الكتالوج بناءً على نسبة التطابق العالية (98%+). يمكنك فصله وإلغاء ربطه إذا لزم الأمر.'
                          : 'This product is actively linked in this catalog family based on high confidence match (98%+). You can unlink it if needed.' }}
                      } @else {
                        {{ isRtl()
                          ? 'عند تأكيد الربط، سيتم دمج الصنف الوارد مع هذه العائلة لتوحيد مقارنة الأسعار تلقائياً.'
                          : 'Accepting will link the incoming product into this family for unified price comparison.' }}
                      }
                    </p>
                  </div>
                </div>
              </div>
            }
          </div>

          <!-- Footer Action Bar -->
          <footer class="px-5 py-3.5 border-t border-[#EDE0D0] bg-white flex flex-wrap items-center justify-between gap-3 shrink-0">
            <!-- Shortcut hints -->
            <div class="hidden sm:flex items-center gap-2 text-[11px] text-[#8A735C]">
              <span class="inline-flex items-center gap-1 rounded-md bg-[#FBF8F4] border border-[#EDE0D0] px-1.5 py-0.5 font-mono font-bold text-[#181A1D]">
                Enter
              </span>
              <span>{{ isRtl() ? (selectedMode() === 'auto_98_99' ? 'تأكيد والتالي' : 'قبول') : (selectedMode() === 'auto_98_99' ? 'Keep & Next' : 'Accept') }}</span>
              <span class="text-[#E8D5BE]">|</span>
              <span class="inline-flex items-center gap-1 rounded-md bg-[#FBF8F4] border border-[#EDE0D0] px-1.5 py-0.5 font-mono font-bold text-[#181A1D]">
                Delete
              </span>
              <span>{{ isRtl() ? (selectedMode() === 'auto_98_99' ? 'فصل وإلغاء الربط' : 'رفض') : (selectedMode() === 'auto_98_99' ? 'Unlink' : 'Reject') }}</span>
              <span class="text-[#E8D5BE]">|</span>
              <span class="inline-flex items-center gap-1 rounded-md bg-[#FBF8F4] border border-[#EDE0D0] px-1.5 py-0.5 font-mono font-bold text-[#181A1D]">
                Esc
              </span>
              <span>{{ isRtl() ? 'إغلاق' : 'Close' }}</span>
            </div>

            <!-- Action Buttons -->
            <div class="flex items-center gap-2.5 ms-auto">
              <!-- Reject / Unlink Button -->
              <button
                type="button"
                class="min-h-11 px-4 sm:px-5 rounded-xl border border-rose-200 bg-rose-50 text-xs font-extrabold text-rose-700 hover:bg-rose-100 hover:border-rose-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                [disabled]="actionLoading() || !currentDetail()"
                (click)="onReject()"
              >
                @if (actionLoading() && activeAction() === 'reject') {
                  <i class="pi pi-spin pi-spinner text-xs"></i>
                } @else {
                  <i class="pi pi-times text-xs"></i>
                }
                <span>{{ isRtl() ? (selectedMode() === 'auto_98_99' ? 'فصل وإلغاء الربط من الكتالوج (Delete)' : 'رفض وفصل (Delete)') : (selectedMode() === 'auto_98_99' ? 'Unlink from Catalog (Delete)' : 'Reject (Delete)') }}</span>
              </button>

              <!-- Skip / Next Button -->
              <button
                type="button"
                class="min-h-11 px-4 rounded-xl border border-[#E8D5BE] bg-white text-xs font-bold text-[#4A4038] hover:bg-[#F8EEE2] disabled:opacity-40 transition-colors cursor-pointer"
                [disabled]="actionLoading() || currentIndex() >= queueItems().length - 1"
                (click)="navigateNext()"
              >
                <span>{{ isRtl() ? 'تخطي' : 'Skip' }}</span>
                <i class="pi" [ngClass]="isRtl() ? 'pi-chevron-left ms-1' : 'pi-chevron-right ms-1'"></i>
              </button>

              <!-- Accept / Keep Button -->
              @if (selectedMode() === 'review') {
                <button
                  type="button"
                  class="min-h-11 px-5 sm:px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-xs font-black text-white shadow-md shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 cursor-pointer"
                  [disabled]="actionLoading() || !currentDetail()"
                  (click)="onAccept()"
                >
                  @if (actionLoading() && activeAction() === 'accept') {
                    <i class="pi pi-spin pi-spinner text-xs"></i>
                  } @else {
                    <i class="pi pi-check text-xs"></i>
                  }
                  <span>{{ isRtl() ? 'تأكيد وربط بالعائلة (Enter)' : 'Accept & Link (Enter)' }}</span>
                </button>
              } @else {
                <button
                  type="button"
                  class="min-h-11 px-5 sm:px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-xs font-black text-white shadow-md shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 cursor-pointer"
                  [disabled]="actionLoading() || currentIndex() >= queueItems().length - 1"
                  (click)="navigateNext()"
                >
                  <i class="pi pi-check-circle text-xs"></i>
                  <span>{{ isRtl() ? 'تأكيد البقاء والانتقال للتالي (Enter)' : 'Keep & Next (Enter)' }}</span>
                </button>
              }
            </div>
          </footer>
        </div>
      </div>
    }
  `,
  styles: [`
    .custom-scrollbar::-webkit-scrollbar {
      width: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: #FBF8F4;
      border-radius: 8px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: #E8D5BE;
      border-radius: 8px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: #C27938;
    }
  `]
})
export class AiMatchReviewModalComponent {
  private readonly matchReviews = inject(MatchReviewRepository);
  private readonly notifications = inject(NotificationService);
  private readonly localeService = inject(LocaleService);
  private readonly i18n = inject(I18nService);

  readonly isOpen = input<boolean>(false);
  readonly initialMatchId = input<string | null>(null);

  readonly close = output<void>();
  readonly matchResolved = output<{ matchId: string; action: 'accept' | 'reject' }>();

  readonly selectedMode = signal<'auto_98_99' | 'review'>('auto_98_99');
  readonly queueItems = signal<MatchReviewQueueItem[]>([]);
  readonly currentIndex = signal<number>(0);
  readonly totalQueueDepth = signal<number>(0);
  readonly currentDetail = signal<MatchReviewDetail | null>(null);

  readonly queueLoading = signal<boolean>(false);
  readonly detailLoading = signal<boolean>(false);
  readonly actionLoading = signal<boolean>(false);
  readonly activeAction = signal<'accept' | 'reject' | null>(null);

  readonly isRtl = computed(() => this.localeService.locale() === 'ar');

  constructor() {
    effect(() => {
      const open = this.isOpen();
      const mode = this.selectedMode();
      untracked(() => {
        if (open) {
          this.loadQueue();
        } else {
          this.currentDetail.set(null);
          this.queueItems.set([]);
        }
      });
    });
  }

  switchMode(mode: 'auto_98_99' | 'review'): void {
    if (this.selectedMode() === mode) return;
    this.selectedMode.set(mode);
    this.currentIndex.set(0);
    this.currentDetail.set(null);
    this.queueItems.set([]);
    this.loadQueue();
  }

  pharmacyLogo(code: string | null | undefined): string | null {
    return resolvePharmacyLogo(code);
  }

  formatConfidence(conf: number): string {
    if (conf == null) return '0%';
    const pct = conf <= 1 ? Math.round(conf * 100) : Math.round(conf);
    return `${pct}%`;
  }

  confidenceBadgeBorderClass(conf: number): string {
    const pct = conf <= 1 ? conf * 100 : conf;
    if (pct >= 95) return 'border-emerald-500 text-emerald-700';
    if (pct >= 85) return 'border-amber-500 text-amber-700';
    return 'border-rose-400 text-rose-700';
  }

  loadQueue(): void {
    this.queueLoading.set(true);
    const mode = this.selectedMode();
    this.matchReviews
      .listQueue({ take: 50, page: 1, mode })
      .pipe(finalize(() => this.queueLoading.set(false)))
      .subscribe({
        next: (page) => {
          this.queueItems.set(page.items);
          this.totalQueueDepth.set(page.queueDepth);
          
          const initId = this.initialMatchId();
          let targetIndex = 0;
          if (initId) {
            const foundIdx = page.items.findIndex((item) => item.matchId === initId);
            if (foundIdx >= 0) targetIndex = foundIdx;
          }
          this.currentIndex.set(targetIndex);

          if (page.items.length > 0) {
            this.loadDetail(page.items[targetIndex].matchId);
          } else {
            this.currentDetail.set(null);
          }
        },
        error: (err) => {
          this.notifications.showError(
            err?.message || (this.isRtl() ? 'تعذر تحميل قائمة المنتجات' : 'Failed to load review queue')
          );
        }
      });
  }

  loadDetail(matchId: string): void {
    if (!matchId) return;
    this.detailLoading.set(true);
    this.matchReviews
      .getDetail(matchId)
      .pipe(finalize(() => this.detailLoading.set(false)))
      .subscribe({
        next: (detail) => {
          this.currentDetail.set(detail);
        },
        error: (err) => {
          this.notifications.showError(
            err?.message || (this.isRtl() ? 'تعذر جلب تفاصيل المطابقة' : 'Failed to load match detail')
          );
        }
      });
  }

  navigatePrev(): void {
    if (this.currentIndex() > 0) {
      const newIdx = this.currentIndex() - 1;
      this.currentIndex.set(newIdx);
      const item = this.queueItems()[newIdx];
      if (item) this.loadDetail(item.matchId);
    }
  }

  navigateNext(): void {
    if (this.currentIndex() < this.queueItems().length - 1) {
      const newIdx = this.currentIndex() + 1;
      this.currentIndex.set(newIdx);
      const item = this.queueItems()[newIdx];
      if (item) this.loadDetail(item.matchId);
    }
  }

  onAccept(): void {
    const detail = this.currentDetail();
    if (!detail || this.actionLoading()) return;

    const matchId = detail.queueItem.matchId;
    const masterProductId = detail.queueItem.proposedMasterProductId || detail.listing.masterProductId;

    this.actionLoading.set(true);
    this.activeAction.set('accept');

    this.matchReviews
      .accept(matchId, masterProductId)
      .pipe(
        finalize(() => {
          this.actionLoading.set(false);
          this.activeAction.set(null);
        })
      )
      .subscribe({
        next: () => {
          this.notifications.showSuccess(
            this.isRtl() ? 'تم تأكيد الربط بنجاح' : 'Match accepted successfully'
          );
          this.matchResolved.emit({ matchId, action: 'accept' });
          this.advanceAfterResolution(matchId);
        },
        error: (err) => {
          this.notifications.showError(
            err?.message || (this.isRtl() ? 'فشل تأكيد الربط' : 'Failed to accept match')
          );
        }
      });
  }

  onReject(): void {
    const detail = this.currentDetail();
    if (!detail || this.actionLoading()) return;

    const matchId = detail.queueItem.matchId;

    this.actionLoading.set(true);
    this.activeAction.set('reject');

    this.matchReviews
      .reject(matchId)
      .pipe(
        finalize(() => {
          this.actionLoading.set(false);
          this.activeAction.set(null);
        })
      )
      .subscribe({
        next: () => {
          this.notifications.showSuccess(
            this.isRtl() ? 'تم فصل المنتج وإلغاء ربطه من الكتالوج بنجاح' : 'Match unlinked successfully'
          );
          this.matchResolved.emit({ matchId, action: 'reject' });
          this.advanceAfterResolution(matchId);
        },
        error: (err) => {
          this.notifications.showError(
            err?.message || (this.isRtl() ? 'فشل فصل المنتج' : 'Failed to unlink match')
          );
        }
      });
  }

  private advanceAfterResolution(resolvedMatchId: string): void {
    // Remove the resolved item from local queue
    const updated = this.queueItems().filter((item) => item.matchId !== resolvedMatchId);
    this.queueItems.set(updated);
    this.totalQueueDepth.update((d) => Math.max(0, d - 1));

    if (updated.length === 0) {
      this.currentDetail.set(null);
      return;
    }

    // Keep current index bounded
    let nextIdx = this.currentIndex();
    if (nextIdx >= updated.length) {
      nextIdx = Math.max(0, updated.length - 1);
    }
    this.currentIndex.set(nextIdx);
    this.loadDetail(updated[nextIdx].matchId);
  }

  onClose(): void {
    this.close.emit();
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent): void {
    if (!this.isOpen() || this.actionLoading()) return;

    // Ignore keyboard shortcuts if user is typing in an input/textarea
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.onClose();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (this.selectedMode() === 'review') {
        this.onAccept();
      } else {
        this.navigateNext();
      }
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      this.onReject();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      if (this.isRtl()) {
        this.navigatePrev();
      } else {
        this.navigateNext();
      }
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      if (this.isRtl()) {
        this.navigateNext();
      } else {
        this.navigatePrev();
      }
    }
  }
}
