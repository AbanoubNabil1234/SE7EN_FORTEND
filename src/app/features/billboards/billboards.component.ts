import { Component, DestroyRef, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, Observable, switchMap } from 'rxjs';
import { Billboard } from '../../core/domain/models/billboard.model';
import { BillboardRepository } from '../../core/domain/repositories/billboard.repository';
import { I18nService } from '../../core/i18n/i18n.service';
import { LocaleService } from '../../core/services/locale.service';
import { NotificationService } from '../../core/services/notification.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-billboards',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  template: `
    <section class="w-full space-y-4 px-4 py-4 sm:px-5 sm:py-5" [attr.dir]="locale.isRtl() ? 'rtl' : 'ltr'">
      <!-- Command header -->
      <div class="overflow-hidden rounded-2xl border border-[#E8D5BE] bg-white shadow-sm">
        <div class="h-1.5 bg-[#C27938]"></div>
        <div class="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div class="min-w-0">
            <div class="inline-flex items-center gap-2 rounded-full bg-[#F8EEE2] px-3 py-1 text-[11px] font-bold text-[#C27938]">
              <span class="size-1.5 rounded-full bg-[#C27938]"></span>
              {{ 'billboards.live' | t }}
            </div>
            <h1 class="mt-3 text-balance text-3xl font-extrabold text-[#181A1D] sm:text-4xl">
              {{ 'billboards.title' | t }}
            </h1>
            <p class="mt-1.5 max-w-xl text-pretty text-sm font-medium text-[#8A735C]">
              {{ 'billboards.subtitle' | t }}
            </p>
          </div>
          <button
            type="button"
            class="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#181A1D] px-5 text-sm font-bold text-white hover:bg-black"
            (click)="openModal()"
          >
            <i class="pi pi-plus text-sm" aria-hidden="true"></i>
            {{ 'billboards.add' | t }}
          </button>
        </div>

        <div class="grid grid-cols-3 border-t border-[#EDE0D0]">
          <div class="border-e border-[#EDE0D0] px-4 py-3.5 sm:px-5">
            <div class="text-[11px] font-bold text-[#A68B6D]">{{ 'billboards.statTotal' | t }}</div>
            <div class="mt-1 text-2xl font-extrabold tabular-nums text-[#181A1D]">{{ items().length }}</div>
          </div>
          <div class="border-e border-[#EDE0D0] px-4 py-3.5 sm:px-5">
            <div class="text-[11px] font-bold text-[#A68B6D]">{{ 'billboards.statActive' | t }}</div>
            <div class="mt-1 text-2xl font-extrabold tabular-nums text-[#C27938]">{{ activeCount() }}</div>
          </div>
          <div class="px-4 py-3.5 sm:px-5">
            <div class="text-[11px] font-bold text-[#A68B6D]">{{ 'billboards.statInactive' | t }}</div>
            <div class="mt-1 text-2xl font-extrabold tabular-nums text-[#181A1D]">{{ inactiveCount() }}</div>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="flex flex-col gap-3 rounded-2xl border border-[#E8D5BE] bg-white p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-4">
        <label class="relative min-w-0 flex-1">
          <span class="sr-only">{{ 'billboards.search' | t }}</span>
          <i
            class="pi pi-search pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-[#A68B6D]"
            aria-hidden="true"
          ></i>
          <input
            type="search"
            class="min-h-11 w-full rounded-xl border border-[#E8D5BE] bg-[#FBF8F4] pe-3 ps-10 text-sm font-medium text-[#181A1D] outline-none placeholder:text-[#A68B6D] focus:border-[#C27938] focus:bg-white"
            [placeholder]="'billboards.search' | t"
            [value]="query()"
            (input)="onQueryChange(($any($event.target).value || '').toString())"
          />
        </label>

        <div
          class="flex w-full shrink-0 gap-1 rounded-xl bg-[#F8EEE2] p-1 sm:w-auto"
          role="group"
          [attr.aria-label]="'billboards.statusGroup' | t"
        >
          @for (opt of statusTabs(); track opt.value) {
            <button
              type="button"
              class="min-h-10 min-w-[4.5rem] flex-1 rounded-lg px-3.5 text-xs font-bold sm:flex-none"
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
        <div class="space-y-3 animate-pulse">
          @for (i of [1, 2, 3]; track i) {
            <article class="grid overflow-hidden rounded-2xl border border-[#E8D5BE] bg-white shadow-sm md:grid-cols-[240px_minmax(0,1fr)]">
              <div class="h-40 bg-[#F8EEE2]"></div>
              <div class="p-5 space-y-3">
                <div class="flex items-center gap-2">
                  <div class="h-5 w-16 rounded-full bg-[#E8D5BE]"></div>
                  <div class="h-5 w-20 rounded-full bg-[#F3E7D8]"></div>
                </div>
                <div class="h-5 w-2/3 rounded bg-[#E8D5BE]"></div>
                <div class="h-4 w-1/2 rounded bg-[#F8EEE2]"></div>
                <div class="pt-3 flex gap-2">
                  <div class="h-8 w-20 rounded-lg bg-[#E8D5BE]/60"></div>
                  <div class="h-8 w-20 rounded-lg bg-[#E8D5BE]/40"></div>
                </div>
              </div>
            </article>
          }
        </div>
      } @else if (error()) {
        <div class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
          {{ 'billboards.error' | t }}
        </div>
      } @else {
        <!-- List -->
        <div class="space-y-3">
          @for (item of filtered(); track item.id) {
            <article
              class="grid overflow-hidden rounded-2xl border border-[#E8D5BE] bg-white shadow-sm md:grid-cols-[240px_minmax(0,1fr)]"
            >
              <div class="relative min-h-[160px] bg-[#F8EEE2]">
                @if (item.imageUrl) {
                  <img [src]="item.imageUrl" [alt]="item.title" class="size-full object-cover" loading="lazy" />
                } @else {
                  <div class="flex h-full min-h-[160px] flex-col items-center justify-center gap-2.5 p-5 text-center">
                    <div class="inline-flex size-14 items-center justify-center rounded-xl bg-[#181A1D] text-[#E5BE96]">
                      <i class="pi pi-image text-xl" aria-hidden="true"></i>
                    </div>
                    <p class="line-clamp-2 max-w-[13rem] text-xs font-semibold text-pretty text-[#4A4038]">
                      {{ locale.locale() === 'ar' ? item.imageLabelAr : item.imageLabelEn }}
                    </p>
                  </div>
                }
                <span
                  class="absolute start-3 top-3 rounded-md px-2.5 py-1 text-[10px] font-extrabold uppercase"
                  [ngClass]="
                    item.status === 'active'
                      ? 'bg-[#181A1D] text-white'
                      : 'border border-[#E8D5BE] bg-white text-[#6B5A48]'
                  "
                >
                  {{ (item.status === 'active' ? 'common.active' : 'common.inactive') | t }}
                </span>
              </div>

              <div class="flex flex-col justify-between gap-5 p-5">
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div class="min-w-0">
                    <h2 class="text-balance text-xl font-extrabold text-[#181A1D]">{{ item.title }}</h2>
                    <p class="mt-1 text-sm font-medium text-[#8A735C]">{{ item.subtitle }}</p>
                    @if (item.isExpired) {
                      <p class="mt-1 text-xs font-semibold text-rose-700">{{ 'billboards.expiredHint' | t }}</p>
                    }
                    <div class="mt-3 flex flex-wrap gap-1.5">
                      @if (discountLabel(item); as discount) {
                        <span class="rounded-lg bg-[#181A1D] px-2.5 py-1 text-[11px] font-bold text-white">
                          {{ discount }}
                        </span>
                      }
                      <span class="rounded-lg bg-[#F8EEE2] px-2.5 py-1 text-[11px] font-bold text-[#4A4038]">
                        {{ locale.locale() === 'ar' ? item.imageLabelAr || ('billboards.imageFallback' | t) : item.imageLabelEn || ('billboards.imageFallback' | t) }}
                      </span>
                      <span class="rounded-lg border border-[#E8D5BE] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#6B5A48]">
                        {{ item.linkUrl || ('billboards.noLink' | t) }}
                      </span>
                    </div>
                  </div>
                  <div class="space-y-1 text-end">
                    <div
                      class="inline-flex items-center gap-1.5 rounded-lg bg-[#F8EEE2] px-2.5 py-1.5 text-xs font-bold tabular-nums text-[#4A4038]"
                    >
                      <i class="pi pi-calendar text-[11px] text-[#C27938]" aria-hidden="true"></i>
                      {{ item.startDate }}
                    </div>
                    <div class="text-[11px] font-semibold tabular-nums text-[#8A735C]">
                      {{ 'billboards.until' | t }}: {{ item.endDate }}
                      · {{ item.durationDays }} {{ 'billboards.days' | t }}
                    </div>
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    class="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[#E8D5BE] bg-white px-4 text-xs font-extrabold text-[#181A1D] hover:bg-[#F8EEE2] sm:flex-none sm:min-w-[7rem]"
                    (click)="editItem(item)"
                  >
                    <i class="pi pi-pencil" aria-hidden="true"></i>
                    {{ 'common.edit' | t }}
                  </button>
                  <button
                    type="button"
                    class="inline-flex size-11 items-center justify-center rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50"
                    [attr.aria-label]="'common.delete' | t"
                    (click)="askRemove(item.id)"
                  >
                    <i class="pi pi-trash" aria-hidden="true"></i>
                  </button>
                </div>
              </div>
            </article>
          } @empty {
            <div class="rounded-2xl border border-dashed border-[#E8D5BE] bg-white px-6 py-16 text-center">
              <div class="mx-auto inline-flex size-14 items-center justify-center rounded-2xl bg-[#F8EEE2] text-[#C27938]">
                <i class="pi pi-megaphone text-2xl" aria-hidden="true"></i>
              </div>
              <p class="mt-4 text-pretty text-sm font-medium text-[#8A735C]">{{ 'billboards.empty' | t }}</p>
              <button
                type="button"
                class="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#C27938] px-5 text-sm font-bold text-white"
                (click)="openModal()"
              >
                {{ 'billboards.add' | t }}
              </button>
            </div>
          }
        </div>
      }
    </section>

    @if (modalOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-[#181A1D]/50 p-4">
        <div
          class="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-[#E8D5BE] bg-white shadow-md"
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="'billboards.modalTitle' | t"
        >
          <div class="h-1.5 bg-[#C27938]"></div>
          <div class="sticky top-0 z-10 flex items-center justify-between border-b border-[#EDE0D0] bg-white px-5 py-4">
            <h2 class="text-lg font-extrabold text-[#181A1D]">{{ 'billboards.modalTitle' | t }}</h2>
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
              <span class="text-xs font-bold text-[#4A4038]">{{ 'billboards.fieldTitle' | t }} *</span>
              <input
                type="text"
                formControlName="title"
                class="min-h-11 w-full rounded-xl border border-[#E8D5BE] px-3 text-sm outline-none focus:border-[#C27938]"
              />
            </label>

            <label class="block space-y-1.5">
              <span class="text-xs font-bold text-[#4A4038]">{{ 'billboards.fieldDescription' | t }} *</span>
              <textarea
                rows="3"
                formControlName="description"
                class="w-full rounded-xl border border-[#E8D5BE] px-3 py-2.5 text-sm outline-none focus:border-[#C27938]"
              ></textarea>
            </label>

            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label class="block space-y-1.5">
                <span class="text-xs font-bold text-[#4A4038]">{{ 'billboards.fieldStart' | t }} *</span>
                <input
                  type="date"
                  formControlName="startDate"
                  class="min-h-11 w-full rounded-xl border border-[#E8D5BE] px-3 text-sm tabular-nums outline-none focus:border-[#C27938]"
                />
              </label>
              <label class="block space-y-1.5">
                <span class="text-xs font-bold text-[#4A4038]">{{ 'billboards.fieldDuration' | t }} *</span>
                <input
                  type="number"
                  min="1"
                  formControlName="durationDays"
                  class="min-h-11 w-full rounded-xl border border-[#E8D5BE] px-3 text-sm tabular-nums outline-none focus:border-[#C27938]"
                />
              </label>
            </div>

            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label class="block space-y-1.5">
                <span class="text-xs font-bold text-[#4A4038]">{{ 'billboards.fieldCtaAr' | t }}</span>
                <input
                  type="text"
                  formControlName="imageLabelAr"
                  class="min-h-11 w-full rounded-xl border border-[#E8D5BE] px-3 text-sm outline-none focus:border-[#C27938]"
                />
              </label>
              <label class="block space-y-1.5">
                <span class="text-xs font-bold text-[#4A4038]">{{ 'billboards.fieldCtaEn' | t }}</span>
                <input
                  type="text"
                  formControlName="imageLabelEn"
                  class="min-h-11 w-full rounded-xl border border-[#E8D5BE] px-3 text-sm outline-none focus:border-[#C27938]"
                />
              </label>
            </div>

            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label class="block space-y-1.5">
                <span class="text-xs font-bold text-[#4A4038]">{{ 'billboards.fieldPercentage' | t }}</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  formControlName="percentage"
                  class="min-h-11 w-full rounded-xl border border-[#E8D5BE] px-3 text-sm tabular-nums outline-none focus:border-[#C27938]"
                />
              </label>
              <label class="block space-y-1.5">
                <span class="text-xs font-bold text-[#4A4038]">{{ 'billboards.fieldFixedDiscount' | t }}</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  formControlName="fixedDiscount"
                  class="min-h-11 w-full rounded-xl border border-[#E8D5BE] px-3 text-sm tabular-nums outline-none focus:border-[#C27938]"
                />
              </label>
            </div>
            <p class="text-pretty text-xs font-medium text-[#8A735C]">{{ 'billboards.discountHint' | t }}</p>

            <label class="block space-y-1.5">
              <span class="text-xs font-bold text-[#4A4038]">{{ 'billboards.fieldLinkUrl' | t }}</span>
              <input
                type="text"
                formControlName="linkUrl"
                [placeholder]="'billboards.linkUrlPlaceholder' | t"
                class="min-h-11 w-full rounded-xl border border-[#E8D5BE] px-3 text-sm outline-none focus:border-[#C27938]"
              />
            </label>

            <div class="space-y-1.5">
              <span class="text-xs font-bold text-[#4A4038]">{{ 'billboards.fieldImage' | t }}</span>
              <div class="overflow-hidden rounded-xl border border-[#E8D5BE] bg-[#FBF8F4]">
                @if (previewUrl()) {
                  <img
                    [src]="previewUrl()"
                    [alt]="'billboards.fieldImage' | t"
                    class="h-40 w-full object-cover"
                  />
                }
                <label class="flex min-h-12 cursor-pointer items-center justify-center gap-2 px-4 text-sm font-bold text-[#181A1D] hover:bg-[#F8EEE2]">
                  <i class="pi pi-upload text-sm text-[#C27938]" aria-hidden="true"></i>
                  {{ (previewUrl() ? 'billboards.changeImage' : 'billboards.upload') | t }}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    class="sr-only"
                    (change)="onImagePicked($event)"
                  />
                </label>
              </div>
              <p class="text-pretty text-xs font-medium text-[#8A735C]">{{ 'billboards.imageHint' | t }}</p>
            </div>

            <div class="flex items-center justify-end gap-2 border-t border-[#EDE0D0] pt-4">
              <button
                type="button"
                class="min-h-11 rounded-xl px-4 text-sm font-bold text-[#6B5A48] hover:bg-[#F8EEE2]"
                (click)="closeModal()"
              >
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
        <div
          class="w-full max-w-sm rounded-2xl border border-[#E8D5BE] bg-white p-5 shadow-md"
          role="alertdialog"
          aria-modal="true"
          [attr.aria-label]="'billboards.confirmTitle' | t"
        >
          <h3 class="text-lg font-extrabold text-[#181A1D]">{{ 'billboards.confirmTitle' | t }}</h3>
          <p class="mt-2 text-pretty text-sm text-[#8A735C]">{{ 'billboards.confirmBody' | t }}</p>
          <div class="mt-5 flex justify-end gap-2">
            <button
              type="button"
              class="min-h-11 rounded-xl px-4 text-sm font-bold text-[#6B5A48] hover:bg-[#F8EEE2]"
              (click)="pendingDeleteId.set(null)"
            >
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
export class BillboardsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly billboards = inject(BillboardRepository);
  private readonly i18n = inject(I18nService);
  readonly locale = inject(LocaleService);
  private readonly notifications = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly query = signal('');
  readonly statusFilter = signal<'all' | 'active' | 'inactive'>('all');
  readonly modalOpen = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly pendingDeleteId = signal<string | null>(null);
  readonly items = signal<Billboard[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal(false);
  readonly previewUrl = signal<string | null>(null);
  readonly pickedFile = signal<File | null>(null);
  readonly existingImageUrl = signal<string | null>(null);

  private queryTimer: ReturnType<typeof setTimeout> | null = null;

  readonly form = this.fb.group({
    title: this.fb.nonNullable.control('', Validators.required),
    description: this.fb.nonNullable.control('', Validators.required),
    startDate: this.fb.nonNullable.control('', Validators.required),
    durationDays: this.fb.nonNullable.control(7, [Validators.required, Validators.min(1)]),
    imageLabelAr: this.fb.nonNullable.control(''),
    imageLabelEn: this.fb.nonNullable.control(''),
    percentage: this.fb.control<number | null>(null),
    fixedDiscount: this.fb.control<number | null>(null),
    linkUrl: this.fb.nonNullable.control('')
  });

  readonly activeCount = computed(() => this.items().filter((i) => i.status === 'active').length);
  readonly inactiveCount = computed(() => this.items().filter((i) => i.status !== 'active').length);

  readonly statusTabs = computed(() => {
    this.locale.locale();
    return [
      { value: 'all' as const, label: this.i18n.t('common.all') },
      { value: 'active' as const, label: this.i18n.t('common.active') },
      { value: 'inactive' as const, label: this.i18n.t('common.inactive') }
    ];
  });

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    return this.items().filter((item) => {
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.imageLabelAr.includes(q) ||
        item.imageLabelEn.toLowerCase().includes(q)
      );
    });
  });

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => this.revokePreview());
    this.reload();
  }

  onQueryChange(value: string): void {
    this.query.set(value);
    if (this.queryTimer) clearTimeout(this.queryTimer);
    this.queryTimer = setTimeout(() => this.reload(), 350);
  }

  onStatusChange(value: 'all' | 'active' | 'inactive'): void {
    this.statusFilter.set(value);
    this.reload();
  }

  openModal(): void {
    this.editingId.set(null);
    this.form.reset({
      title: '',
      description: '',
      startDate: '',
      durationDays: 7,
      imageLabelAr: '',
      imageLabelEn: '',
      percentage: null,
      fixedDiscount: null,
      linkUrl: ''
    });
    this.clearImageState();
    this.modalOpen.set(true);
  }

  editItem(item: Billboard): void {
    this.editingId.set(item.id);
    this.form.setValue({
      title: item.title,
      description: item.subtitle,
      startDate: item.startDate,
      durationDays: item.durationDays,
      imageLabelAr: item.imageLabelAr,
      imageLabelEn: item.imageLabelEn,
      percentage: item.percentage,
      fixedDiscount: item.fixedDiscount,
      linkUrl: item.linkUrl ?? ''
    });
    this.clearImageState();
    this.existingImageUrl.set(item.imageUrl);
    this.previewUrl.set(item.imageUrl);
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.clearImageState();
  }

  onImagePicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (file.type && !allowed.includes(file.type)) {
      this.notifications.showError(this.i18n.t('billboards.imageTypeError'), this.i18n.t('billboards.fieldImage'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.notifications.showError(this.i18n.t('billboards.imageTooLarge'), this.i18n.t('billboards.fieldImage'));
      return;
    }

    this.revokePreview();
    this.pickedFile.set(file);
    this.previewUrl.set(URL.createObjectURL(file));
  }

  askRemove(id: string): void {
    this.pendingDeleteId.set(id);
  }

  confirmRemove(): void {
    const id = this.pendingDeleteId();
    if (!id) return;
    this.saving.set(true);
    this.billboards
      .delete(id)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.pendingDeleteId.set(null);
          this.notifications.showSuccess(this.i18n.t('billboards.deleted'), this.i18n.t('billboards.title'));
          this.reload();
        },
        error: () => {
          this.notifications.showError(this.i18n.t('billboards.error'), this.i18n.t('common.delete'));
        }
      });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const editingId = this.editingId();
    const file = this.pickedFile();
    this.saving.set(true);

    const persist = (imageUrl: string | null): Observable<Billboard> => {
      const payload = {
        title: value.title,
        subtitle: value.description,
        startDate: value.startDate,
        durationDays: value.durationDays,
        imageUrl,
        imageLabelAr: value.imageLabelAr.trim() || null,
        imageLabelEn: value.imageLabelEn.trim() || null,
        percentage: this.normalizeDiscountInput(value.percentage),
        fixedDiscount: this.normalizeDiscountInput(value.fixedDiscount),
        linkUrl: value.linkUrl.trim() || null
      };
      return editingId ? this.billboards.update(editingId, payload) : this.billboards.create(payload);
    };

    const req$ = file
      ? this.billboards.uploadImage(file).pipe(switchMap((url) => persist(url)))
      : persist(this.existingImageUrl());

    req$.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.notifications.showSuccess(this.i18n.t('billboards.saved'), this.i18n.t('billboards.modalTitle'));
        this.closeModal();
        this.reload();
      },
      error: () => {
        this.notifications.showError(this.i18n.t('billboards.error'), this.i18n.t('common.save'));
      }
    });
  }

  discountLabel(item: Billboard): string | null {
    if (item.percentage != null && item.percentage > 0) {
      return `${item.percentage}${this.i18n.t('billboards.discountPercentSuffix')}`;
    }
    if (item.fixedDiscount != null && item.fixedDiscount > 0) {
      return `${item.fixedDiscount} ${this.i18n.t('billboards.discountCurrency')}`;
    }
    return null;
  }

  private normalizeDiscountInput(value: number | null | undefined): number | null {
    if (value == null) return null;
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  private reload(): void {
    this.loading.set(true);
    this.error.set(false);
    this.billboards
      .listAdmin({ query: this.query(), status: this.statusFilter() })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (rows) => this.items.set(rows),
        error: () => {
          this.error.set(true);
          this.items.set([]);
        }
      });
  }

  private clearImageState(): void {
    this.revokePreview();
    this.pickedFile.set(null);
    this.previewUrl.set(null);
    this.existingImageUrl.set(null);
  }

  private revokePreview(): void {
    const url = this.previewUrl();
    if (url?.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }
}
