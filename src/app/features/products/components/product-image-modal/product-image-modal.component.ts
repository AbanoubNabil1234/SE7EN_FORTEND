import {
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { CatalogBrowseRepository } from '../../../../core/domain/repositories/catalog-browse.repository';
import {
  CatalogFamily,
  CatalogPack,
  ProductImagesResponse,
  ProductPharmacyImageOption,
  catalogFamilyTitle
} from '../../../../core/domain/models/catalog-family.model';
import { pharmacyLogo as resolvePharmacyLogo } from '../../../../core/domain/pharmacy-brands';
import { resolveApiUrl } from '../../../../core/infrastructure/http/api-origin';
import { LocaleService } from '../../../../core/services/locale.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-product-image-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (isOpen() && family()) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
        role="dialog"
        aria-modal="true"
        (keydown.escape)="onClose()"
      >
        <!-- Backdrop click listener -->
        <div class="fixed inset-0" (click)="onClose()"></div>

        <!-- Modal Box -->
        <div
          class="relative w-full max-w-2xl max-h-[90vh] rounded-3xl bg-white shadow-2xl flex flex-col overflow-hidden border border-[#E8D5BE] dark:border-neutral-800 dark:bg-neutral-900 z-10"
          [attr.dir]="isRtl() ? 'rtl' : 'ltr'"
          (click)="$event.stopPropagation()"
        >
          <!-- Header -->
          <div class="px-6 py-4 border-b border-[#EDE0D0] dark:border-neutral-800 bg-[#FBF8F4] dark:bg-neutral-950/60 flex items-center justify-between gap-3 shrink-0">
            <div class="flex items-center gap-3 min-w-0">
              <div class="flex size-10 items-center justify-center rounded-2xl bg-[#F8EEE2] text-[#C27938] dark:bg-neutral-800 shrink-0 shadow-xs">
                <i class="pi pi-image text-lg"></i>
              </div>
              <div class="min-w-0">
                <h3 class="text-base font-extrabold text-[#181A1D] dark:text-white truncate">
                  تغيير صورة المنتج
                </h3>
                <p class="text-xs font-medium text-[#8A735C] dark:text-neutral-400 truncate">
                  {{ displayTitle() }}
                </p>
              </div>
            </div>

            <button
              type="button"
              (click)="onClose()"
              [disabled]="submitting()"
              class="flex size-8 items-center justify-center rounded-full text-[#A68B6D] hover:bg-[#F8EEE2] hover:text-[#181A1D] transition-colors dark:hover:bg-neutral-800"
              title="إغلاق"
            >
              <i class="pi pi-times text-sm"></i>
            </button>
          </div>

          <!-- Pack Selector (if family has multiple packs/masters) -->
          @if (family()!.packs.length > 1) {
            <div class="px-6 py-2.5 bg-[#F8EEE2]/40 dark:bg-neutral-800/40 border-b border-[#EDE0D0]/80 dark:border-neutral-800 flex items-center gap-2 overflow-x-auto shrink-0">
              <span class="text-xs font-bold text-[#8A735C] dark:text-neutral-400 shrink-0">حجم العبوة:</span>
              <div class="flex items-center gap-1.5 flex-nowrap">
                @for (p of family()!.packs; track p.masterId) {
                  <button
                    type="button"
                    (click)="selectMaster(p.masterId)"
                    [class]="activeMasterId() === p.masterId
                      ? 'bg-[#C27938] text-white shadow-xs'
                      : 'bg-white dark:bg-neutral-800 text-[#181A1D] dark:text-neutral-300 border border-[#EDE0D0] dark:border-neutral-700 hover:bg-[#F8EEE2]'"
                    class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap"
                  >
                    {{ p.packSize || p.label }}
                  </button>
                }
              </div>
            </div>
          }

          <!-- Modal Body (Scrollable) -->
          <div class="p-6 overflow-y-auto space-y-5 flex-1">
            <!-- Current Hero Banner -->
            <div class="flex items-center gap-4 p-3.5 rounded-2xl border border-[#EDE0D0] bg-[#FBF8F4]/80 dark:border-neutral-800 dark:bg-neutral-950/40">
              <div class="relative size-20 shrink-0 overflow-hidden rounded-xl border border-[#E8D5BE] bg-white dark:border-neutral-700 dark:bg-neutral-900 flex items-center justify-center shadow-xs">
                @if (currentPreviewImage()) {
                  <img
                    [src]="resolveApiUrl(currentPreviewImage())"
                    [alt]="displayTitle()"
                    class="size-full object-contain p-1"
                    (error)="onImgFallback($event)"
                  />
                } @else {
                  <i class="pi pi-image text-2xl text-[#C27938]/40"></i>
                }
              </div>

              <div class="min-w-0 flex-1 space-y-1">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-bold text-[#181A1D] dark:text-white">الصورة الحالية للمنتج</span>
                  @if (hasCustomImage()) {
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#C27938]/10 text-[#C27938] border border-[#C27938]/20">
                      صورة مخصصة
                    </span>
                  } @else {
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-neutral-800 dark:text-neutral-400">
                      تلقائية من الصيدليات
                    </span>
                  }
                </div>
                <p class="text-xs text-[#8A735C] dark:text-neutral-400 line-clamp-1">
                  {{ hasCustomImage() ? 'تم تعيين هذه الصورة يدوياً وتظهر كصورة رئيسية للمنتج في البحث والمتجر.' : 'يتم اختيار الصورة تلقائياً من عروض الصيدليات المرتبطة.' }}
                </p>
                @if (hasCustomImage()) {
                  <button
                    type="button"
                    (click)="revertToAutoImage()"
                    [disabled]="submitting()"
                    class="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:underline pt-0.5"
                  >
                    <i class="pi pi-refresh text-[10px]"></i>
                    استعادة الصورة التلقائية
                  </button>
                }
              </div>
            </div>

            <!-- Tab Navigation for Image Source -->
            <div class="flex rounded-2xl bg-[#F8EEE2]/60 dark:bg-neutral-800/60 p-1 border border-[#EDE0D0] dark:border-neutral-700">
              <button
                type="button"
                (click)="activeTab.set('offers')"
                [class]="activeTab() === 'offers'
                  ? 'bg-white dark:bg-neutral-900 text-[#C27938] font-black shadow-xs'
                  : 'text-[#8A735C] dark:text-neutral-400 font-bold hover:text-[#181A1D]'"
                class="flex-1 py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <i class="pi pi-th-large text-xs"></i>
                صور عروض الصيدليات ({{ pharmacyOfferImages().length }})
              </button>

              <button
                type="button"
                (click)="activeTab.set('upload')"
                [class]="activeTab() === 'upload'
                  ? 'bg-white dark:bg-neutral-900 text-[#C27938] font-black shadow-xs'
                  : 'text-[#8A735C] dark:text-neutral-400 font-bold hover:text-[#181A1D]'"
                class="flex-1 py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <i class="pi pi-upload text-xs"></i>
                رفع من الجهاز
              </button>

              <button
                type="button"
                (click)="activeTab.set('url')"
                [class]="activeTab() === 'url'
                  ? 'bg-white dark:bg-neutral-900 text-[#C27938] font-black shadow-xs'
                  : 'text-[#8A735C] dark:text-neutral-400 font-bold hover:text-[#181A1D]'"
                class="flex-1 py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <i class="pi pi-link text-xs"></i>
                رابط صورة خارجي
              </button>
            </div>

            <!-- Tab 1: Pharmacy Offers Images -->
            @if (activeTab() === 'offers') {
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-[#181A1D] dark:text-white">اختر صورة من أي صيدلية مرتبطة:</span>
                  <span class="text-[11px] text-[#8A735C] dark:text-neutral-400">نقرة واحدة لتثبيت الصورة</span>
                </div>

                @if (loadingImages()) {
                  <div class="flex flex-col items-center justify-center py-10 text-[#C27938]">
                    <i class="pi pi-spin pi-spinner text-2xl mb-2"></i>
                    <span class="text-xs font-bold">جاري تحميل صور الصيدليات...</span>
                  </div>
                } @else if (pharmacyOfferImages().length === 0) {
                  <div class="text-center py-8 px-4 rounded-2xl border border-dashed border-[#EDE0D0] dark:border-neutral-800 text-[#8A735C] dark:text-neutral-400">
                    <i class="pi pi-info-circle text-2xl mb-1.5 block opacity-50"></i>
                    <p class="text-xs font-bold">لا توجد صور متوفرة في عروض الصيدليات لهذا المنتج.</p>
                    <p class="text-[11px] mt-1">يمكنك رفع صورة من جهازك أو وضع رابط صورة مباشر.</p>
                  </div>
                } @else {
                  <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    @for (img of pharmacyOfferImages(); track img.pharmacyProductId) {
                      <div
                        (click)="selectPharmacyImage(img)"
                        class="group relative flex flex-col rounded-2xl border p-3 transition-all cursor-pointer overflow-hidden"
                        [class]="isImageActive(img)
                          ? 'border-[#C27938] bg-[#F8EEE2]/60 dark:bg-neutral-800/90 shadow-sm ring-2 ring-[#C27938]/30'
                          : 'border-[#EDE0D0] bg-white hover:border-[#C27938]/60 hover:bg-[#FBF8F4] dark:border-neutral-800 dark:bg-neutral-900'"
                      >
                        <!-- Pharmacy Tag & Price -->
                        <div class="flex items-center justify-between gap-1 mb-2">
                          <div class="flex items-center gap-1.5 min-w-0">
                            @if (pharmacyLogo(img.pharmacyCode); as logo) {
                              <img [src]="logo" [alt]="img.pharmacyName" class="size-4 rounded-full object-contain shrink-0" />
                            }
                            <span class="text-[11px] font-extrabold text-[#181A1D] dark:text-white truncate">
                              {{ img.pharmacyName || img.pharmacyCode }}
                            </span>
                          </div>
                          @if (img.price) {
                            <span class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                              {{ img.price }} ر.س
                            </span>
                          }
                        </div>

                        <!-- Image Preview -->
                        <div class="relative aspect-square w-full rounded-xl bg-white dark:bg-neutral-950 flex items-center justify-center overflow-hidden p-2 border border-[#EDE0D0]/50 dark:border-neutral-800">
                          <img
                            [src]="resolveApiUrl(img.imageUrl)"
                            [alt]="img.pharmacyName"
                            class="size-full object-contain transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                            (error)="onImgFallback($event)"
                          />

                          @if (isImageActive(img)) {
                            <div class="absolute top-1.5 end-1.5 size-5 rounded-full bg-[#C27938] text-white flex items-center justify-center text-[10px] shadow-xs">
                              <i class="pi pi-check"></i>
                            </div>
                          }
                        </div>

                        <!-- Action button label -->
                        <div class="mt-2 text-center">
                          <span
                            [class]="isImageActive(img)
                              ? 'text-[#C27938] font-black'
                              : 'text-[#8A735C] group-hover:text-[#C27938] font-bold'"
                            class="text-[11px] transition-colors"
                          >
                            {{ isImageActive(img) ? 'الصورة المعتمدة' : 'تعيين كصورة رئيسية' }}
                          </span>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            }

            <!-- Tab 2: Upload from Device -->
            @if (activeTab() === 'upload') {
              <div class="space-y-4">
                <div class="flex flex-col items-center justify-center">
                  <div
                    class="relative size-44 overflow-hidden rounded-2xl border-2 border-dashed border-[#E8D5BE] bg-[#FBF8F4] dark:border-neutral-700 dark:bg-neutral-950 flex items-center justify-center group shadow-inner"
                  >
                    @if (selectedFilePreview()) {
                      <img
                        [src]="selectedFilePreview()"
                        alt="Preview"
                        class="size-full object-contain p-2"
                      />
                    } @else {
                      <div class="text-center p-4 text-[#A68B6D]">
                        <i class="pi pi-upload text-3xl mb-1.5 block opacity-60 text-[#C27938]"></i>
                        <span class="text-xs font-bold block text-[#181A1D] dark:text-neutral-200">اختر ملف صورة من جهازك</span>
                        <span class="text-[10px] text-[#8A735C] dark:text-neutral-400 mt-1 block">JPG, PNG, WebP حتى 8 ميجابايت</span>
                      </div>
                    }
                  </div>

                  @if (selectedFile()) {
                    <div class="mt-2.5 flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      <i class="pi pi-check-circle"></i>
                      <span>{{ selectedFile()!.name }} ({{ formatFileSize(selectedFile()!.size) }})</span>
                      <button
                        type="button"
                        (click)="clearSelectedFile()"
                        class="text-rose-500 hover:text-rose-700 ms-1 text-[11px] underline"
                      >
                        إلغاء
                      </button>
                    </div>
                  }
                </div>

                <div class="space-y-2">
                  <label class="flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-[#E8D5BE] bg-[#FBF8F4] px-4 text-xs font-bold text-[#181A1D] hover:bg-[#F8EEE2] transition-colors dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:hover:bg-neutral-750">
                    <i class="pi pi-folder-open text-base text-[#C27938]"></i>
                    <span>{{ selectedFile() ? 'تغيير الملف المختار' : 'استعراض واختيار ملف من الجهاز' }}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      class="sr-only"
                      [disabled]="submitting()"
                      (change)="onFilePicked($event)"
                    />
                  </label>
                  <p class="text-center text-[11px] text-[#8A735C] dark:text-neutral-400">
                    سيتم تحويل الصورة تلقائياً وبأعلى جودة إلى تنسيق WebP السريع والموفر للمساحة.
                  </p>
                </div>

                @if (selectedFile()) {
                  <button
                    type="button"
                    (click)="submitUploadedFile()"
                    [disabled]="submitting()"
                    class="w-full py-2.5 px-4 rounded-xl bg-[#C27938] hover:bg-[#a6642a] text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    @if (submitting()) {
                      <i class="pi pi-spin pi-spinner text-sm"></i>
                      <span>جاري الرفع والتحويل...</span>
                    } @else {
                      <i class="pi pi-check text-sm"></i>
                      <span>حفظ كصورة رئيسية للمنتج</span>
                    }
                  </button>
                }
              </div>
            }

            <!-- Tab 3: External URL -->
            @if (activeTab() === 'url') {
              <div class="space-y-4">
                <div>
                  <label class="block text-xs font-bold text-[#181A1D] dark:text-white mb-1.5">
                    أدخل رابط الصورة المباشر (URL):
                  </label>
                  <div class="relative">
                    <input
                      type="url"
                      [(ngModel)]="urlInput"
                      placeholder="https://example.com/product-image.jpg"
                      class="w-full rounded-xl border border-[#EDE0D0] dark:border-neutral-700 bg-[#FBF8F4] dark:bg-neutral-800 px-3.5 py-2.5 text-xs text-[#181A1D] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#C27938]/40"
                      [disabled]="submitting()"
                    />
                    @if (urlInput()) {
                      <button
                        type="button"
                        (click)="urlInput.set('')"
                        class="absolute end-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                      >
                        <i class="pi pi-times"></i>
                      </button>
                    }
                  </div>
                  <p class="text-[10px] text-[#8A735C] dark:text-neutral-400 mt-1">
                    يمكنك نسخ رابط صورة المنتج من الموقع الرسمي للشركة المصنعة أو أي مصدر موثوق.
                  </p>
                </div>

                @if (urlInput()) {
                  <div class="flex flex-col items-center justify-center p-3 rounded-2xl border border-[#EDE0D0] bg-[#FBF8F4]/60 dark:border-neutral-800 dark:bg-neutral-950">
                    <div class="size-32 rounded-xl bg-white dark:bg-neutral-900 overflow-hidden flex items-center justify-center border border-[#EDE0D0] p-1">
                      <img
                        [src]="urlInput()"
                        alt="URL Preview"
                        class="size-full object-contain"
                        (error)="onImgFallback($event)"
                      />
                    </div>
                    <span class="text-[11px] font-bold text-[#8A735C] mt-2">معاينة الرابط</span>
                  </div>

                  <button
                    type="button"
                    (click)="submitUrl()"
                    [disabled]="submitting() || !urlInput().trim()"
                    class="w-full py-2.5 px-4 rounded-xl bg-[#C27938] hover:bg-[#a6642a] text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    @if (submitting()) {
                      <i class="pi pi-spin pi-spinner text-sm"></i>
                      <span>جاري حفظ وتحميل الصورة...</span>
                    } @else {
                      <i class="pi pi-check text-sm"></i>
                      <span>تطبيق وحفظ الصورة</span>
                    }
                  </button>
                }
              </div>
            }

            <!-- Status Alert -->
            @if (statusMessage(); as status) {
              <div
                class="rounded-xl p-3 text-xs font-bold border flex items-center gap-2 animate-fadeIn"
                [class]="status.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/50 dark:border-rose-800 dark:text-rose-300'"
              >
                <i [class]="status.type === 'success' ? 'pi pi-check-circle' : 'pi pi-exclamation-circle'"></i>
                <span>{{ status.text }}</span>
              </div>
            }
          </div>

          <!-- Footer -->
          <div class="px-6 py-3.5 border-t border-[#EDE0D0] dark:border-neutral-800 bg-[#FBF8F4] dark:bg-neutral-950/60 flex items-center justify-between shrink-0">
            <span class="text-[11px] text-[#8A735C] dark:text-neutral-400">
              معرف الماستر: <code class="text-[10px] text-[#181A1D] dark:text-neutral-300 font-mono">{{ activeMasterId()?.slice(0, 8) }}...</code>
            </span>

            <button
              type="button"
              (click)="onClose()"
              [disabled]="submitting()"
              class="px-4 py-1.5 rounded-xl border border-[#EDE0D0] dark:border-neutral-700 text-xs font-bold text-[#181A1D] dark:text-white hover:bg-[#F8EEE2] transition-colors"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class ProductImageModalComponent {
  private readonly catalog = inject(CatalogBrowseRepository);
  private readonly notifications = inject(NotificationService);
  private readonly locale = inject(LocaleService);

  readonly isOpen = input<boolean>(false);
  readonly family = input<CatalogFamily | null>(null);
  readonly initialMasterId = input<string | null>(null);

  readonly close = output<void>();
  readonly imageChanged = output<{ masterId: string; imageUrl: string | null }>();

  readonly activeTab = signal<'offers' | 'upload' | 'url'>('offers');
  readonly activeMasterId = signal<string | null>(null);
  readonly loadingImages = signal<boolean>(false);
  readonly imagesData = signal<ProductImagesResponse | null>(null);

  readonly selectedFile = signal<File | null>(null);
  readonly selectedFilePreview = signal<string | null>(null);
  readonly urlInput = signal<string>('');

  readonly submitting = signal<boolean>(false);
  readonly statusMessage = signal<{ type: 'success' | 'error'; text: string } | null>(null);

  readonly resolveApiUrl = resolveApiUrl;

  constructor() {
    effect(
      () => {
        const open = this.isOpen();
        const fam = this.family();
        const initId = this.initialMasterId();

        if (open && fam) {
          const targetId = initId || fam.packs[0]?.masterId || null;
          this.activeMasterId.set(targetId);
          this.activeTab.set('offers');
          this.selectedFile.set(null);
          this.selectedFilePreview.set(null);
          this.urlInput.set('');
          this.statusMessage.set(null);
          if (targetId) {
            this.loadImages(targetId);
          }
        }
      },
      { allowSignalWrites: true }
    );
  }

  isRtl(): boolean {
    return this.locale.isRtl();
  }

  displayTitle(): string {
    const fam = this.family();
    return fam ? catalogFamilyTitle(fam, this.locale.locale()) : '';
  }

  currentPreviewImage(): string | null {
    const data = this.imagesData();
    if (data?.customImageUrl) return data.customImageUrl;
    const fam = this.family();
    if (fam?.imageUrl) return fam.imageUrl;
    const firstOffer = this.pharmacyOfferImages()[0];
    return firstOffer ? firstOffer.imageUrl : null;
  }

  hasCustomImage(): boolean {
    return !!this.imagesData()?.customImageUrl;
  }

  pharmacyOfferImages(): ProductPharmacyImageOption[] {
    return this.imagesData()?.pharmacyImages || [];
  }

  isImageActive(img: ProductPharmacyImageOption): boolean {
    const data = this.imagesData();
    if (!data?.customImageUrl) return false;
    return (
      data.customImageUrl === img.imageUrl ||
      data.customImageUrl.endsWith(img.imageUrl) ||
      img.imageUrl.endsWith(data.customImageUrl)
    );
  }

  pharmacyLogo(code: string | null | undefined): string | null {
    return resolvePharmacyLogo(code);
  }

  selectMaster(masterId: string): void {
    if (this.submitting() || this.activeMasterId() === masterId) return;
    this.activeMasterId.set(masterId);
    this.selectedFile.set(null);
    this.selectedFilePreview.set(null);
    this.urlInput.set('');
    this.statusMessage.set(null);
    this.loadImages(masterId);
  }

  loadImages(masterId: string): void {
    this.loadingImages.set(true);
    this.catalog
      .getProductImages(masterId)
      .pipe(finalize(() => this.loadingImages.set(false)))
      .subscribe({
        next: (res) => {
          this.imagesData.set(res);
        },
        error: (err) => {
          this.statusMessage.set({
            type: 'error',
            text: err?.error?.message || 'فشل تحميل بيانات وصور المنتج.'
          });
        }
      });
  }

  selectPharmacyImage(img: ProductPharmacyImageOption): void {
    const masterId = this.activeMasterId();
    if (!masterId || this.submitting()) return;

    this.submitting.set(true);
    this.statusMessage.set(null);

    this.catalog
      .setProductImageUrl(masterId, img.imageUrl)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (res) => {
          this.statusMessage.set({
            type: 'success',
            text: 'تم تعيين صورة المنتج بنجاح!'
          });
          this.loadImages(masterId);
          this.imageChanged.emit({ masterId, imageUrl: res.imageUrl });
          this.notifications.showSuccess('تم تحديث صورة المنتج بنجاح');
        },
        error: (err) => {
          this.statusMessage.set({
            type: 'error',
            text: err?.error?.message || 'فشل تعيين صورة المنتج.'
          });
        }
      });
  }

  onFilePicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.statusMessage.set({
        type: 'error',
        text: 'يرجى اختيار ملف صورة صالح (JPG, PNG, WebP).'
      });
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      this.statusMessage.set({
        type: 'error',
        text: 'حجم الصورة كبير جداً، الحد الأقصى 8 ميجابايت.'
      });
      return;
    }

    this.statusMessage.set(null);
    this.selectedFile.set(file);

    const reader = new FileReader();
    reader.onload = () => this.selectedFilePreview.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  clearSelectedFile(): void {
    this.selectedFile.set(null);
    this.selectedFilePreview.set(null);
  }

  submitUploadedFile(): void {
    const masterId = this.activeMasterId();
    const file = this.selectedFile();
    if (!masterId || !file || this.submitting()) return;

    this.submitting.set(true);
    this.statusMessage.set(null);

    this.catalog
      .uploadProductImage(masterId, file)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (res) => {
          this.statusMessage.set({
            type: 'success',
            text: 'تم رفع وتحويل صورة المنتج بنجاح!'
          });
          this.clearSelectedFile();
          this.loadImages(masterId);
          this.imageChanged.emit({ masterId, imageUrl: res.imageUrl });
          this.notifications.showSuccess('تم تحديث صورة المنتج بنجاح');
        },
        error: (err) => {
          this.statusMessage.set({
            type: 'error',
            text: err?.error?.message || 'حدث خطأ أثناء رفع الصورة.'
          });
        }
      });
  }

  submitUrl(): void {
    const masterId = this.activeMasterId();
    const url = this.urlInput().trim();
    if (!masterId || !url || this.submitting()) return;

    this.submitting.set(true);
    this.statusMessage.set(null);

    this.catalog
      .setProductImageUrl(masterId, url)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (res) => {
          this.statusMessage.set({
            type: 'success',
            text: 'تم حفظ صورة المنتج من الرابط بنجاح!'
          });
          this.urlInput.set('');
          this.loadImages(masterId);
          this.imageChanged.emit({ masterId, imageUrl: res.imageUrl });
          this.notifications.showSuccess('تم تحديث صورة المنتج بنجاح');
        },
        error: (err) => {
          this.statusMessage.set({
            type: 'error',
            text: err?.error?.message || 'فشل حفظ الصورة من الرابط.'
          });
        }
      });
  }

  revertToAutoImage(): void {
    const masterId = this.activeMasterId();
    if (!masterId || this.submitting()) return;

    if (!confirm('هل تريد بالتأكيد إزالة الصورة المخصصة والعودة للاختيار التلقائي من الصيدليات؟')) {
      return;
    }

    this.submitting.set(true);
    this.statusMessage.set(null);

    this.catalog
      .deleteProductImage(masterId)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => {
          this.statusMessage.set({
            type: 'success',
            text: 'تمت استعادة الصورة التلقائية للمنتج بنجاح.'
          });
          this.loadImages(masterId);
          this.imageChanged.emit({ masterId, imageUrl: null });
          this.notifications.showInfo('تمت استعادة صورة الصيدليات التلقائية');
        },
        error: (err) => {
          this.statusMessage.set({
            type: 'error',
            text: err?.error?.message || 'فشل حذف الصورة المخصصة.'
          });
        }
      });
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  onImgFallback(event: Event): void {
    const target = event.target as HTMLElement;
    target.style.display = 'none';
  }

  onClose(): void {
    if (this.submitting()) return;
    this.close.emit();
  }
}
