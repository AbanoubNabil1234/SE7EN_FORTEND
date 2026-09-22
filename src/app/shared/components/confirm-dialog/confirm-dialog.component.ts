import { Component, HostListener, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { LocaleService } from '../../../core/services/locale.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (dialog.isOpen()) {
      <div
        class="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        role="alertdialog"
        aria-modal="true"
        [attr.aria-label]="options()?.title || (isRtl() ? 'تأكيد العملية' : 'Confirm Action')"
      >
        <!-- Backdrop -->
        <div
          class="fixed inset-0 bg-black/45 backdrop-blur-[2px] transition-opacity duration-200"
          (click)="dialog.handleCancel()"
          aria-hidden="true"
        ></div>

        <!-- Modal Card -->
        <div
          class="relative w-full max-w-md overflow-hidden rounded-2xl border border-[#E8D5BE] bg-white p-6 shadow-2xl transition-all duration-200"
          [attr.dir]="isRtl() ? 'rtl' : 'ltr'"
          [class.font-ar]="isRtl()"
        >
          <!-- Top Accent / Header with Icon -->
          <div class="flex items-start gap-4">
            <!-- Icon Container -->
            <div
              class="flex size-12 shrink-0 items-center justify-center rounded-xl"
              [ngClass]="iconContainerClass()"
            >
              <i class="text-xl" [ngClass]="iconClass()" aria-hidden="true"></i>
            </div>

            <!-- Content Area -->
            <div class="min-w-0 flex-1 pt-0.5">
              <h3 class="text-base font-bold text-[#181A1D]">
                {{ options()?.title || defaultTitle() }}
              </h3>
              <p class="mt-1.5 text-sm leading-relaxed text-[#6B5A48] break-words">
                {{ options()?.message }}
              </p>
            </div>
          </div>

          <!-- Actions -->
          <div class="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              class="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl border border-[#E8D5BE] bg-white px-4 text-xs font-semibold text-[#6B5A48] hover:bg-[#F8EEE2] hover:text-[#181A1D] transition-colors focus:outline-none focus:ring-2 focus:ring-[#C27938]/30"
              (click)="dialog.handleCancel()"
            >
              {{ options()?.cancelText || (isRtl() ? 'إلغاء' : 'Cancel') }}
            </button>

            <button
              type="button"
              class="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl px-5 text-xs font-bold text-white shadow-sm transition-all focus:outline-none focus:ring-2"
              [ngClass]="confirmButtonClass()"
              (click)="dialog.handleConfirm()"
            >
              <span>{{ options()?.confirmText || (isRtl() ? 'تأكيد' : 'Confirm') }}</span>
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .font-ar {
      font-family: 'Cairo', 'Plus Jakarta Sans', sans-serif;
    }
  `
})
export class ConfirmDialogComponent {
  readonly dialog = inject(ConfirmDialogService);
  private readonly locale = inject(LocaleService);

  readonly options = computed(() => this.dialog.options());
  readonly isRtl = computed(() => this.locale.locale() === 'ar');

  readonly defaultTitle = computed(() => {
    const type = this.options()?.type;
    if (type === 'danger') return this.isRtl() ? 'تأكيد الحذف / الفصل' : 'Confirm Action';
    if (type === 'warning') return this.isRtl() ? 'تحذير' : 'Warning';
    return this.isRtl() ? 'تأكيد العملية' : 'Confirm';
  });

  readonly iconContainerClass = computed(() => {
    const type = this.options()?.type;
    switch (type) {
      case 'danger':
        return 'bg-red-50 text-red-600 border border-red-200';
      case 'info':
        return 'bg-blue-50 text-blue-600 border border-blue-200';
      case 'warning':
      default:
        return 'bg-amber-50 text-amber-700 border border-amber-200';
    }
  });

  readonly iconClass = computed(() => {
    const custom = this.options()?.icon;
    if (custom) return custom;
    const type = this.options()?.type;
    switch (type) {
      case 'danger':
        return 'pi pi-exclamation-triangle';
      case 'info':
        return 'pi pi-info-circle';
      case 'warning':
      default:
        return 'pi pi-exclamation-circle';
    }
  });

  readonly confirmButtonClass = computed(() => {
    const type = this.options()?.type;
    switch (type) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 focus:ring-red-400';
      case 'info':
        return 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-400';
      case 'warning':
      default:
        return 'bg-[#C27938] hover:bg-[#A66428] focus:ring-[#C27938]/40';
    }
  });

  @HostListener('window:keydown.escape')
  onEscape(): void {
    if (this.dialog.isOpen()) {
      this.dialog.handleCancel();
    }
  }
}
