import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { CatalogBrowseRepository } from '../../core/domain/repositories/catalog-browse.repository';
import { CatalogFamily, CatalogOffer, CatalogPack, familyMatchType, isConfirmedMatch } from '../../core/domain/models/catalog-family.model';
import {
  pharmacyDisplayName,
  pharmacyLogo as resolvePharmacyLogo
} from '../../core/domain/pharmacy-brands';
import { I18nService } from '../../core/i18n/i18n.service';
import { LocaleService } from '../../core/services/locale.service';
import { NotificationService } from '../../core/services/notification.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import {
  displayPackSize as formatPackSize,
  packChipLabel as formatPackChipLabel,
  packSizeDir as formatPackSizeDir
} from '../../core/domain/pack-size-display';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslatePipe, CurrencyPipe],
  template: `
    <section class="w-full space-y-3 px-4 py-4 sm:px-5 sm:py-5" [attr.dir]="locale.isRtl() ? 'rtl' : 'ltr'">
      @if (loading()) {
        <div class="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center text-sm font-medium text-slate-500">
          {{ 'productDetail.loading' | t }}
        </div>
      } @else if (error() || !family()) {
        <div class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-6 text-center text-sm font-medium text-rose-700">
          {{ 'productDetail.error' | t }}
        </div>
      } @else {
        @if (family(); as f) {
          <!-- Toolbar -->
          <div class="flex flex-wrap items-center gap-2 sm:gap-3">
            <a
              routerLink="/products"
              class="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <i
                class="pi text-xs"
                [class.pi-arrow-left]="!locale.isRtl()"
                [class.pi-arrow-right]="locale.isRtl()"
              ></i>
              {{ 'productDetail.back' | t }}
            </a>

            <div class="min-w-0 flex-1 truncate text-sm font-medium text-slate-500">{{ f.label }}</div>

            <div class="flex flex-wrap items-center gap-2">
              <code
                class="rounded-md bg-slate-900 px-2.5 py-1.5 font-mono text-xs font-bold tracking-wide text-white sm:text-sm"
              >
                {{ f.groupCode || '—' }}
              </code>
              @if (f.groupCode) {
                <button
                  type="button"
                  class="inline-flex min-h-9 items-center gap-1 rounded-lg border border-teal-700/30 bg-teal-50 px-3 text-xs font-bold text-teal-800 hover:bg-teal-100"
                  (click)="copyCode(f.groupCode!)"
                >
                  <i class="pi pi-copy text-xs"></i>
                  {{ 'productDetail.copyCode' | t }}
                </button>
              }
            </div>
          </div>

          <!-- Identity strip -->
          <div class="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
            <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
              <div
                class="mx-auto size-32 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 sm:mx-0"
              >
                @if (heroImage(f); as img) {
                  <img [src]="img" [alt]="f.label" class="size-full object-contain p-2" />
                } @else {
                  <div class="flex size-full items-center justify-center text-slate-300">
                    <i class="pi pi-image text-3xl"></i>
                  </div>
                }
              </div>

              <div class="min-w-0 flex-1 space-y-2">
                <div class="text-[11px] font-bold uppercase tracking-wider text-teal-700">
                  {{ f.brand || ('productDetail.unknownBrand' | t) }}
                </div>
                <h1 class="text-balance text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                  {{ f.label }}
                </h1>

                <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-slate-500">
                  @if (f.dosageForm) {
                    <span>{{ f.dosageForm }}</span>
                  }
                  @if (f.dosageForm && f.strength) {
                    <span class="text-slate-300" aria-hidden="true">·</span>
                  }
                  @if (f.strength) {
                    <span>{{ f.strength }}</span>
                  }
                  @if (f.dosageForm || f.strength) {
                    <span class="text-slate-300" aria-hidden="true">·</span>
                  }
                  <span>{{ pharmacyCount(f) }} {{ 'productDetail.pharmacies' | t }}</span>
                  @if (isConfirmedFamily(f)) {
                    <span class="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                      {{ 'productDetail.matchConfirmed' | t }}
                    </span>
                  }
                </div>

                <div class="pt-1 text-lg font-bold tabular-nums text-slate-900 sm:text-xl">
                  <span class="text-teal-700">{{ displayLowPrice() | currency: 'SAR':'symbol':'1.2-2' }}</span>
                  <span class="mx-1 font-semibold text-slate-400">–</span>
                  <span>{{ displayHighPrice() | currency: 'SAR':'symbol':'1.2-2' }}</span>
                </div>

                <div class="pt-1 text-[11px] text-slate-500">
                  <span class="font-semibold">{{ 'productDetail.familyKey' | t }}:</span>
                  <span class="ms-1 break-all font-mono">{{ f.familyKey }}</span>
                </div>
              </div>
            </div>
          </div>

          @if (f.packs.length > 1) {
            <div class="rounded-xl border border-slate-200 bg-white px-4 py-3 sm:px-5">
              <div class="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                {{ 'productDetail.sizesLabel' | t }}
              </div>
              <div
                class="flex flex-wrap gap-2"
                role="listbox"
                [attr.aria-label]="'productDetail.sizesLabel' | t"
              >
                @for (pack of f.packs; track pack.masterId) {
                  <button
                    type="button"
                    role="option"
                    [attr.aria-selected]="selectedMasterId() === pack.masterId"
                    class="inline-flex min-h-10 items-center justify-center rounded-lg border px-3.5 text-sm font-bold tabular-nums"
                    [ngClass]="
                      selectedMasterId() === pack.masterId
                        ? 'border-teal-700 bg-teal-700 text-white'
                        : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                    "
                    [attr.dir]="packSizeDir(pack.packSize)"
                    (click)="selectPack(pack.masterId)"
                  >
                    {{ packChipLabel(pack) }}
                  </button>
                }
              </div>
            </div>
          }

          @if (selectedPack()?.requiresPackReview) {
            <p class="mb-3 text-sm font-semibold text-amber-800">{{ 'productDetail.packReview' | t }}</p>
          }
          <!-- Offers table -->
          <div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div class="border-b border-slate-200 px-4 py-3 sm:px-5">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 class="text-sm font-bold text-slate-900">{{ 'productDetail.offers' | t }}</h2>
                  <p class="mt-0.5 text-xs text-slate-500">{{ 'productDetail.packsHint' | t }}</p>
                </div>
                @if (selectedPack(); as pack) {
                  <div class="text-xs font-bold tabular-nums text-slate-700">
                    {{ pack.lowestPrice | currency: 'SAR':'symbol':'1.2-2' }}
                    @if (pack.highestPrice > pack.lowestPrice) {
                      <span class="font-semibold text-slate-400">
                        – {{ pack.highestPrice | currency: 'SAR':'symbol':'1.2-2' }}
                      </span>
                    }
                  </div>
                }
              </div>
            </div>

            @if (selectedPack(); as pack) {
              @if (pack.offers.length === 0) {
                <div class="px-4 py-10 text-center text-sm text-slate-500">
                  {{ 'productDetail.emptyOffers' | t }}
                </div>
              } @else {
                <div class="divide-y divide-slate-100">
                  @for (offer of pack.offers; track offer.pharmacyCode + (offer.pharmacyProductId || offer.productUrl)) {
                    <div class="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-4 sm:grid-cols-3 sm:px-5 lg:grid-cols-6">
                      <!-- Pharmacy -->
                      <div class="col-span-2 sm:col-span-1">
                        <div class="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          {{ 'productDetail.colPharmacy' | t }}
                        </div>
                        <div class="flex items-center gap-2.5">
                          @if (pharmacyLogo(offer.pharmacyCode); as logo) {
                            <img
                              [src]="logo"
                              [alt]="pharmacyLabel(offer)"
                              class="size-9 shrink-0 rounded-lg border border-slate-200 bg-white object-contain p-0.5"
                            />
                          } @else {
                            <span
                              class="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700"
                            >
                              <i class="pi pi-shop text-sm"></i>
                            </span>
                          }
                          <span class="truncate text-sm font-semibold text-slate-900">{{ pharmacyLabel(offer) }}</span>
                        </div>
                      </div>

                      <!-- Pack -->
                      <div class="min-w-0">
                        <div class="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          {{ 'productDetail.colPack' | t }}
                        </div>
                        <div class="flex flex-col items-start gap-1.5">
                          <div
                            [attr.dir]="packSizeDir(offer.packSize)"
                            class="text-sm font-semibold tabular-nums text-slate-800"
                          >
                            {{ displayPackSize(offer.packSize) || ('productDetail.unknownOfferPack' | t) }}
                          </div>
                          @if (pack.barcode) {
                            <button
                              type="button"
                              class="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-teal-700/25 bg-teal-50 px-2 py-1.5 text-start hover:bg-teal-100"
                              [attr.aria-label]="'productDetail.copyBarcode' | t"
                              (click)="copyBarcode(pack.barcode!)"
                            >
                              <span dir="ltr" class="truncate font-mono text-xs font-bold tabular-nums text-slate-900">
                                {{ pack.barcode }}
                              </span>
                              <i class="pi pi-copy shrink-0 text-[11px] text-teal-700" aria-hidden="true"></i>
                            </button>
                          }
                        </div>
                      </div>

                      <!-- Price -->
                      <div>
                        <div class="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          {{ 'productDetail.colPrice' | t }}
                        </div>
                        <div class="text-sm font-bold tabular-nums text-teal-700">
                          {{ offer.price | currency: (offer.currency || 'SAR'):'symbol':'1.2-2' }}
                        </div>
                      </div>

                      <!-- Was -->
                      <div>
                        <div class="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          {{ 'productDetail.colWas' | t }}
                        </div>
                        <div class="text-sm tabular-nums text-slate-400 line-through">
                          @if (offer.oldPrice) {
                            {{ offer.oldPrice | currency: (offer.currency || 'SAR'):'symbol':'1.2-2' }}
                          } @else {
                            —
                          }
                        </div>
                      </div>

                      <!-- Availability -->
                      <div>
                        <div class="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          {{ 'productDetail.colAvailability' | t }}
                        </div>
                        <div class="text-sm font-medium text-slate-700">
                          {{ offer.availability || ('productDetail.inStock' | t) }}
                        </div>
                      </div>

                      <!-- Actions -->
                      <div class="col-span-2 sm:col-span-3 lg:col-span-1">
                        <div class="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          {{ 'productDetail.colActions' | t }}
                        </div>
                        <div class="flex flex-wrap items-center gap-1.5">
                          @if (offer.productUrl) {
                            <a
                              [href]="offer.productUrl"
                              target="_blank"
                              rel="noopener"
                              class="inline-flex min-h-8 items-center rounded-lg border border-slate-200 px-2.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50"
                            >
                              {{ 'productDetail.openOffer' | t }}
                            </a>
                          }
                          @if (offer.pharmacyProductId) {
                            <input
                              class="min-h-8 w-24 rounded-lg border border-slate-200 bg-white px-2 font-mono text-[11px] font-bold uppercase text-slate-900 outline-none focus:border-teal-700"
                              [placeholder]="'productDetail.pasteCode' | t"
                              [ngModel]="linkDrafts()[offer.pharmacyProductId!] || ''"
                              (ngModelChange)="setDraft(offer.pharmacyProductId!, $event)"
                            />
                            <button
                              type="button"
                              class="inline-flex min-h-8 items-center rounded-lg bg-teal-700 px-2.5 text-[11px] font-bold text-white hover:bg-teal-800 disabled:opacity-50"
                              [disabled]="linkingId() === offer.pharmacyProductId"
                              (click)="linkOffer(offer)"
                            >
                              {{ 'productDetail.link' | t }}
                            </button>
                          }
                        </div>
                      </div>
                    </div>
                  }
                </div>
              }
            } @else {
              <div class="px-4 py-10 text-center text-sm text-slate-500">
                {{ 'productDetail.emptyOffers' | t }}
              </div>
            }
          </div>
        }
      }
    </section>
  `
})
export class ProductDetailComponent implements OnInit {
  private readonly catalog = inject(CatalogBrowseRepository);
  private readonly route = inject(ActivatedRoute);
  private readonly notifications = inject(NotificationService);
  private readonly i18n = inject(I18nService);
  readonly locale = inject(LocaleService);

  readonly family = signal<CatalogFamily | null>(null);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly linkDrafts = signal<Record<string, string>>({});
  readonly linkingId = signal<string | null>(null);
  readonly selectedMasterId = signal<string | null>(null);

  readonly selectedPack = computed(() => {
    const f = this.family();
    const id = this.selectedMasterId();
    if (!f?.packs.length) return null;
    return f.packs.find((p) => p.masterId === id) ?? f.packs[0] ?? null;
  });

  readonly displayLowPrice = computed(() => {
    const pack = this.selectedPack();
    if (pack) return pack.lowestPrice > 0 ? pack.lowestPrice : 0;
    return 0;
  });

  readonly displayHighPrice = computed(() => {
    const pack = this.selectedPack();
    if (pack) return pack.highestPrice > 0 ? pack.highestPrice : 0;
    return 0;
  });

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const key = params.get('key')?.trim() || '';
      if (!key) {
        this.error.set(true);
        this.family.set(null);
        this.selectedMasterId.set(null);
        return;
      }
      this.load(key);
    });
  }

  selectPack(masterId: string): void {
    this.selectedMasterId.set(masterId);
  }

  packChipLabel(pack: CatalogPack): string {
    return formatPackChipLabel(pack.packSize, pack.label, { locale: this.locale.locale() });
  }

  pharmacyLabel(offer: CatalogOffer): string {
    return pharmacyDisplayName(offer.pharmacyCode, offer.pharmacyName, this.locale.locale());
  }

  pharmacyLogo(code: string | null | undefined): string | null {
    return resolvePharmacyLogo(code);
  }

  heroImage(f: CatalogFamily): string | null {
    if (f.imageUrl) return f.imageUrl;
    return f.packs.flatMap((p) => p.offers.map((o) => o.imageUrl)).find((u): u is string => !!u) ?? null;
  }

  pharmacyCount(f: CatalogFamily): number {
    const codes = new Set(
      f.packs.flatMap((p) => p.offers.map((o) => o.pharmacyCode.toLowerCase()).filter(Boolean))
    );
    return codes.size || f.packs.reduce((max, p) => Math.max(max, p.pharmacyCount), 0);
  }

  isConfirmedFamily(f: CatalogFamily): boolean {
    return isConfirmedMatch(familyMatchType(f));
  }

  displayPackSize(packSize: string | null | undefined): string {
    return formatPackSize(packSize, this.locale.locale());
  }

  packSizeDir(packSize: string | null | undefined): 'ltr' | null {
    return formatPackSizeDir(this.displayPackSize(packSize));
  }

  copyCode(code: string): void {
    void navigator.clipboard.writeText(code).then(() => {
      this.notifications.showSuccess(this.i18n.t('productDetail.copied'), code);
    });
  }

  copyBarcode(barcode: string): void {
    void navigator.clipboard.writeText(barcode).then(() => {
      this.notifications.showSuccess(this.i18n.t('productDetail.barcodeCopied'), barcode);
    });
  }

  setDraft(id: string, value: string): void {
    this.linkDrafts.update((m) => ({ ...m, [id]: value }));
  }

  linkOffer(offer: CatalogOffer): void {
    const id = offer.pharmacyProductId;
    if (!id) return;
    const code = (this.linkDrafts()[id] || '').trim();
    if (!code) {
      this.notifications.showError(this.i18n.t('productDetail.codeRequired'), this.i18n.t('productDetail.link'));
      return;
    }
    this.linkingId.set(id);
    this.catalog
      .linkByGroupCode(id, code)
      .pipe(finalize(() => this.linkingId.set(null)))
      .subscribe({
        next: (res) => {
          this.notifications.showSuccess(this.i18n.t('productDetail.linkedOk'), res.code);
          const key = this.family()?.familyKey;
          if (key) this.load(key);
        },
        error: () => {
          this.notifications.showError(this.i18n.t('productDetail.linkedFail'), this.i18n.t('productDetail.link'));
        }
      });
  }

  private applyFamily(family: CatalogFamily): void {
    const prev = this.selectedMasterId();
    const stillThere = prev && family.packs.some((p) => p.masterId === prev);
    this.family.set(family);
    this.selectedMasterId.set(stillThere ? prev : family.packs[0]?.masterId ?? null);
  }

  private load(familyKey: string): void {
    this.loading.set(true);
    this.error.set(false);
    this.catalog
      .getFamilyByKey(familyKey)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (family) => this.applyFamily(family),
        error: () => {
          this.error.set(true);
          this.family.set(null);
          this.selectedMasterId.set(null);
        }
      });
  }
}
