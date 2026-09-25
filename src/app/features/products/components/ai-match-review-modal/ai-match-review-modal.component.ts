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
import { ProxyImgPipe } from '../../../../shared/pipes/proxy-img.pipe';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-ai-match-review-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe, DecimalPipe, ProxyImgPipe, TranslatePipe],
  templateUrl: './ai-match-review-modal.component.html',
  styleUrl: './ai-match-review-modal.component.css'
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
            err?.message || this.i18n.t('aiMatchModal.loadListError')
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
            err?.message || this.i18n.t('aiMatchModal.loadDetailError')
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
            this.i18n.t('aiMatchModal.acceptSuccess')
          );
          this.matchResolved.emit({ matchId, action: 'accept' });
          this.advanceAfterResolution(matchId);
        },
        error: (err) => {
          this.notifications.showError(
            err?.message || this.i18n.t('aiMatchModal.acceptError')
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
            this.i18n.t('aiMatchModal.unlinkSuccess')
          );
          this.matchResolved.emit({ matchId, action: 'reject' });
          this.advanceAfterResolution(matchId);
        },
        error: (err) => {
          this.notifications.showError(
            err?.message || this.i18n.t('aiMatchModal.unlinkError')
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
