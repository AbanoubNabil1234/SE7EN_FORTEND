import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { CatalogBrowseRepository } from '../../../../core/domain/repositories/catalog-browse.repository';
import {
  CatalogFamily,
  FamilyAiSuggestion,
  GroupCodeMergeResult,
  PharmacyProductSearchHit,
  catalogFamilyTitle,
  familyHeroImage
} from '../../../../core/domain/models/catalog-family.model';
import {
  PHARMACY_BRANDS,
  PharmacyBrand,
  pharmacyLogo as resolvePharmacyLogo
} from '../../../../core/domain/pharmacy-brands';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { LocaleService } from '../../../../core/services/locale.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { ProxyImgPipe } from '../../../../shared/pipes/proxy-img.pipe';

@Component({
  selector: 'app-quick-add-product-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe, TranslatePipe, ProxyImgPipe],
  template: `
    @if (isOpen() && family()) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="'quickAdd.modalTitle' | t"
        (keydown.escape)="onClose()"
      >
        <!-- Backdrop click listener -->
        <div class="fixed inset-0" (click)="onClose()"></div>

        <!-- Modal Box -->
        <div
          class="relative w-full max-w-2xl max-h-[90vh] rounded-2xl bg-white shadow-2xl flex flex-col overflow-hidden border border-[#E8D5BE] z-10 animate-fade-in"
          [attr.dir]="isRtl() ? 'rtl' : 'ltr'"
        >
          <!-- Header -->
          <div class="px-5 py-3.5 border-b border-[#EDE0D0] bg-[#FBF8F4] flex items-center justify-between gap-3">
            <div class="flex items-center gap-2 min-w-0">
              <span class="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#F8EEE2] text-[#C27938]">
                <i class="pi pi-link text-sm"></i>
              </span>
              <h3 class="text-base font-extrabold text-[#181A1D] truncate">
                {{ 'quickAdd.modalTitle' | t }}
              </h3>
            </div>

            <!-- Close Button -->
            <button
              type="button"
              class="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-[#E8D5BE] bg-white text-[#8A735C] hover:bg-[#F8EEE2] hover:text-[#181A1D] transition-colors"
              (click)="onClose()"
              [attr.aria-label]="'common.close' | t"
            >
              <i class="pi pi-times text-xs"></i>
            </button>
          </div>

          <!-- Target Product / Family Identity Card -->
          <div class="px-5 py-3.5 bg-gradient-to-r from-[#FBF8F4] via-[#F8EEE2]/60 to-[#FBF8F4] border-b border-[#EDE0D0]">
            <div class="flex items-center gap-3.5 sm:gap-4">
              <!-- Target Product Image -->
              <div class="relative size-16 sm:size-18 shrink-0 rounded-xl border border-[#E8D5BE] bg-white p-1 shadow-sm overflow-hidden flex items-center justify-center">
                @if (targetImageUrl(); as img) {
                  <img
                    [src]="img"
                    [alt]="currentFamilyTitle()"
                    class="size-full object-contain"
                    loading="lazy"
                    (error)="onTargetImageError()"
                  />
                } @else {
                  <div class="flex size-full flex-col items-center justify-center text-[#A68B6D]/60 bg-[#FBF8F4]">
                    <i class="pi pi-box text-2xl"></i>
                  </div>
                }
              </div>

              <!-- Target Product Info -->
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5 text-[11px] font-extrabold text-[#C27938]">
                  <i class="pi pi-bullseye text-xs"></i>
                  <span>{{ 'quickAdd.targetProduct' | t }}</span>
                </div>

                <!-- Product Name (Arabic / Main Title) -->
                <h4 class="text-sm sm:text-base font-extrabold text-[#181A1D] leading-snug line-clamp-1 mt-0.5" [title]="currentFamilyTitle()">
                  {{ currentFamilyTitle() }}
                </h4>

                <!-- English Name if available and distinct -->
                @if (family()?.englishName && family()?.englishName !== currentFamilyTitle()) {
                  <p class="text-xs text-[#8A735C] font-medium truncate" dir="ltr">
                    {{ family()?.englishName }}
                  </p>
                }

                <!-- Meta row: Code, Brand, Offers count -->
                <div class="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                  @if (family()?.groupCode; as code) {
                    <span class="inline-flex items-center gap-1 rounded-md bg-[#181A1D] px-2 py-0.5 font-mono text-[11px] font-bold text-white shadow-xs">
                      <i class="pi pi-hashtag text-[9px] text-[#C27938]"></i>
                      <span>{{ code }}</span>
                    </span>
                  }
                  @if (family()?.brand; as brand) {
                    <span class="rounded-md bg-[#F8EEE2] px-2 py-0.5 text-[11px] font-bold text-[#8A735C]">
                      {{ brand }}
                    </span>
                  }
                  <span class="inline-flex items-center gap-1 rounded-md bg-white border border-[#E8D5BE] px-2 py-0.5 text-[11px] font-semibold text-[#8A735C]">
                    <i class="pi pi-shop text-[10px] text-[#C27938]"></i>
                    <span>{{ currentOffersCount() }} {{ 'quickAdd.currentOffers' | t }}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Search & Pharmacy Filter Section -->
          <div class="p-4 border-b border-[#EDE0D0] bg-white space-y-3">
            <!-- Pharmacy Selection Row (Only shows pharmacies NOT in this product) -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div class="flex items-center gap-1.5 text-xs font-bold text-[#8A735C]">
                <i class="pi pi-filter text-[11px] text-[#C27938]"></i>
                <span>{{ 'quickAdd.selectPharmacy' | t }}:</span>
                @if (availablePharmacies().length > 0) {
                  <span class="rounded-full bg-[#F8EEE2] px-2 py-0.5 text-[10px] font-extrabold text-[#C27938]">
                    {{ availablePharmacies().length }} {{ 'quickAdd.missingCount' | t }}
                  </span>
                }
              </div>

              @if (availablePharmacies().length > 0) {
                <div class="relative w-full sm:w-64">
                  <select
                    class="w-full appearance-none min-h-9 ps-8 pe-8 rounded-xl border border-[#E8D5BE] bg-[#FBF8F4] text-xs font-bold text-[#181A1D] outline-none transition-all focus:border-[#C27938] focus:bg-white focus:ring-2 focus:ring-[#C27938]/15 cursor-pointer shadow-2xs"
                    [ngModel]="selectedPharmacy()"
                    (ngModelChange)="onPharmacyChange($event)"
                  >
                    <option value="all">
                      {{ 'quickAdd.allMissingPharmacies' | t }} ({{ availablePharmacies().length }})
                    </option>
                    @for (pharmacy of availablePharmacies(); track pharmacy.code) {
                      <option [value]="pharmacy.code">
                        {{ isRtl() ? pharmacy.nameAr : pharmacy.nameEn }}
                      </option>
                    }
                  </select>
                  <!-- Start Icon / Selected Logo -->
                  <span class="absolute inset-y-0 start-0 flex items-center ps-2.5 pointer-events-none">
                    @if (selectedPharmacyBrand(); as b) {
                      <img [src]="b.icon || b.logo" [alt]="b.nameEn" class="size-4 object-contain rounded-full bg-white" />
                    } @else {
                      <i class="pi pi-shop text-xs text-[#C27938]"></i>
                    }
                  </span>
                  <!-- Dropdown arrow -->
                  <span class="absolute inset-y-0 end-0 flex items-center pe-2.5 pointer-events-none text-[#8A735C]">
                    <i class="pi pi-chevron-down text-[10px]"></i>
                  </span>
                </div>
              } @else {
                <div class="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800">
                  <i class="pi pi-check-circle text-xs text-emerald-600"></i>
                  <span>{{ 'quickAdd.allPharmaciesPresent' | t }}</span>
                </div>
              }
            </div>

            <!-- Quick Pill Chips for fast 1-click filtering -->
            @if (availablePharmacies().length > 0) {
              <div class="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                <button
                  type="button"
                  class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold border transition-colors shrink-0 cursor-pointer"
                  [ngClass]="selectedPharmacy() === 'all' ? 'bg-[#181A1D] text-white border-[#181A1D]' : 'bg-[#FBF8F4] text-[#8A735C] border-[#E8D5BE] hover:bg-[#F8EEE2]'"
                  (click)="onPharmacyChange('all')"
                >
                  <i class="pi pi-th-large text-[10px]"></i>
                  <span>{{ 'quickAdd.allMissingPharmacies' | t }}</span>
                </button>
                @for (p of availablePharmacies(); track p.code) {
                  <button
                    type="button"
                    class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold border transition-colors shrink-0 cursor-pointer"
                    [ngClass]="selectedPharmacy() === p.code ? 'bg-[#C27938] text-white border-[#C27938] shadow-xs' : 'bg-[#FBF8F4] text-[#8A735C] border-[#E8D5BE] hover:bg-[#F8EEE2]'"
                    (click)="onPharmacyChange(p.code)"
                  >
                    <img [src]="p.icon || p.logo" [alt]="p.nameEn" class="size-3.5 object-contain rounded-full bg-white shrink-0" />
                    <span>{{ isRtl() ? p.nameAr : p.nameEn }}</span>
                  </button>
                }
              </div>
            }

            <!-- Search Input Box -->
            <div class="relative flex items-center">
              <span class="absolute inset-y-0 start-0 flex items-center ps-3.5 pointer-events-none text-[#A68B6D]">
                <i class="pi pi-search text-sm"></i>
              </span>
              <input
                type="text"
                class="w-full min-h-11 rounded-xl border border-[#E8D5BE] bg-[#FBF8F4] ps-10 pe-10 text-sm font-medium text-[#181A1D] outline-none transition-all focus:border-[#C27938] focus:bg-white focus:ring-2 focus:ring-[#C27938]/15"
                [placeholder]="'quickAdd.searchPlaceholder' | t"
                [ngModel]="searchQuery()"
                (ngModelChange)="onSearchInput($event)"
                autofocus
              />
              @if (searchQuery()) {
                <button
                  type="button"
                  class="absolute inset-y-0 end-0 flex items-center pe-3 text-[#A68B6D] hover:text-[#181A1D]"
                  (click)="clearSearch()"
                  [attr.aria-label]="'common.dismiss' | t"
                >
                  <i class="pi pi-times-circle text-sm"></i>
                </button>
              }
            </div>

            <!-- Quick Direct Merge Banner when query looks like a group code G-XXXXXX -->
            @if (isGroupCodeQuery(searchQuery())) {
              <div class="flex items-center justify-between gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-2 text-xs text-amber-900 animate-fade-in">
                <div class="flex items-center gap-2 min-w-0 flex-1">
                  <i class="pi pi-link text-amber-700 shrink-0"></i>
                  <span class="truncate">
                    {{ 'productsAdmin.mergePrompt' | t }}: <strong class="font-mono">{{ searchQuery().trim().toUpperCase() }}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  class="inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-lg bg-[#C27938] px-3 text-xs font-extrabold text-white hover:bg-[#a5632b] disabled:opacity-50 transition-colors shadow-xs"
                  [disabled]="mergingCode() === searchQuery().trim().toUpperCase()"
                  (click)="mergeGroup(searchQuery().trim().toUpperCase())"
                >
                  @if (mergingCode() === searchQuery().trim().toUpperCase()) {
                    <i class="pi pi-spin pi-spinner text-xs"></i>
                    <span>{{ 'quickAdd.mergingFamily' | t }}</span>
                  } @else {
                    <i class="pi pi-check text-xs"></i>
                    <span>{{ 'productsAdmin.confirmMerge' | t }}</span>
                  }
                </button>
              </div>
            }

            @if (loading()) {
              <div class="mt-2 flex items-center justify-between text-xs font-semibold text-[#C27938]">
                <span class="flex items-center gap-1.5">
                  <i class="pi pi-spin pi-spinner text-xs"></i>
                  <span>{{ 'quickAdd.searching' | t }}</span>
                </span>
                <span class="h-1.5 w-24 rounded-full bg-[#E8D5BE] overflow-hidden">
                  <span class="block h-full w-full bg-[#C27938] animate-pulse"></span>
                </span>
              </div>
            }
          </div>

          <!-- Results Body -->
          <div class="flex-1 overflow-y-auto p-4 space-y-2.5 min-h-[220px] max-h-[50vh] divide-y divide-[#F2E8DC]">
            @if (loading() && hits().length === 0) {
              <!-- Quick Add Skeletons -->
              <div class="space-y-2.5 animate-pulse">
                @for (item of [1, 2, 3]; track item) {
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-[#EDE0D0] bg-white">
                    <div class="flex items-start gap-3 min-w-0 flex-1">
                      <div class="size-10 shrink-0 rounded-lg bg-[#F3E7D8]"></div>
                      <div class="space-y-2 flex-1 min-w-0">
                        <div class="flex items-center gap-2">
                          <div class="h-4 w-20 rounded bg-[#F8EEE2]"></div>
                          <div class="h-3.5 w-14 rounded bg-[#F8EEE2]"></div>
                        </div>
                        <div class="h-4 w-3/4 rounded bg-[#E8D5BE]"></div>
                        <div class="flex items-center gap-2">
                          <div class="h-4 w-16 rounded bg-[#F3E7D8]"></div>
                          <div class="h-4 w-24 rounded bg-[#F8EEE2]"></div>
                        </div>
                      </div>
                    </div>
                    <div class="h-9 w-28 rounded-lg bg-[#E8D5BE]/60 shrink-0"></div>
                  </div>
                }
              </div>
            } @else if (hits().length > 0) {
              @for (hit of hits(); track hit.id) {
                <div class="pt-2.5 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-[#EDE0D0] bg-white hover:bg-[#FBF8F4] transition-colors">
                  <!-- Product Info with Product Image & Pharmacy Logo -->
                  <div class="flex items-start gap-3 min-w-0 flex-1">
                    <div class="relative size-12 shrink-0 rounded-lg border border-[#E8D5BE] bg-white p-0.5 overflow-hidden flex items-center justify-center">
                      @if (hit.imageUrl) {
                        <img
                          [src]="hit.imageUrl | proxyImg"
                          [alt]="hit.name"
                          class="size-full object-contain"
                          loading="lazy"
                          (error)="onHitImageError(hit)"
                        />
                        @if (pharmacyLogo(hit.pharmacyCode); as logo) {
                          <img
                            [src]="logo"
                            [alt]="hit.pharmacyName"
                            class="absolute bottom-0 end-0 size-4 rounded-full border border-[#E8D5BE] bg-white object-contain p-0.5 shadow-xs"
                          />
                        }
                      } @else if (pharmacyLogo(hit.pharmacyCode); as logo) {
                        <img
                          [src]="logo"
                          [alt]="hit.pharmacyName"
                          class="size-full object-contain p-1"
                        />
                      } @else {
                        <span class="inline-flex size-full items-center justify-center text-[#C27938]">
                          <i class="pi pi-shop text-sm"></i>
                        </span>
                      }
                    </div>

                    <div class="min-w-0 flex-1">
                      <div class="flex flex-wrap items-center gap-1.5">
                        <span class="rounded bg-[#F8EEE2] px-2 py-0.5 text-[11px] font-bold text-[#8A735C]">
                          {{ hit.pharmacyName }}
                        </span>
                        @if (hit.packSize) {
                          <span class="text-[11px] font-semibold text-[#8A735C]" dir="ltr">
                            {{ hit.packSize }}
                          </span>
                        }
                      </div>

                      <h4 class="mt-1 text-sm font-bold text-[#181A1D] text-pretty">
                        {{ hit.name }}
                      </h4>

                      @if (hit.englishName && hit.englishName !== hit.name) {
                        <p class="text-xs text-[#8A735C] truncate" dir="ltr">
                          {{ hit.englishName }}
                        </p>
                      }

                      <div class="mt-1.5 flex flex-wrap items-center gap-2">
                        @if (hit.price != null) {
                          <span class="text-sm font-extrabold text-[#181A1D] tabular-nums">
                            {{ hit.price | currency: (hit.currency || 'SAR'):'symbol':'1.2-2' }}
                          </span>
                        }
                        @if (hit.oldPrice != null && hit.oldPrice > (hit.price || 0)) {
                          <span class="text-xs text-slate-400 line-through tabular-nums">
                            {{ hit.oldPrice | currency: (hit.currency || 'SAR'):'symbol':'1.2-2' }}
                          </span>
                        }
                        @if (hit.barcode) {
                          <span class="inline-flex items-center gap-1 rounded bg-[#F8EEE2] px-1.5 py-0.5 font-mono text-[11px] font-bold text-[#181A1D]">
                            <i class="pi pi-barcode text-[11px] text-[#C27938]"></i>
                            <span dir="ltr">{{ hit.barcode }}</span>
                          </span>
                        }
                        @if (hit.manualGroupCode && hit.manualGroupCode !== family()?.groupCode) {
                          <span class="inline-flex items-center gap-1 rounded bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                            <i class="pi pi-link text-[10px] text-amber-600"></i>
                            <span>{{ 'quickAdd.alreadyLinked' | t }}:</span>
                            <span class="font-mono font-extrabold">{{ hit.manualGroupCode }}</span>
                          </span>
                        }
                      </div>
                    </div>
                  </div>

                  <!-- Actions Button(s) -->
                  <div class="shrink-0 flex flex-wrap items-center gap-1.5 justify-end">
                    @if (isAlreadyInFamily(hit)) {
                      <span class="inline-flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-bold text-emerald-800">
                        <i class="pi pi-check text-xs"></i>
                        <span>{{ 'productsAdmin.link' | t }}</span>
                      </span>
                    } @else if (hit.manualGroupCode && hit.manualGroupCode !== family()?.groupCode) {
                      <!-- Offer belongs to another group: Option to Merge Entire Family or Add this Offer only -->
                      <button
                        type="button"
                        class="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#C27938] px-3 text-xs font-extrabold text-white hover:bg-[#a5632b] disabled:opacity-50 transition-colors shadow-xs"
                        [disabled]="mergingCode() === hit.manualGroupCode || linkingId() === hit.id"
                        (click)="mergeGroup(hit.manualGroupCode!)"
                      >
                        @if (mergingCode() === hit.manualGroupCode) {
                          <i class="pi pi-spin pi-spinner text-xs"></i>
                          <span>{{ 'quickAdd.mergingFamily' | t }}</span>
                        } @else {
                          <i class="pi pi-link text-xs"></i>
                          <span>{{ 'quickAdd.mergeFamily' | t }}</span>
                        }
                      </button>
                      <button
                        type="button"
                        class="inline-flex min-h-9 items-center gap-1 rounded-lg border border-[#E8D5BE] bg-white px-2.5 text-xs font-bold text-[#181A1D] hover:bg-[#F8EEE2] disabled:opacity-50 transition-colors"
                        [disabled]="linkingId() === hit.id || mergingCode() === hit.manualGroupCode"
                        (click)="addHitToFamily(hit)"
                      >
                        @if (linkingId() === hit.id) {
                          <i class="pi pi-spin pi-spinner text-xs"></i>
                        } @else {
                          <i class="pi pi-plus text-xs text-[#C27938]"></i>
                        }
                        <span>{{ 'quickAdd.addSingle' | t }}</span>
                      </button>
                    } @else {
                      <button
                        type="button"
                        class="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#181A1D] px-3.5 text-xs font-bold text-white hover:bg-black disabled:opacity-50 transition-colors"
                        [disabled]="linkingId() === hit.id"
                        (click)="addHitToFamily(hit)"
                      >
                        @if (linkingId() === hit.id) {
                          <i class="pi pi-spin pi-spinner text-xs"></i>
                          <span>{{ 'quickAdd.adding' | t }}</span>
                        } @else {
                          <i class="pi pi-plus text-xs text-[#C27938]"></i>
                          <span>{{ 'quickAdd.addToFamily' | t }}</span>
                        }
                      </button>
                    }
                  </div>
                </div>
              }
            } @else if (hasSearched() && !loading()) {
              <div class="py-12 text-center text-slate-400">
                <i class="pi pi-search text-3xl mb-2 text-[#A68B6D]"></i>
                <p class="text-sm font-bold text-[#181A1D]">{{ 'quickAdd.noResults' | t }}</p>
                <p class="text-xs text-[#8A735C] mt-1">{{ 'quickAdd.modalSubtitle' | t }}</p>
              </div>
            } @else if (!loading() && aiSuggestions().length > 0) {
              <!-- AI Recommendations Header -->
              <div class="rounded-xl border border-amber-200/80 bg-gradient-to-r from-amber-50/90 via-[#F8EEE2]/70 to-amber-50/90 p-3 mb-2 flex items-center justify-between gap-2 shadow-2xs">
                <div class="flex items-center gap-2">
                  <span class="inline-flex size-7 items-center justify-center rounded-lg bg-[#C27938] text-white shadow-xs">
                    <i class="pi pi-sparkles text-xs animate-pulse"></i>
                  </span>
                  <div>
                    <h4 class="text-xs font-black text-[#181A1D]">
                      {{ isRtl() ? 'مقترحات الذكاء الاصطناعي لهذه العائلة' : 'AI Suggestions for this Family' }}
                    </h4>
                    <p class="text-[11px] text-[#8A735C]">
                      {{ isRtl() ? 'أصناف قريبة تم ترشيحها تلقائياً للانضمام إلى العائلة' : 'Candidates recommended to join this family' }}
                    </p>
                  </div>
                </div>
                <span class="rounded-full bg-white px-2.5 py-0.5 text-xs font-black text-[#C27938] border border-amber-200 shadow-2xs tabular-nums">
                  {{ aiSuggestions().length }} {{ isRtl() ? 'مقترحات' : 'suggestions' }}
                </span>
              </div>

              <!-- AI Suggestions List -->
              @for (sug of aiSuggestions(); track sug.id) {
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-[#EDE0D0] bg-white hover:bg-[#FBF8F4] transition-colors shadow-2xs">
                  <div class="flex items-start gap-3 min-w-0 flex-1">
                    <!-- Image -->
                    <div class="relative size-12 shrink-0 rounded-lg border border-[#E8D5BE] bg-[#FBF8F4] p-0.5 overflow-hidden flex items-center justify-center">
                      @if (sug.imageUrl) {
                        <img [src]="sug.imageUrl | proxyImg" [alt]="sug.name" class="size-full object-contain" loading="lazy" />
                      } @else {
                        <i class="pi pi-image text-sm text-[#A68B6D]/60"></i>
                      }
                    </div>

                    <div class="min-w-0 flex-1 space-y-1">
                      <!-- Pharmacy Brand + Confidence Badge -->
                      <div class="flex flex-wrap items-center gap-1.5 text-xs">
                        <span class="inline-flex items-center gap-1 rounded-md border border-[#E8D5BE] bg-white px-2 py-0.5 text-xs font-bold text-[#4A4038]">
                          @if (pharmacyLogo(sug.pharmacyCode); as logo) {
                            <img [src]="logo" [alt]="sug.pharmacyName" class="size-3.5 object-contain" />
                          }
                          <span>{{ sug.pharmacyName }}</span>
                        </span>

                        <!-- AI Confidence Badge -->
                        <span class="inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-black text-emerald-800 shadow-2xs">
                          <i class="pi pi-sparkles text-[10px] text-emerald-600"></i>
                          <span>{{ formatConfidence(sug.confidence) }} {{ isRtl() ? 'تطابق ذكي' : 'AI match' }}</span>
                        </span>

                        @if (sug.packSize) {
                          <span class="rounded bg-[#F8EEE2] px-1.5 py-0.5 text-[11px] font-semibold text-[#8A735C]">
                            {{ sug.packSize }}
                          </span>
                        }
                      </div>

                      <!-- Name -->
                      <div class="text-sm font-extrabold text-[#181A1D] leading-snug break-words">
                        {{ sug.name }}
                      </div>
                      @if (sug.englishName && sug.englishName !== sug.name) {
                        <div class="text-xs text-[#8A735C] truncate" dir="ltr">
                          {{ sug.englishName }}
                        </div>
                      }

                      <!-- Barcode / SKU / Reason -->
                      <div class="flex flex-wrap items-center gap-2 pt-0.5 text-[11px] text-[#8A735C]">
                        @if (sug.barcode) {
                          <span class="font-mono text-[10px]" dir="ltr">
                            <i class="pi pi-barcode me-0.5"></i>{{ sug.barcode }}
                          </span>
                        }
                        @if (sug.decisionReason) {
                          <span class="text-[#A68B6D] text-[10px]">
                            • {{ sug.decisionReason }}
                          </span>
                        }
                      </div>
                    </div>
                  </div>

                  <!-- Price & Action Button -->
                  <div class="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#F0E4D5]">
                    @if (sug.price != null) {
                      <div class="text-end">
                        <span class="text-sm font-black text-[#181A1D] tabular-nums block">
                          {{ sug.price | currency: 'SAR':'symbol':'1.2-2' }}
                        </span>
                      </div>
                    }

                    <!-- Direct Store Link Button -->
                    @if (sug.productUrl) {
                      <a
                        [href]="sug.productUrl"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="inline-flex size-9 items-center justify-center rounded-xl border border-[#E8D5BE] bg-white text-[#C27938] hover:bg-[#F8EEE2] hover:border-[#C27938] transition-colors"
                        [title]="isRtl() ? 'فتح صفحة المنتج في متجر ' + sug.pharmacyName : 'Open in ' + sug.pharmacyName"
                      >
                        <i class="pi pi-external-link text-xs"></i>
                      </a>
                    }

                    <!-- Quick Add Button -->
                    <button
                      type="button"
                      class="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 px-3.5 text-xs font-black text-white shadow-xs hover:shadow-sm disabled:opacity-50 transition-all cursor-pointer"
                      [disabled]="linkingId() === sug.id"
                      (click)="addSuggestionToFamily(sug)"
                    >
                      @if (linkingId() === sug.id) {
                        <i class="pi pi-spin pi-spinner text-xs"></i>
                        <span>{{ isRtl() ? 'جاري الإضافة...' : 'Adding...' }}</span>
                      } @else {
                        <i class="pi pi-plus text-xs"></i>
                        <span>{{ isRtl() ? 'إضافة للعائلة' : 'Add to Family' }}</span>
                      }
                    </button>
                  </div>
                </div>
              }
            } @else if (suggestionsLoading()) {
              <div class="py-12 flex flex-col items-center justify-center gap-2 text-center">
                <i class="pi pi-spin pi-spinner text-2xl text-[#C27938]"></i>
                <p class="text-xs font-bold text-[#8A735C]">
                  {{ isRtl() ? 'جاري جلب مقترحات الذكاء الاصطناعي لهذه العائلة...' : 'Loading AI suggestions for this family...' }}
                </p>
              </div>
            } @else if (!loading()) {
              <div class="py-12 text-center text-slate-400">
                <i class="pi pi-box text-3xl mb-2 text-[#A68B6D]/60"></i>
                <p class="text-sm font-semibold text-[#8A735C]">{{ 'quickAdd.startTyping' | t }}</p>
              </div>
            }
          </div>

          <!-- Footer -->
          <div class="px-5 py-3 border-t border-[#EDE0D0] bg-[#FBF8F4] flex items-center justify-between text-xs text-[#8A735C]">
            <span>
              {{ hits().length }} {{ 'common.search' | t }}
            </span>
            <button
              type="button"
              class="inline-flex min-h-8 items-center rounded-lg border border-[#E8D5BE] bg-white px-3 text-xs font-bold text-[#181A1D] hover:bg-[#F8EEE2]"
              (click)="onClose()"
            >
              {{ 'common.close' | t }}
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class QuickAddProductModalComponent {
  private readonly catalog = inject(CatalogBrowseRepository);
  private readonly notifications = inject(NotificationService);
  private readonly i18n = inject(I18nService);
  private readonly locale = inject(LocaleService);

  readonly family = input<CatalogFamily | null>(null);
  readonly isOpen = input<boolean>(false);

  readonly close = output<void>();
  readonly productAdded = output<{ pharmacyProductId: string; groupCode: string }>();
  readonly familyMerged = output<GroupCodeMergeResult>();

  readonly searchQuery = signal<string>('');
  readonly selectedPharmacy = signal<string>('all');
  readonly hits = signal<PharmacyProductSearchHit[]>([]);
  readonly aiSuggestions = signal<FamilyAiSuggestion[]>([]);
  readonly loading = signal<boolean>(false);
  readonly suggestionsLoading = signal<boolean>(false);
  readonly linkingId = signal<string | null>(null);
  readonly mergingCode = signal<string | null>(null);
  readonly hasSearched = signal<boolean>(false);
  readonly targetImageError = signal<boolean>(false);

  private searchDebounceTimer?: ReturnType<typeof setTimeout>;

  readonly isRtl = computed(() => this.locale.locale() === 'ar');

  readonly existingPharmacyCodes = computed<Set<string>>(() => {
    const fam = this.family();
    const set = new Set<string>();
    if (!fam?.packs) return set;
    for (const pack of fam.packs) {
      if (pack.offers) {
        for (const offer of pack.offers) {
          if (offer.pharmacyCode) {
            set.add(offer.pharmacyCode.trim().toLowerCase());
          }
        }
      }
    }
    return set;
  });

  readonly availablePharmacies = computed<readonly PharmacyBrand[]>(() => {
    const existing = this.existingPharmacyCodes();
    return PHARMACY_BRANDS.filter(
      (b) => !existing.has(b.code.toLowerCase())
    );
  });

  readonly selectedPharmacyBrand = computed<PharmacyBrand | null>(() => {
    const code = this.selectedPharmacy();
    if (!code || code === 'all') return null;
    return PHARMACY_BRANDS.find((b) => b.code.toLowerCase() === code.toLowerCase()) ?? null;
  });

  private lastLoadedGroupCode: string | null = null;

  constructor() {
    effect(() => {
      const open = this.isOpen();
      const fam = this.family();
      const code = fam?.groupCode;
      if (open && code) {
        if (this.lastLoadedGroupCode !== code) {
          this.lastLoadedGroupCode = code;
          this.loadAiSuggestions(code);
        }
      } else {
        this.lastLoadedGroupCode = null;
        this.aiSuggestions.set([]);
        this.searchQuery.set('');
        this.selectedPharmacy.set('all');
        this.hits.set([]);
        this.hasSearched.set(false);
      }
    });
  }

  loadAiSuggestions(groupCode: string): void {
    this.suggestionsLoading.set(true);
    this.catalog
      .getFamilyAiSuggestions(groupCode, 8)
      .pipe(finalize(() => this.suggestionsLoading.set(false)))
      .subscribe({
        next: (items) => this.aiSuggestions.set(items),
        error: () => this.aiSuggestions.set([])
      });
  }

  formatConfidence(conf: number): string {
    if (conf == null) return '0%';
    const pct = conf <= 1 ? Math.round(conf * 100) : Math.round(conf);
    return `${pct}%`;
  }

  addSuggestionToFamily(sug: FamilyAiSuggestion): void {
    const hit: PharmacyProductSearchHit = {
      id: sug.id,
      name: sug.name,
      englishName: sug.englishName,
      pharmacyCode: sug.pharmacyCode,
      pharmacyName: sug.pharmacyName,
      barcode: sug.barcode,
      price: sug.price,
      oldPrice: sug.oldPrice,
      currency: sug.currency,
      imageUrl: sug.imageUrl,
      productUrl: sug.productUrl,
      packSize: sug.packSize,
      manualGroupCode: sug.manualGroupCode,
      masterProductId: null
    };
    this.addHitToFamily(hit);
    // Remove added item from local suggestions
    this.aiSuggestions.update((list) => list.filter((s) => s.id !== sug.id));
  }

  currentFamilyTitle(): string {
    return catalogFamilyTitle(this.family(), this.locale.locale());
  }

  targetImageUrl(): string | null {
    if (this.targetImageError()) return null;
    const fam = this.family();
    if (!fam) return null;
    return familyHeroImage(fam);
  }

  onTargetImageError(): void {
    this.targetImageError.set(true);
  }

  onHitImageError(hit: PharmacyProductSearchHit): void {
    hit.imageUrl = null;
  }

  currentOffersCount(): number {
    const fam = this.family();
    if (!fam?.packs) return 0;
    return fam.packs.reduce((sum, p) => sum + (p.offers ? p.offers.length : 0), 0);
  }

  pharmacyLogo(code: string | null | undefined): string | null {
    return resolvePharmacyLogo(code);
  }

  isAlreadyInFamily(hit: PharmacyProductSearchHit): boolean {
    const fam = this.family();
    if (!fam) return false;
    return fam.packs.some((pack) =>
      pack.offers.some((offer) => offer.pharmacyProductId === hit.id)
    );
  }

  isGroupCodeQuery(query: string): boolean {
    const q = (query || '').trim().toUpperCase();
    return q.startsWith('G-') && q.length >= 4;
  }

  onPharmacyChange(code: string): void {
    this.selectedPharmacy.set(code);
    const query = this.searchQuery().trim();
    if (query.length >= 2) {
      this.loading.set(true);
      this.executeSearch(query, code);
    }
  }

  onSearchInput(query: string): void {
    this.searchQuery.set(query);
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      this.hits.set([]);
      this.hasSearched.set(false);
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.searchDebounceTimer = setTimeout(() => {
      this.executeSearch(trimmed, this.selectedPharmacy());
    }, 300);
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.hits.set([]);
    this.hasSearched.set(false);
    this.loading.set(false);
  }

  private executeSearch(term: string, pharmacyCode: string = this.selectedPharmacy()): void {
    const code = pharmacyCode === 'all' ? null : pharmacyCode;
    this.catalog
      .searchPharmacyProducts(term, code, 30)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (results) => {
          const existing = this.existingPharmacyCodes();
          const filtered = results.filter((r) => {
            if (code) {
              return r.pharmacyCode.toLowerCase() === code.toLowerCase();
            }
            return !existing.has(r.pharmacyCode.toLowerCase());
          });
          this.hits.set(filtered);
          this.hasSearched.set(true);
        },
        error: () => {
          this.hits.set([]);
          this.hasSearched.set(true);
        }
      });
  }

  addHitToFamily(hit: PharmacyProductSearchHit): void {
    const fam = this.family();
    const groupCode = fam?.groupCode;
    if (!fam || !groupCode) {
      this.notifications.showError(
        this.i18n.t('quickAdd.linkFailed'),
        this.i18n.t('productsAdmin.link')
      );
      return;
    }

    this.linkingId.set(hit.id);
    this.catalog
      .linkByGroupCode(hit.id, groupCode)
      .pipe(finalize(() => this.linkingId.set(null)))
      .subscribe({
        next: (res) => {
          this.notifications.showSuccess(this.i18n.t('quickAdd.addedSuccess'), hit.name);
          this.productAdded.emit({
            pharmacyProductId: hit.id,
            groupCode: res.code
          });
          // Update hit's manualGroupCode locally
          this.hits.update((list) =>
            list.map((h) => (h.id === hit.id ? { ...h, manualGroupCode: res.code } : h))
          );
        },
        error: (err: { status?: number; error?: { code?: string } }) => {
          if (err.status === 409 || err.error?.code === 'same_pharmacy_in_family') {
            this.notifications.showError(
              this.i18n.t('quickAdd.conflictPharmacy'),
              this.i18n.t('productsAdmin.link')
            );
          } else {
            this.notifications.showError(
              this.i18n.t('quickAdd.linkFailed'),
              this.i18n.t('productsAdmin.link')
            );
          }
        }
      });
  }

  mergeGroup(otherCode: string): void {
    const fam = this.family();
    const currentCode = (fam?.groupCode || '').trim().toUpperCase();
    const sourceCode = (otherCode || '').trim().toUpperCase();
    if (!fam || !currentCode || !sourceCode) return;

    if (sourceCode === currentCode) {
      this.notifications.showError(
        this.i18n.t('productsAdmin.mergeSameError'),
        this.i18n.t('productsAdmin.mergeGroup')
      );
      return;
    }

    this.mergingCode.set(sourceCode);
    this.catalog
      .mergeGroups(sourceCode, currentCode)
      .pipe(finalize(() => this.mergingCode.set(null)))
      .subscribe({
        next: (res) => {
          this.notifications.showSuccess(
            this.i18n.t('quickAdd.familyMergedSuccess'),
            `${sourceCode} ➔ ${currentCode}`
          );
          this.familyMerged.emit(res);
          this.onClose();
        },
        error: (err: { status?: number; error?: { code?: string; message?: string } }) => {
          if (err?.status === 409 || err?.error?.code === 'same_pharmacy_in_family') {
            this.notifications.showError(
              this.i18n.t('productsAdmin.mergeConflictError'),
              this.i18n.t('productsAdmin.mergeGroup')
            );
          } else {
            const msg = err?.error?.message || this.i18n.t('productsAdmin.mergeFailed');
            this.notifications.showError(msg, this.i18n.t('productsAdmin.mergeGroup'));
          }
        }
      });
  }

  onClose(): void {
    this.clearSearch();
    this.selectedPharmacy.set('all');
    this.targetImageError.set(false);
    this.close.emit();
  }
}
