import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { Coupon, CouponStatus } from '../../core/domain/models/coupon.model';
import { CouponRepository } from '../../core/domain/repositories/coupon.repository';
import { PHARMACY_BRANDS, pharmacyDisplayName } from '../../core/domain/pharmacy-brands';
import { I18nService } from '../../core/i18n/i18n.service';
import { LocaleService } from '../../core/services/locale.service';
import { NotificationService } from '../../core/services/notification.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-coupons',
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
              {{ 'coupons.badge' | t }}
            </div>
            <h1 class="mt-3 text-balance text-3xl font-extrabold text-[#181A1D] sm:text-4xl">
              {{ 'coupons.title' | t }}
            </h1>
            <p class="mt-1.5 max-w-xl text-pretty text-sm font-medium text-[#8A735C]">
              {{ 'coupons.subtitle' | t }}
            </p>
          </div>
          <button
            type="button"
            class="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#181A1D] px-5 text-sm font-bold text-white hover:bg-black"
            (click)="openModal()"
          >
            <i class="pi pi-plus text-sm" aria-hidden="true"></i>
            {{ 'coupons.add' | t }}
          </button>
        </div>

        <div class="grid grid-cols-2 border-t border-[#EDE0D0] sm:grid-cols-4">
          <div class="border-e border-b border-[#EDE0D0] px-4 py-3.5 sm:border-b-0 sm:px-5">
            <div class="text-[11px] font-bold text-[#A68B6D]">{{ 'coupons.statTotal' | t }}</div>
            <div class="mt-1 text-2xl font-extrabold tabular-nums text-[#181A1D]">{{ items().length }}</div>
          </div>
          <div class="border-b border-[#EDE0D0] px-4 py-3.5 sm:border-e sm:border-b-0 sm:px-5">
            <div class="text-[11px] font-bold text-[#A68B6D]">{{ 'coupons.statLive' | t }}</div>
            <div class="mt-1 text-2xl font-extrabold tabular-nums text-[#C27938]">{{ liveCount() }}</div>
          </div>
          <div class="border-e border-[#EDE0D0] px-4 py-3.5 sm:px-5">
            <div class="text-[11px] font-bold text-[#A68B6D]">{{ 'coupons.statCapped' | t }}</div>
            <div class="mt-1 text-2xl font-extrabold tabular-nums text-[#181A1D]">{{ cappedCount() }}</div>
          </div>
          <div class="px-4 py-3.5 sm:px-5">
            <div class="text-[11px] font-bold text-[#A68B6D]">{{ 'coupons.statInactive' | t }}</div>
            <div class="mt-1 text-2xl font-extrabold tabular-nums text-[#181A1D]">{{ inactiveCount() }}</div>
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-3 rounded-2xl border border-[#E8D5BE] bg-white p-3 sm:flex-row sm:items-center sm:gap-3 sm:p-4">
        <label class="relative min-w-0 flex-1">
          <span class="sr-only">{{ 'coupons.search' | t }}</span>
          <i class="pi pi-search pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-[#A68B6D]" aria-hidden="true"></i>
          <input
            type="search"
            class="min-h-11 w-full rounded-xl border border-[#E8D5BE] bg-[#FBF8F4] pe-3 ps-10 text-sm font-medium text-[#181A1D] outline-none placeholder:text-[#A68B6D] focus:border-[#C27938] focus:bg-white"
            [placeholder]="'coupons.search' | t"
            [value]="query()"
            (input)="onQueryChange(($any($event.target).value || '').toString())"
          />
        </label>

        <label class="sm:w-44">
          <span class="sr-only">{{ 'coupons.pharmacy' | t }}</span>
          <select
            class="min-h-11 w-full rounded-xl border border-[#E8D5BE] bg-white px-3 text-sm font-medium text-[#181A1D] outline-none focus:border-[#C27938]"
            [value]="pharmacyFilter()"
            (change)="onPharmacyChange($any($event.target).value)"
          >
            <option value="all">{{ 'coupons.allPharmacies' | t }}</option>
            @for (p of pharmacies; track p.code) {
              <option [value]="p.code">{{ locale.locale() === 'ar' ? p.nameAr : p.nameEn }}</option>
            }
          </select>
        </label>

        <div class="flex flex-wrap gap-1 rounded-xl bg-[#F8EEE2] p-1" role="group" [attr.aria-label]="'coupons.statusGroup' | t">
          @for (opt of statusTabs(); track opt.value) {
            <button
              type="button"
              class="min-h-10 min-w-[4.25rem] rounded-lg px-3 text-xs font-bold"
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
        <div class="rounded-2xl border border-[#E8D5BE] bg-white px-6 py-16 text-center text-sm font-medium text-[#8A735C]">
          {{ 'coupons.loading' | t }}
        </div>
      } @else if (error()) {
        <div class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
          {{ 'coupons.error' | t }}
        </div>
      } @else {
        <div class="overflow-hidden rounded-2xl border border-[#E8D5BE] bg-white shadow-sm">
          <div class="overflow-x-auto">
            <table class="min-w-full text-start text-sm">
              <thead class="border-b border-[#EDE0D0] bg-[#FBF8F4] text-[11px] font-bold uppercase text-[#8A735C]">
                <tr>
                  <th class="px-4 py-3 text-start">{{ 'coupons.colCode' | t }}</th>
                  <th class="px-4 py-3 text-start">{{ 'coupons.colTitle' | t }}</th>
                  <th class="px-4 py-3 text-start">{{ 'coupons.pharmacy' | t }}</th>
                  <th class="px-4 py-3 text-start">{{ 'coupons.validFrom' | t }}</th>
                  <th class="px-4 py-3 text-start">{{ 'coupons.validUntil' | t }}</th>
                  <th class="px-4 py-3 text-start">{{ 'coupons.colCopies' | t }}</th>
                  <th class="px-4 py-3 text-start">{{ 'coupons.colStatus' | t }}</th>
                  <th class="px-4 py-3 text-start">{{ 'coupons.colActions' | t }}</th>
                </tr>
              </thead>
              <tbody>
                @for (item of items(); track item.id) {
                  <tr class="border-b border-[#EDE0D0] last:border-0">
                    <td class="px-4 py-3">
                      <div class="flex items-center gap-1">
                        <span class="font-mono text-sm font-bold text-[#181A1D]">{{ item.code }}</span>
                        <button
                          type="button"
                          class="inline-flex size-9 items-center justify-center rounded-lg border border-[#E8D5BE] text-[#181A1D] hover:bg-[#F8EEE2]"
                          [attr.aria-label]="'coupons.copyCode' | t"
                          (click)="copyCode(item.code)"
                        >
                          <i class="pi pi-copy text-sm" aria-hidden="true"></i>
                        </button>
                      </div>
                    </td>
                    <td class="px-4 py-3">
                      <div class="font-bold text-[#181A1D]">
                        {{ locale.locale() === 'ar' ? item.titleAr : item.titleEn }}
                      </div>
                      @if (item.isExpired) {
                        <div class="mt-0.5 text-[11px] font-semibold text-rose-700">{{ 'coupons.expiredHint' | t }}</div>
                      } @else if (item.status === 'capped') {
                        <div class="mt-0.5 text-[11px] font-semibold text-[#8A735C]">{{ 'coupons.cappedHint' | t }}</div>
                      }
                    </td>
                    <td class="px-4 py-3 font-medium text-[#4A4038]">{{ pharmacyLabel(item.pharmacyCode) }}</td>
                    <td class="px-4 py-3 tabular-nums text-[#4A4038]">{{ item.validFrom }}</td>
                    <td class="px-4 py-3 tabular-nums text-[#4A4038]">{{ item.validUntil }}</td>
                    <td class="px-4 py-3 tabular-nums font-bold text-[#181A1D]">
                      {{ item.uniqueCopyCount }} / {{ item.maxCopies }}
                    </td>
                    <td class="px-4 py-3">
                      <span
                        class="inline-flex rounded-md px-2 py-1 text-[10px] font-extrabold uppercase"
                        [ngClass]="
                          item.status === 'live'
                            ? 'bg-[#181A1D] text-white'
                            : item.status === 'capped'
                              ? 'bg-[#C27938] text-white'
                              : 'border border-[#E8D5BE] bg-white text-[#6B5A48]'
                        "
                      >
                        {{ statusLabel(item.status) }}
                      </span>
                    </td>
                    <td class="px-4 py-3">
                      <div class="flex items-center gap-1">
                        <button
                          type="button"
                          class="inline-flex size-9 items-center justify-center rounded-lg border border-[#E8D5BE] text-[#181A1D] hover:bg-[#F8EEE2]"
                          [attr.aria-label]="'common.edit' | t"
                          (click)="editItem(item)"
                        >
                          <i class="pi pi-pencil text-sm" aria-hidden="true"></i>
                        </button>
                        <button
                          type="button"
                          class="inline-flex size-9 items-center justify-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                          [attr.aria-label]="'common.delete' | t"
                          (click)="askRemove(item.id)"
                        >
                          <i class="pi pi-trash text-sm" aria-hidden="true"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="8" class="px-4 py-12 text-center">
                      <p class="text-pretty text-sm text-[#8A735C]">{{ 'coupons.empty' | t }}</p>
                      <button
                        type="button"
                        class="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#181A1D] px-4 text-sm font-bold text-white hover:bg-black"
                        (click)="openModal()"
                      >
                        {{ 'coupons.emptyAction' | t }}
                      </button>
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
          [attr.aria-label]="'coupons.modalTitle' | t"
        >
          <div class="h-1.5 bg-[#C27938]"></div>
          <div class="sticky top-0 z-10 flex items-center justify-between border-b border-[#EDE0D0] bg-white px-5 py-4">
            <h2 class="text-balance text-lg font-extrabold text-[#181A1D]">{{ 'coupons.modalTitle' | t }}</h2>
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
              <span class="text-xs font-bold text-[#4A4038]">{{ 'coupons.pharmacy' | t }} *</span>
              <select
                formControlName="pharmacyCode"
                class="min-h-11 w-full rounded-xl border border-[#E8D5BE] px-3 text-sm outline-none focus:border-[#C27938]"
              >
                <option value="">{{ 'coupons.selectPharmacy' | t }}</option>
                @for (p of pharmacies; track p.code) {
                  <option [value]="p.code">{{ locale.locale() === 'ar' ? p.nameAr : p.nameEn }}</option>
                }
              </select>
            </label>

            <label class="block space-y-1.5">
              <span class="text-xs font-bold text-[#4A4038]">{{ 'coupons.fieldCode' | t }} *</span>
              <input
                type="text"
                formControlName="code"
                maxlength="64"
                class="min-h-11 w-full rounded-xl border border-[#E8D5BE] px-3 font-mono text-sm outline-none focus:border-[#C27938]"
              />
              <span class="text-pretty text-[11px] font-medium text-[#8A735C]">{{ 'coupons.codeHint' | t }}</span>
              @if (form.controls.code.touched && form.controls.code.invalid) {
                <span class="text-xs font-semibold text-rose-700">{{ 'coupons.fieldCode' | t }}</span>
              }
            </label>

            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label class="block space-y-1.5">
                <span class="text-xs font-bold text-[#4A4038]">{{ 'coupons.titleEn' | t }} *</span>
                <input type="text" formControlName="titleEn" class="min-h-11 w-full rounded-xl border border-[#E8D5BE] px-3 text-sm outline-none focus:border-[#C27938]" />
              </label>
              <label class="block space-y-1.5">
                <span class="text-xs font-bold text-[#4A4038]">{{ 'coupons.titleAr' | t }} *</span>
                <input type="text" formControlName="titleAr" dir="rtl" class="min-h-11 w-full rounded-xl border border-[#E8D5BE] px-3 text-sm outline-none focus:border-[#C27938]" />
              </label>
            </div>

            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label class="block space-y-1.5">
                <span class="text-xs font-bold text-[#4A4038]">{{ 'coupons.descEn' | t }}</span>
                <textarea rows="3" formControlName="descriptionEn" class="w-full rounded-xl border border-[#E8D5BE] px-3 py-2.5 text-sm outline-none focus:border-[#C27938]"></textarea>
              </label>
              <label class="block space-y-1.5">
                <span class="text-xs font-bold text-[#4A4038]">{{ 'coupons.descAr' | t }}</span>
                <textarea rows="3" formControlName="descriptionAr" dir="rtl" class="w-full rounded-xl border border-[#E8D5BE] px-3 py-2.5 text-sm outline-none focus:border-[#C27938]"></textarea>
              </label>
            </div>

            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label class="block space-y-1.5">
                <span class="text-xs font-bold text-[#4A4038]">{{ 'coupons.validFrom' | t }} *</span>
                <input type="date" formControlName="validFrom" class="min-h-11 w-full rounded-xl border border-[#E8D5BE] px-3 text-sm tabular-nums outline-none focus:border-[#C27938]" />
              </label>
              <label class="block space-y-1.5">
                <span class="text-xs font-bold text-[#4A4038]">{{ 'coupons.validUntil' | t }} *</span>
                <input type="date" formControlName="validUntil" class="min-h-11 w-full rounded-xl border border-[#E8D5BE] px-3 text-sm tabular-nums outline-none focus:border-[#C27938]" />
              </label>
            </div>

            <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <label class="block space-y-1.5 sm:w-40">
                <span class="text-xs font-bold text-[#4A4038]">{{ 'coupons.maxCopies' | t }} *</span>
                <input type="number" min="1" formControlName="maxCopies" class="min-h-11 w-full rounded-xl border border-[#E8D5BE] px-3 text-sm tabular-nums outline-none focus:border-[#C27938]" />
              </label>
              <label class="block space-y-1.5 sm:w-40">
                <span class="text-xs font-bold text-[#4A4038]">{{ 'coupons.displayOrder' | t }}</span>
                <input type="number" min="0" formControlName="displayOrder" class="min-h-11 w-full rounded-xl border border-[#E8D5BE] px-3 text-sm tabular-nums outline-none focus:border-[#C27938]" />
              </label>
              <label class="inline-flex min-h-11 cursor-pointer items-center gap-3">
                <span class="text-sm font-bold text-[#4A4038]">{{ 'coupons.activeLabel' | t }}</span>
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
                {{ 'common.save' | t }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }

    @if (pendingDeleteId()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-[#181A1D]/50 p-4">
        <div class="w-full max-w-sm rounded-2xl border border-[#E8D5BE] bg-white p-5 shadow-md" role="alertdialog" aria-modal="true" [attr.aria-labelledby]="'coupon-delete-title'">
          <h3 id="coupon-delete-title" class="text-balance text-lg font-extrabold text-[#181A1D]">{{ 'coupons.confirmTitle' | t }}</h3>
          <p class="mt-2 text-pretty text-sm text-[#8A735C]">{{ 'coupons.confirmBody' | t }}</p>
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
export class CouponsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly couponsApi = inject(CouponRepository);
  private readonly i18n = inject(I18nService);
  readonly locale = inject(LocaleService);
  private readonly notifications = inject(NotificationService);

  readonly pharmacies = PHARMACY_BRANDS;

  readonly query = signal('');
  readonly pharmacyFilter = signal('all');
  readonly statusFilter = signal<'all' | CouponStatus>('all');
  readonly modalOpen = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly pendingDeleteId = signal<string | null>(null);
  readonly items = signal<Coupon[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal(false);

  private queryTimer: ReturnType<typeof setTimeout> | null = null;

  readonly form = this.fb.nonNullable.group({
    pharmacyCode: ['', Validators.required],
    code: ['', Validators.required],
    titleEn: ['', Validators.required],
    titleAr: ['', Validators.required],
    descriptionEn: [''],
    descriptionAr: [''],
    validFrom: ['', Validators.required],
    validUntil: ['', Validators.required],
    maxCopies: [100, [Validators.required, Validators.min(1)]],
    displayOrder: [0, [Validators.required, Validators.min(0)]],
    isActive: [true]
  });

  readonly liveCount = computed(() => this.items().filter((i) => i.status === 'live').length);
  readonly cappedCount = computed(() => this.items().filter((i) => i.status === 'capped').length);
  readonly inactiveCount = computed(() => this.items().filter((i) => i.status === 'inactive').length);

  readonly statusTabs = computed(() => {
    this.locale.locale();
    return [
      { value: 'all' as const, label: this.i18n.t('common.all') },
      { value: 'live' as const, label: this.i18n.t('coupons.statusLive') },
      { value: 'capped' as const, label: this.i18n.t('coupons.statusCapped') },
      { value: 'scheduled' as const, label: this.i18n.t('coupons.statusScheduled') },
      { value: 'inactive' as const, label: this.i18n.t('coupons.statusInactive') }
    ];
  });

  ngOnInit(): void {
    this.reload();
  }

  pharmacyLabel(code: string): string {
    return pharmacyDisplayName(code, code, this.locale.locale());
  }

  statusLabel(status: CouponStatus): string {
    return this.i18n.t(`coupons.status${status.charAt(0).toUpperCase()}${status.slice(1)}`);
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

  onStatusChange(value: 'all' | CouponStatus): void {
    this.statusFilter.set(value);
    this.reload();
  }

  openModal(): void {
    this.editingId.set(null);
    this.form.reset({
      pharmacyCode: '',
      code: '',
      titleEn: '',
      titleAr: '',
      descriptionEn: '',
      descriptionAr: '',
      validFrom: '',
      validUntil: '',
      maxCopies: 100,
      displayOrder: 0,
      isActive: true
    });
    this.modalOpen.set(true);
  }

  editItem(item: Coupon): void {
    this.editingId.set(item.id);
    this.form.setValue({
      pharmacyCode: item.pharmacyCode,
      code: item.code,
      titleEn: item.titleEn,
      titleAr: item.titleAr,
      descriptionEn: item.descriptionEn,
      descriptionAr: item.descriptionAr,
      validFrom: item.validFrom,
      validUntil: item.validUntil,
      maxCopies: item.maxCopies,
      displayOrder: item.displayOrder,
      isActive: item.isActive
    });
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
  }

  askRemove(id: string): void {
    this.pendingDeleteId.set(id);
  }

  confirmRemove(): void {
    const id = this.pendingDeleteId();
    if (!id) return;
    this.saving.set(true);
    this.couponsApi
      .delete(id)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.pendingDeleteId.set(null);
          this.notifications.showSuccess(this.i18n.t('coupons.deleted'), this.i18n.t('coupons.title'));
          this.reload();
        },
        error: () => this.notifications.showError(this.i18n.t('coupons.error'), this.i18n.t('common.delete'))
      });
  }

  copyCode(code: string): void {
    void navigator.clipboard.writeText(code).then(
      () => this.notifications.showSuccess(this.i18n.t('coupons.copied'), this.i18n.t('coupons.title')),
      () => this.notifications.showError(this.i18n.t('coupons.error'), this.i18n.t('coupons.copyCode'))
    );
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const payload = {
      pharmacyCode: value.pharmacyCode,
      code: value.code.trim(),
      titleEn: value.titleEn,
      titleAr: value.titleAr,
      descriptionEn: value.descriptionEn,
      descriptionAr: value.descriptionAr,
      validFrom: value.validFrom,
      validUntil: value.validUntil,
      maxCopies: value.maxCopies,
      displayOrder: value.displayOrder,
      isActive: value.isActive
    };

    const editingId = this.editingId();
    this.saving.set(true);
    const req = editingId
      ? this.couponsApi.update(editingId, payload)
      : this.couponsApi.create(payload);

    req.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.notifications.showSuccess(this.i18n.t('coupons.saved'), this.i18n.t('coupons.modalTitle'));
        this.closeModal();
        this.reload();
      },
      error: () => this.notifications.showError(this.i18n.t('coupons.saveError'), this.i18n.t('common.save'))
    });
  }

  private reload(): void {
    this.loading.set(true);
    this.error.set(false);
    this.couponsApi
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
