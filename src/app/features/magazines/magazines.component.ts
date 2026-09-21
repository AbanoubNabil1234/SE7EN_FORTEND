import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, forkJoin, map, of, switchMap } from 'rxjs';
import { Magazine } from '../../core/domain/models/magazine.model';
import { MagazineRepository } from '../../core/domain/repositories/magazine.repository';
import { PHARMACY_BRANDS, pharmacyDisplayName } from '../../core/domain/pharmacy-brands';
import { I18nService } from '../../core/i18n/i18n.service';
import { LocaleService } from '../../core/services/locale.service';
import { NotificationService } from '../../core/services/notification.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-magazines',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  template: `
    <section class="w-full space-y-4 px-4 py-4 sm:px-5 sm:py-5" [attr.dir]="locale.isRtl() ? 'rtl' : 'ltr'">
      <div class="overflow-hidden rounded-2xl border border-[#E8D5BE] bg-white shadow-sm">
        <div class="h-1.5 bg-[#C27938]"></div>
        <div class="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div class="min-w-0">
            <div class="inline-flex items-center gap-2 rounded-full bg-[#F8EEE2] px-3 py-1 text-[11px] font-bold text-[#C27938]">
              <span class="size-1.5 rounded-full bg-[#C27938]"></span>
              {{ 'magazines.badge' | t }}
            </div>
            <h1 class="mt-3 text-balance text-3xl font-extrabold text-[#181A1D] sm:text-4xl">
              {{ 'magazines.title' | t }}
            </h1>
            <p class="mt-1.5 max-w-xl text-pretty text-sm font-medium text-[#8A735C]">
              {{ 'magazines.subtitle' | t }}
            </p>
          </div>
          <button
            type="button"
            class="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#181A1D] px-5 text-sm font-bold text-white hover:bg-black"
            (click)="openModal()"
          >
            <i class="pi pi-plus text-sm" aria-hidden="true"></i>
            {{ 'magazines.add' | t }}
          </button>
        </div>

        <div class="grid grid-cols-3 border-t border-[#EDE0D0]">
          <div class="border-e border-[#EDE0D0] px-4 py-3.5 sm:px-5">
            <div class="text-[11px] font-bold text-[#A68B6D]">{{ 'magazines.statTotal' | t }}</div>
            <div class="mt-1 text-2xl font-extrabold tabular-nums text-[#181A1D]">{{ items().length }}</div>
          </div>
          <div class="border-e border-[#EDE0D0] px-4 py-3.5 sm:px-5">
            <div class="text-[11px] font-bold text-[#A68B6D]">{{ 'magazines.statActive' | t }}</div>
            <div class="mt-1 text-2xl font-extrabold tabular-nums text-[#C27938]">{{ activeCount() }}</div>
          </div>
          <div class="px-4 py-3.5 sm:px-5">
            <div class="text-[11px] font-bold text-[#A68B6D]">{{ 'magazines.statInactive' | t }}</div>
            <div class="mt-1 text-2xl font-extrabold tabular-nums text-[#181A1D]">{{ inactiveCount() }}</div>
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-3 rounded-2xl border border-[#E8D5BE] bg-white p-3 sm:flex-row sm:items-center sm:gap-3 sm:p-4">
        <label class="relative min-w-0 flex-1">
          <span class="sr-only">{{ 'magazines.search' | t }}</span>
          <i class="pi pi-search pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-[#A68B6D]" aria-hidden="true"></i>
          <input
            type="search"
            class="min-h-11 w-full rounded-xl border border-[#E8D5BE] bg-[#FBF8F4] pe-3 ps-10 text-sm font-medium text-[#181A1D] outline-none placeholder:text-[#A68B6D] focus:border-[#C27938] focus:bg-white"
            [placeholder]="'magazines.search' | t"
            [value]="query()"
            (input)="onQueryChange(($any($event.target).value || '').toString())"
          />
        </label>

        <label class="sm:w-44">
          <span class="sr-only">{{ 'magazines.pharmacy' | t }}</span>
          <select
            class="min-h-11 w-full rounded-xl border border-[#E8D5BE] bg-white px-3 text-sm font-medium text-[#181A1D] outline-none focus:border-[#C27938]"
            [value]="pharmacyFilter()"
            (change)="onPharmacyChange($any($event.target).value)"
          >
            <option value="all">{{ 'magazines.allPharmacies' | t }}</option>
            @for (p of pharmacies; track p.code) {
              <option [value]="p.code">{{ locale.locale() === 'ar' ? p.nameAr : p.nameEn }}</option>
            }
          </select>
        </label>

        <div class="flex gap-1 rounded-xl bg-[#F8EEE2] p-1" role="group" [attr.aria-label]="'magazines.statusGroup' | t">
          @for (opt of statusTabs(); track opt.value) {
            <button
              type="button"
              class="min-h-10 min-w-[4.25rem] flex-1 rounded-lg px-3 text-xs font-bold sm:flex-none"
              [ngClass]="
                statusFilter() === opt.value
                  ? 'bg-white text-[#181A1D] shadow-sm'
                  : 'bg-transparent text-[#8A735C] hover:text-[#181A1D]'
              "
              (click)="onStatusChange(opt.value)"
            >
              {{ opt.label }}
            </button>
          }
        </div>
      </div>

      @if (loading()) {
        <div class="overflow-hidden rounded-2xl border border-[#E8D5BE] bg-white shadow-sm animate-pulse">
          <div class="border-b border-[#EDE0D0] bg-[#FBF8F4] px-4 py-3 flex items-center justify-between">
            <div class="h-4 w-32 rounded bg-[#E8D5BE]"></div>
            <div class="h-4 w-20 rounded bg-[#F3E7D8]"></div>
          </div>
          <div class="divide-y divide-[#F2E8DC] p-4 space-y-3">
            @for (row of [1, 2, 3, 4, 5]; track row) {
              <div class="flex items-center justify-between gap-4 pt-3 first:pt-0">
                <div class="flex items-center gap-3">
                  <div class="size-12 rounded-xl bg-[#F3E7D8]"></div>
                  <div class="space-y-1.5">
                    <div class="h-4 w-40 rounded bg-[#E8D5BE]"></div>
                    <div class="h-3 w-28 rounded bg-[#F8EEE2]"></div>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <div class="h-5 w-20 rounded-full bg-[#F3E7D8]"></div>
                  <div class="h-8 w-20 rounded-lg bg-[#E8D5BE]/60"></div>
                </div>
              </div>
            }
          </div>
        </div>
      } @else if (error()) {
        <div class="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-rose-200 bg-rose-50/50 p-8 text-center">
          <i class="pi pi-exclamation-triangle text-3xl text-rose-600" aria-hidden="true"></i>
          <p class="mt-2 text-sm font-bold text-rose-700">{{ 'magazines.error' | t }}</p>
          <button
            type="button"
            class="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl bg-[#181A1D] px-4 text-xs font-bold text-white hover:bg-black"
            (click)="reload()"
          >
            {{ 'common.retry' | t }}
          </button>
        </div>
      } @else {
        <div class="overflow-hidden rounded-2xl border border-[#E8D5BE] bg-white shadow-sm">
          <div class="overflow-x-auto">
            <table class="w-full text-start text-sm">
              <thead class="border-b border-[#EDE0D0] bg-[#FBF8F4] text-xs font-extrabold text-[#4A4038]">
                <tr>
                  <th class="px-4 py-3 text-start">{{ 'magazines.colCover' | t }}</th>
                  <th class="px-4 py-3 text-start">{{ 'magazines.colTitle' | t }}</th>
                  <th class="px-4 py-3 text-start">{{ 'magazines.pharmacy' | t }}</th>
                  <th class="px-4 py-3 text-start">{{ 'magazines.colFrom' | t }}</th>
                  <th class="px-4 py-3 text-start">{{ 'magazines.colUntil' | t }}</th>
                  <th class="px-4 py-3 text-start">{{ 'magazines.colOrder' | t }}</th>
                  <th class="px-4 py-3 text-start">{{ 'magazines.colStatus' | t }}</th>
                  <th class="px-4 py-3 text-start">{{ 'magazines.colActions' | t }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#EDE0D0]">
                @for (item of items(); track item.id) {
                  <tr class="hover:bg-[#FDFBF7]">
                    <td class="px-4 py-3">
                      <div class="size-14 overflow-hidden rounded-xl border border-[#E8D5BE] bg-[#FBF8F4]">
                        @if (item.coverImageUrl) {
                          <img [src]="item.coverImageUrl" [alt]="item.titleAr" class="size-full object-cover" />
                        } @else {
                          <div class="flex size-full items-center justify-center text-[#A68B6D]">
                            <i class="pi pi-image text-lg" aria-hidden="true"></i>
                          </div>
                        }
                      </div>
                    </td>
                    <td class="px-4 py-3">
                      <div class="font-extrabold text-[#181A1D]">{{ locale.locale() === 'ar' ? item.titleAr : item.titleEn }}</div>
                      <div class="text-xs text-[#8A735C]">{{ locale.locale() === 'ar' ? item.titleEn : item.titleAr }}</div>
                      @if (item.isExpired) {
                        <div class="mt-0.5 text-[11px] font-semibold text-rose-700">{{ 'magazines.expiredHint' | t }}</div>
                      }
                    </td>
                    <td class="px-4 py-3 font-semibold text-[#4A4038]">{{ pharmacyLabel(item.pharmacyCode) }}</td>
                    <td class="px-4 py-3 font-semibold tabular-nums text-[#4A4038]">{{ item.validFrom }}</td>
                    <td class="px-4 py-3 font-semibold tabular-nums text-[#4A4038]">{{ item.validUntil }}</td>
                    <td class="px-4 py-3 font-semibold tabular-nums text-[#4A4038]">{{ item.displayOrder }}</td>
                    <td class="px-4 py-3">
                      <span
                        class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold"
                        [ngClass]="
                          item.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-stone-200 text-stone-700'
                        "
                      >
                        <span
                          class="size-1.5 rounded-full"
                          [ngClass]="item.status === 'active' ? 'bg-emerald-600' : 'bg-stone-500'"
                        ></span>
                        {{ item.status === 'active' ? ('common.active' | t) : ('common.inactive' | t) }}
                      </span>
                    </td>
                    <td class="px-4 py-3">
                      <div class="flex items-center gap-2">
                        @if (item.pdfUrl) {
                          <a
                            [href]="item.pdfUrl"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="inline-flex size-9 items-center justify-center rounded-xl border border-[#E8D5BE] text-[#C27938] hover:bg-[#F8EEE2]"
                            [attr.aria-label]="'magazines.openPdf' | t"
                          >
                            <i class="pi pi-file-pdf" aria-hidden="true"></i>
                          </a>
                        }
                        <button
                          type="button"
                          class="inline-flex size-9 items-center justify-center rounded-xl border border-[#E8D5BE] text-[#181A1D] hover:bg-[#F8EEE2]"
                          [attr.aria-label]="'common.edit' | t"
                          (click)="editItem(item)"
                        >
                          <i class="pi pi-pencil" aria-hidden="true"></i>
                        </button>
                        <button
                          type="button"
                          class="inline-flex size-9 items-center justify-center rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50"
                          [attr.aria-label]="'common.delete' | t"
                          (click)="askRemove(item.id)"
                        >
                          <i class="pi pi-trash" aria-hidden="true"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="8" class="px-4 py-12 text-center text-sm font-medium text-[#8A735C]">
                      {{ 'magazines.empty' | t }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </section>

    @if (modalOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-[#181A1D]/50 p-4">
        <div
          class="max-h-[90dvh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[#E8D5BE] bg-white shadow-md"
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="'magazines.modalTitle' | t"
        >
          <div class="h-1.5 bg-[#C27938]"></div>
          <div class="sticky top-0 z-10 flex items-center justify-between border-b border-[#EDE0D0] bg-white px-5 py-4">
            <h2 class="text-lg font-extrabold text-[#181A1D]">{{ 'magazines.modalTitle' | t }}</h2>
            <button
              type="button"
              class="inline-flex size-10 items-center justify-center rounded-xl text-[#8A735C] hover:bg-[#F8EEE2]"
              [attr.aria-label]="'common.close' | t"
              (click)="closeModal()"
            >
              <i class="pi pi-times" aria-hidden="true"></i>
            </button>
          </div>

          <form class="space-y-4 px-5 py-5" [formGroup]="form" (ngSubmit)="save()">
            <label class="block space-y-1.5">
              <span class="text-xs font-bold text-[#4A4038]">{{ 'magazines.pharmacy' | t }} *</span>
              <select
                formControlName="pharmacyCode"
                class="min-h-11 w-full rounded-xl border border-[#E8D5BE] px-3 text-sm outline-none focus:border-[#C27938]"
              >
                <option value="">{{ 'magazines.selectPharmacy' | t }}</option>
                @for (p of pharmacies; track p.code) {
                  <option [value]="p.code">{{ locale.locale() === 'ar' ? p.nameAr : p.nameEn }}</option>
                }
              </select>
            </label>

            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label class="block space-y-1.5">
                <span class="text-xs font-bold text-[#4A4038]">{{ 'magazines.titleEn' | t }} *</span>
                <input type="text" formControlName="titleEn" class="min-h-11 w-full rounded-xl border border-[#E8D5BE] px-3 text-sm outline-none focus:border-[#C27938]" />
              </label>
              <label class="block space-y-1.5">
                <span class="text-xs font-bold text-[#4A4038]">{{ 'magazines.titleAr' | t }} *</span>
                <input type="text" formControlName="titleAr" dir="rtl" class="min-h-11 w-full rounded-xl border border-[#E8D5BE] px-3 text-sm outline-none focus:border-[#C27938]" />
              </label>
            </div>

            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label class="block space-y-1.5">
                <span class="text-xs font-bold text-[#4A4038]">{{ 'magazines.descEn' | t }}</span>
                <textarea rows="3" formControlName="descriptionEn" class="w-full rounded-xl border border-[#E8D5BE] px-3 py-2.5 text-sm outline-none focus:border-[#C27938]"></textarea>
              </label>
              <label class="block space-y-1.5">
                <span class="text-xs font-bold text-[#4A4038]">{{ 'magazines.descAr' | t }}</span>
                <textarea rows="3" formControlName="descriptionAr" dir="rtl" class="w-full rounded-xl border border-[#E8D5BE] px-3 py-2.5 text-sm outline-none focus:border-[#C27938]"></textarea>
              </label>
            </div>

            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label class="block space-y-1.5">
                <span class="text-xs font-bold text-[#4A4038]">{{ 'magazines.validFrom' | t }} *</span>
                <input type="date" formControlName="validFrom" class="min-h-11 w-full rounded-xl border border-[#E8D5BE] px-3 text-sm tabular-nums outline-none focus:border-[#C27938]" />
              </label>
              <label class="block space-y-1.5">
                <span class="text-xs font-bold text-[#4A4038]">{{ 'magazines.validUntil' | t }} *</span>
                <input type="date" formControlName="validUntil" class="min-h-11 w-full rounded-xl border border-[#E8D5BE] px-3 text-sm tabular-nums outline-none focus:border-[#C27938]" />
              </label>
            </div>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div class="space-y-2 rounded-xl border border-[#E8D5BE] bg-[#FBF8F4] p-3.5">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-[#4A4038]">{{ 'magazines.coverUrl' | t }}</span>
                  <span class="text-[11px] text-[#8A735C]">{{ 'magazines.coverHint' | t }}</span>
                </div>

                @if (effectiveCoverPreview()) {
                  <div class="relative overflow-hidden rounded-xl border border-[#E8D5BE] bg-white">
                    <img
                      [src]="effectiveCoverPreview()"
                      alt="Cover Preview"
                      class="h-32 w-full object-contain bg-[#181A1D]/5"
                    />
                    <button
                      type="button"
                      class="absolute end-2 top-2 inline-flex size-7 items-center justify-center rounded-lg bg-black/60 text-white hover:bg-black"
                      [attr.aria-label]="'magazines.removeFile' | t"
                      (click)="removeCoverFile()"
                    >
                      <i class="pi pi-times text-xs" aria-hidden="true"></i>
                    </button>
                  </div>
                }

                <div class="flex flex-col gap-2">
                  <label class="flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#E8D5BE] bg-white px-3 text-xs font-bold text-[#181A1D] shadow-sm hover:bg-[#F8EEE2]">
                    <i class="pi pi-upload text-xs text-[#C27938]" aria-hidden="true"></i>
                    {{ (pickedCoverFile() ? 'magazines.changeCover' : 'magazines.uploadCover') | t }}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      class="sr-only"
                      (change)="onCoverPicked($event)"
                    />
                  </label>

                  <div class="relative">
                    <input
                      type="url"
                      formControlName="coverImageUrl"
                      class="min-h-10 w-full rounded-xl border border-[#E8D5BE] bg-white px-3 text-xs outline-none placeholder:text-[#A68B6D] focus:border-[#C27938]"
                      [placeholder]="'magazines.orPasteUrl' | t"
                      (input)="onCoverUrlInput()"
                    />
                  </div>
                </div>
              </div>

              <div class="space-y-2 rounded-xl border border-[#E8D5BE] bg-[#FBF8F4] p-3.5">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-[#4A4038]">{{ 'magazines.pdfUrl' | t }}</span>
                  <span class="text-[11px] text-[#8A735C]">{{ 'magazines.pdfHint' | t }}</span>
                </div>

                @if (pickedPdfName()) {
                  <div class="flex items-center justify-between rounded-xl border border-[#E8D5BE] bg-white p-2.5">
                    <div class="flex items-center gap-2 min-w-0">
                      <div class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                        <i class="pi pi-file-pdf text-sm" aria-hidden="true"></i>
                      </div>
                      <div class="min-w-0">
                        <div class="truncate text-xs font-bold text-[#181A1D]">{{ pickedPdfName() }}</div>
                        <div class="text-[10px] text-[#8A735C]">{{ pickedPdfSize() }}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      class="inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-[#8A735C] hover:bg-rose-50 hover:text-rose-600"
                      [attr.aria-label]="'magazines.removeFile' | t"
                      (click)="removePdfFile()"
                    >
                      <i class="pi pi-trash text-xs" aria-hidden="true"></i>
                    </button>
                  </div>
                } @else if (form.controls.pdfUrl.value) {
                  <div class="flex items-center justify-between rounded-xl border border-[#E8D5BE] bg-white p-2.5">
                    <div class="flex items-center gap-2 min-w-0">
                      <div class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#F8EEE2] text-[#C27938]">
                        <i class="pi pi-link text-sm" aria-hidden="true"></i>
                      </div>
                      <div class="truncate text-xs font-semibold text-[#4A4038]">{{ form.controls.pdfUrl.value }}</div>
                    </div>
                    <a
                      [href]="form.controls.pdfUrl.value"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="inline-flex min-h-7 items-center gap-1 rounded-lg bg-[#F8EEE2] px-2 text-[11px] font-bold text-[#C27938] hover:bg-[#E8D5BE]"
                    >
                      <i class="pi pi-external-link text-[10px]" aria-hidden="true"></i>
                      {{ 'magazines.openPdf' | t }}
                    </a>
                  </div>
                }

                <div class="flex flex-col gap-2">
                  <label class="flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#E8D5BE] bg-white px-3 text-xs font-bold text-[#181A1D] shadow-sm hover:bg-[#F8EEE2]">
                    <i class="pi pi-upload text-xs text-[#C27938]" aria-hidden="true"></i>
                    {{ (pickedPdfFile() ? 'magazines.changePdf' : 'magazines.uploadPdf') | t }}
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      class="sr-only"
                      (change)="onPdfPicked($event)"
                    />
                  </label>

                  <div class="relative">
                    <input
                      type="url"
                      formControlName="pdfUrl"
                      class="min-h-10 w-full rounded-xl border border-[#E8D5BE] bg-white px-3 text-xs outline-none placeholder:text-[#A68B6D] focus:border-[#C27938]"
                      [placeholder]="'magazines.orPasteUrl' | t"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <label class="block space-y-1.5 sm:w-40">
                <span class="text-xs font-bold text-[#4A4038]">{{ 'magazines.displayOrder' | t }}</span>
                <input type="number" min="0" formControlName="displayOrder" class="min-h-11 w-full rounded-xl border border-[#E8D5BE] px-3 text-sm tabular-nums outline-none focus:border-[#C27938]" />
              </label>
              <label class="inline-flex min-h-11 cursor-pointer items-center gap-3">
                <span class="text-sm font-bold text-[#4A4038]">{{ 'magazines.activeLabel' | t }}</span>
                <button
                  type="button"
                  role="switch"
                  class="relative h-7 w-12 rounded-full"
                  [class.bg-[#C27938]]="form.controls.isActive.value"
                  [class.bg-[#E8D5BE]]="!form.controls.isActive.value"
                  [attr.aria-checked]="form.controls.isActive.value"
                  (click)="form.controls.isActive.setValue(!form.controls.isActive.value)"
                >
                  <span
                    class="absolute top-0.5 size-6 rounded-full bg-white shadow-sm"
                    [style.inset-inline-start]="form.controls.isActive.value ? '1.35rem' : '0.125rem'"
                  ></span>
                </button>
              </label>
            </div>

            <div class="flex items-center justify-end gap-2 border-t border-[#EDE0D0] pt-4">
              <button type="button" class="min-h-11 rounded-xl px-4 text-sm font-bold text-[#6B5A48] hover:bg-[#F8EEE2]" (click)="closeModal()">
                {{ 'common.cancel' | t }}
              </button>
              <button
                type="submit"
                class="min-h-11 rounded-xl bg-[#C27938] px-5 text-sm font-bold text-white hover:bg-[#A8682F] disabled:opacity-50"
                [disabled]="form.invalid || saving()"
              >
                @if (saving()) {
                  <i class="pi pi-spin pi-spinner me-2" aria-hidden="true"></i>
                }
                {{ 'common.save' | t }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }

    @if (pendingDeleteId()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-[#181A1D]/50 p-4">
        <div class="w-full max-w-sm rounded-2xl border border-[#E8D5BE] bg-white p-5 shadow-md" role="alertdialog" aria-modal="true">
          <h3 class="text-lg font-extrabold text-[#181A1D]">{{ 'magazines.confirmTitle' | t }}</h3>
          <p class="mt-2 text-pretty text-sm text-[#8A735C]">{{ 'magazines.confirmBody' | t }}</p>
          <div class="mt-5 flex justify-end gap-2">
            <button type="button" class="min-h-11 rounded-xl px-4 text-sm font-bold text-[#6B5A48] hover:bg-[#F8EEE2]" (click)="pendingDeleteId.set(null)">
              {{ 'common.cancel' | t }}
            </button>
            <button
              type="button"
              class="min-h-11 rounded-xl bg-rose-600 px-4 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50"
              [disabled]="saving()"
              (click)="confirmRemove()"
            >
              {{ 'common.delete' | t }}
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class MagazinesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly magazinesApi = inject(MagazineRepository);
  private readonly i18n = inject(I18nService);
  readonly locale = inject(LocaleService);
  private readonly notifications = inject(NotificationService);

  readonly pharmacies = PHARMACY_BRANDS;

  readonly query = signal('');
  readonly pharmacyFilter = signal('all');
  readonly statusFilter = signal<'all' | 'active' | 'inactive'>('all');
  readonly modalOpen = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly pendingDeleteId = signal<string | null>(null);
  readonly items = signal<Magazine[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal(false);

  // Upload state
  readonly pickedCoverFile = signal<File | null>(null);
  readonly coverPreviewUrl = signal<string | null>(null);
  readonly pickedPdfFile = signal<File | null>(null);
  readonly pickedPdfName = signal<string | null>(null);
  readonly pickedPdfSize = signal<string | null>(null);

  private queryTimer: ReturnType<typeof setTimeout> | null = null;

  readonly form = this.fb.nonNullable.group({
    pharmacyCode: ['', Validators.required],
    titleEn: ['', Validators.required],
    titleAr: ['', Validators.required],
    descriptionEn: [''],
    descriptionAr: [''],
    validFrom: ['', Validators.required],
    validUntil: ['', Validators.required],
    displayOrder: [0, [Validators.required, Validators.min(0)]],
    coverImageUrl: [''],
    pdfUrl: [''],
    isActive: [true]
  });

  readonly activeCount = computed(() => this.items().filter((i) => i.status === 'active').length);
  readonly inactiveCount = computed(() => this.items().filter((i) => i.status !== 'active').length);

  readonly effectiveCoverPreview = computed(() => {
    return this.coverPreviewUrl() || this.form.controls.coverImageUrl.value.trim() || null;
  });

  readonly statusTabs = computed(() => {
    this.locale.locale();
    return [
      { value: 'all' as const, label: this.i18n.t('common.all') },
      { value: 'active' as const, label: this.i18n.t('common.active') },
      { value: 'inactive' as const, label: this.i18n.t('common.inactive') }
    ];
  });

  ngOnInit(): void {
    this.reload();
  }

  pharmacyLabel(code: string): string {
    return pharmacyDisplayName(code, code, this.locale.locale());
  }

  onQueryChange(value: string): void {
    this.query.set(value);
    if (this.queryTimer) clearTimeout(this.queryTimer);
    this.queryTimer = setTimeout(() => this.reload(), 350);
  }

  onPharmacyChange(value: string): void {
    this.pharmacyFilter.set(value);
    this.reload();
  }

  onStatusChange(value: 'all' | 'active' | 'inactive'): void {
    this.statusFilter.set(value);
    this.reload();
  }

  openModal(): void {
    this.editingId.set(null);
    this.form.reset({
      pharmacyCode: '',
      titleEn: '',
      titleAr: '',
      descriptionEn: '',
      descriptionAr: '',
      validFrom: '',
      validUntil: '',
      displayOrder: 0,
      coverImageUrl: '',
      pdfUrl: '',
      isActive: true
    });
    this.clearMediaState();
    this.modalOpen.set(true);
  }

  editItem(item: Magazine): void {
    this.editingId.set(item.id);
    this.form.setValue({
      pharmacyCode: item.pharmacyCode,
      titleEn: item.titleEn,
      titleAr: item.titleAr,
      descriptionEn: item.descriptionEn,
      descriptionAr: item.descriptionAr,
      validFrom: item.validFrom,
      validUntil: item.validUntil,
      displayOrder: item.displayOrder,
      coverImageUrl: item.coverImageUrl ?? '',
      pdfUrl: item.pdfUrl ?? '',
      isActive: item.isActive
    });
    this.clearMediaState();
    if (item.coverImageUrl) {
      this.coverPreviewUrl.set(item.coverImageUrl);
    }
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.clearMediaState();
  }

  onCoverPicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (file.type && !allowed.includes(file.type)) {
      this.notifications.showError(this.i18n.t('magazines.imageTypeError'), this.i18n.t('magazines.uploadCover'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.notifications.showError(this.i18n.t('magazines.imageTooLarge'), this.i18n.t('magazines.uploadCover'));
      return;
    }

    this.revokeCoverPreview();
    this.pickedCoverFile.set(file);
    this.coverPreviewUrl.set(URL.createObjectURL(file));
  }

  removeCoverFile(): void {
    this.revokeCoverPreview();
    this.pickedCoverFile.set(null);
    this.coverPreviewUrl.set(null);
    this.form.controls.coverImageUrl.setValue('');
  }

  onCoverUrlInput(): void {
    if (this.pickedCoverFile()) {
      this.revokeCoverPreview();
      this.pickedCoverFile.set(null);
      this.coverPreviewUrl.set(null);
    }
  }

  onPdfPicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (!file) return;

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      this.notifications.showError(this.i18n.t('magazines.pdfTypeError'), this.i18n.t('magazines.uploadPdf'));
      return;
    }
    if (file.size > 35 * 1024 * 1024) {
      this.notifications.showError(this.i18n.t('magazines.pdfTooLarge'), this.i18n.t('magazines.uploadPdf'));
      return;
    }

    this.pickedPdfFile.set(file);
    this.pickedPdfName.set(file.name);
    this.pickedPdfSize.set(this.formatFileSize(file.size));
  }

  removePdfFile(): void {
    this.pickedPdfFile.set(null);
    this.pickedPdfName.set(null);
    this.pickedPdfSize.set(null);
    this.form.controls.pdfUrl.setValue('');
  }

  private formatFileSize(bytes: number): string {
    if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(1) + ' KB';
    }
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  private clearMediaState(): void {
    this.revokeCoverPreview();
    this.pickedCoverFile.set(null);
    this.coverPreviewUrl.set(null);
    this.pickedPdfFile.set(null);
    this.pickedPdfName.set(null);
    this.pickedPdfSize.set(null);
  }

  private revokeCoverPreview(): void {
    const prev = this.coverPreviewUrl();
    if (prev && prev.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(prev);
      } catch {
        // ignore
      }
    }
  }

  askRemove(id: string): void {
    this.pendingDeleteId.set(id);
  }

  confirmRemove(): void {
    const id = this.pendingDeleteId();
    if (!id) return;
    this.saving.set(true);
    this.magazinesApi
      .delete(id)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.pendingDeleteId.set(null);
          this.notifications.showSuccess(this.i18n.t('magazines.deleted'), this.i18n.t('magazines.title'));
          this.reload();
        },
        error: () => this.notifications.showError(this.i18n.t('magazines.error'), this.i18n.t('common.delete'))
      });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const coverFile = this.pickedCoverFile();
    const pdfFile = this.pickedPdfFile();
    this.saving.set(true);

    const uploadCover$ = coverFile
      ? this.magazinesApi.uploadCover(coverFile).pipe(map((res) => res.url))
      : of(value.coverImageUrl.trim() || null);

    const uploadPdf$ = pdfFile
      ? this.magazinesApi.uploadPdf(pdfFile).pipe(map((res) => res.url))
      : of(value.pdfUrl.trim() || null);

    forkJoin({ coverUrl: uploadCover$, pdfUrl: uploadPdf$ })
      .pipe(
        switchMap(({ coverUrl, pdfUrl }) => {
          const payload = {
            pharmacyCode: value.pharmacyCode,
            titleEn: value.titleEn,
            titleAr: value.titleAr,
            descriptionEn: value.descriptionEn,
            descriptionAr: value.descriptionAr,
            validFrom: value.validFrom,
            validUntil: value.validUntil,
            displayOrder: value.displayOrder,
            coverImageUrl: coverUrl,
            pdfUrl: pdfUrl,
            isActive: value.isActive
          };

          const editingId = this.editingId();
          return editingId
            ? this.magazinesApi.update(editingId, payload)
            : this.magazinesApi.create(payload);
        }),
        finalize(() => this.saving.set(false))
      )
      .subscribe({
        next: () => {
          this.notifications.showSuccess(this.i18n.t('magazines.saved'), this.i18n.t('magazines.modalTitle'));
          this.closeModal();
          this.reload();
        },
        error: (err) => {
          const msg = err?.error?.message || this.i18n.t('magazines.error');
          this.notifications.showError(msg, this.i18n.t('common.save'));
        }
      });
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(false);
    this.magazinesApi
      .listAdmin({
        query: this.query(),
        status: this.statusFilter(),
        pharmacy: this.pharmacyFilter()
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (rows) => this.items.set(rows),
        error: () => {
          this.error.set(true);
          this.items.set([]);
        }
      });
  }
}
