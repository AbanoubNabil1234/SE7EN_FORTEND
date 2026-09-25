import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AuditLogRepository } from '../../core/domain/repositories/audit-log.repository';
import {
  AuditLogDetail,
  AuditLogFilterOptions,
  AuditLogItem,
  AuditLogQuery,
  AuditUserOption
} from '../../core/domain/models/audit-log.model';
import { LocaleService } from '../../core/services/locale.service';
import { NotificationService } from '../../core/services/notification.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

interface PropertyDiffDisplay {
  propertyName: string;
  oldValue: string;
  newValue: string;
}

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, TranslatePipe],
  template: `
    <section class="w-full space-y-4" [class.px-4]="!isEmbedded()" [class.py-4]="!isEmbedded()" [class.sm:px-6]="!isEmbedded()" [class.sm:py-6]="!isEmbedded()" [attr.dir]="locale.isRtl() ? 'rtl' : 'ltr'">
      
      <!-- Top Header Card -->
      <div class="overflow-hidden rounded-2xl border border-[#E8D5BE] bg-white shadow-sm">
        <div class="h-1.5 bg-[#C27938]"></div>
        <div class="p-5 sm:p-6">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div class="space-y-1">
              <div class="inline-flex items-center gap-2 rounded-full bg-[#F8EEE2] px-3 py-1 text-[11px] font-bold text-[#C27938]">
                <i class="pi pi-shield text-xs"></i>
                <span>{{ 'auditLogs.badge' | t }}</span>
              </div>
              <h1 class="text-2xl sm:text-3xl font-black text-[#181A1D]">
                {{ 'auditLogs.title' | t }}
              </h1>
              <p class="max-w-2xl text-xs sm:text-sm font-medium text-[#8A735C]">
                {{ 'auditLogs.subtitle' | t }}
              </p>
            </div>

            <!-- Stats Badges -->
            <div class="flex items-center gap-3">
              <div class="flex flex-col items-center justify-center rounded-xl border border-[#E8D5BE] bg-[#FBF8F4] px-4 py-2 min-w-24">
                <span class="text-[10px] font-bold uppercase tracking-wider text-[#A68B6D]">{{ 'auditLogs.statTotal' | t }}</span>
                <span class="text-lg font-black text-[#181A1D] tabular-nums">{{ totalCount() | number }}</span>
              </div>
              <button
                type="button"
                (click)="loadLogs()"
                [disabled]="loading()"
                class="inline-flex h-11 items-center gap-2 rounded-xl border border-[#E8D5BE] bg-white px-4 text-xs font-bold text-[#181A1D] shadow-2xs hover:bg-[#FBF8F4] active:scale-98 transition-all cursor-pointer disabled:opacity-50"
                title="Refresh"
              >
                <i class="pi pi-refresh text-xs" [class.animate-spin]="loading()"></i>
                <span>{{ 'auditLogs.refresh' | t }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Filter Controls Bar -->
        <div class="border-t border-[#EDE0D0] bg-[#FDFBF7] p-4 sm:p-5">
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6 items-end">
            
            <!-- 1. Text Search -->
            <div class="lg:col-span-2">
              <label class="block text-[11px] font-bold text-[#A68B6D] mb-1.5">
                <i class="pi pi-search me-1 text-[10px]"></i>
                {{ 'common.search' | t }}
              </label>
              <div class="relative">
                <input
                  type="text"
                  [(ngModel)]="searchQuery"
                  (keyup.enter)="applyFilters()"
                  [placeholder]="'auditLogs.searchPlaceholder' | t"
                  class="h-10 w-full rounded-xl border border-[#E8D5BE] bg-white px-3.5 text-xs font-medium text-[#181A1D] outline-none transition-colors focus:border-[#C27938] focus:ring-1 focus:ring-[#C27938]"
                />
                @if (searchQuery()) {
                  <button
                    type="button"
                    (click)="searchQuery.set(''); applyFilters()"
                    class="absolute end-2.5 top-1/2 -translate-y-1/2 text-[#A68B6D] hover:text-[#181A1D]"
                  >
                    <i class="pi pi-times text-xs"></i>
                  </button>
                }
              </div>
            </div>

            <!-- 2. Category Filter -->
            <div>
              <label class="block text-[11px] font-bold text-[#A68B6D] mb-1.5">
                <i class="pi pi-folder me-1 text-[10px]"></i>
                {{ 'auditLogs.colCategory' | t }}
              </label>
              <select
                [(ngModel)]="selectedCategory"
                (change)="applyFilters()"
                class="h-10 w-full rounded-xl border border-[#E8D5BE] bg-white px-3 text-xs font-medium text-[#181A1D] outline-none transition-colors focus:border-[#C27938]"
              >
                <option value="">{{ 'auditLogs.categoryAll' | t }}</option>
                @for (cat of filterOptions().categories; track cat) {
                  <option [value]="cat">{{ getCategoryLabel(cat) }}</option>
                }
              </select>
            </div>

            <!-- 3. Action Filter -->
            <div>
              <label class="block text-[11px] font-bold text-[#A68B6D] mb-1.5">
                <i class="pi pi-bolt me-1 text-[10px]"></i>
                {{ 'auditLogs.colAction' | t }}
              </label>
              <select
                [(ngModel)]="selectedAction"
                (change)="applyFilters()"
                class="h-10 w-full rounded-xl border border-[#E8D5BE] bg-white px-3 text-xs font-medium text-[#181A1D] outline-none transition-colors focus:border-[#C27938]"
              >
                <option value="">{{ 'auditLogs.actionAll' | t }}</option>
                @for (act of filterOptions().actions; track act) {
                  <option [value]="act">{{ getActionLabel(act) }}</option>
                }
              </select>
            </div>

            <!-- 4. User Filter -->
            <div>
              <label class="block text-[11px] font-bold text-[#A68B6D] mb-1.5">
                <i class="pi pi-user me-1 text-[10px]"></i>
                {{ 'auditLogs.colActor' | t }}
              </label>
              <select
                [(ngModel)]="selectedUserId"
                (change)="applyFilters()"
                class="h-10 w-full rounded-xl border border-[#E8D5BE] bg-white px-3 text-xs font-medium text-[#181A1D] outline-none transition-colors focus:border-[#C27938]"
              >
                <option value="">{{ 'auditLogs.userAll' | t }}</option>
                @for (usr of filterOptions().users; track usr.id) {
                  <option [value]="usr.id">{{ usr.name || usr.email || usr.id }}</option>
                }
              </select>
            </div>

            <!-- 5. Date From & Filter Actions -->
            <div class="flex items-center gap-2">
              <div class="flex-1">
                <label class="block text-[11px] font-bold text-[#A68B6D] mb-1.5">
                  <i class="pi pi-calendar me-1 text-[10px]"></i>
                  {{ 'auditLogs.fromDate' | t }}
                </label>
                <input
                  type="date"
                  [(ngModel)]="fromDate"
                  (change)="applyFilters()"
                  class="h-10 w-full rounded-xl border border-[#E8D5BE] bg-white px-2.5 text-xs font-medium text-[#181A1D] outline-none transition-colors focus:border-[#C27938]"
                />
              </div>
              <div class="flex-1">
                <label class="block text-[11px] font-bold text-[#A68B6D] mb-1.5">
                  <i class="pi pi-calendar me-1 text-[10px]"></i>
                  {{ 'auditLogs.toDate' | t }}
                </label>
                <input
                  type="date"
                  [(ngModel)]="toDate"
                  (change)="applyFilters()"
                  class="h-10 w-full rounded-xl border border-[#E8D5BE] bg-white px-2.5 text-xs font-medium text-[#181A1D] outline-none transition-colors focus:border-[#C27938]"
                />
              </div>
            </div>

          </div>

          <!-- Filter Reset & Quick Tags -->
          @if (hasActiveFilters()) {
            <div class="mt-3 flex items-center justify-between border-t border-[#EDE0D0] pt-2.5">
              <span class="text-xs text-[#8A735C]">
                {{ 'auditLogs.totalRecords' | t }} <strong class="text-[#181A1D] font-bold">{{ totalCount() }}</strong>
              </span>
              <button
                type="button"
                (click)="resetFilters()"
                class="inline-flex items-center gap-1.5 text-xs font-bold text-[#C27938] hover:underline cursor-pointer"
              >
                <i class="pi pi-times-circle text-xs"></i>
                <span>{{ 'auditLogs.resetFilters' | t }}</span>
              </button>
            </div>
          }
        </div>
      </div>

      <!-- Logs Data Table Card -->
      <div class="overflow-hidden rounded-2xl border border-[#E8D5BE] bg-white shadow-xs">
        @if (loading()) {
          <div class="flex flex-col items-center justify-center py-20 text-[#8A735C]">
            <i class="pi pi-spin pi-spinner text-3xl text-[#C27938]"></i>
            <p class="mt-3 text-sm font-bold">{{ 'auditLogs.loading' | t }}</p>
          </div>
        } @else if (logs().length === 0) {
          <div class="flex flex-col items-center justify-center py-20 text-center px-4">
            <div class="flex size-14 items-center justify-center rounded-2xl bg-[#F8EEE2] text-[#C27938]">
              <i class="pi pi-inbox text-2xl"></i>
            </div>
            <h3 class="mt-4 text-base font-bold text-[#181A1D]">{{ 'auditLogs.empty' | t }}</h3>
            @if (hasActiveFilters()) {
              <button
                type="button"
                (click)="resetFilters()"
                class="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#F8EEE2] px-4 py-2 text-xs font-bold text-[#C27938] hover:bg-[#F0E4D5] cursor-pointer"
              >
                <i class="pi pi-refresh text-xs"></i>
                <span>{{ 'auditLogs.resetFilters' | t }}</span>
              </button>
            }
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full text-start text-xs border-collapse">
              <thead>
                <tr class="border-b border-[#EDE0D0] bg-[#FDFBF7] text-[#8A735C]">
                  <th class="py-3 px-4 text-start font-bold uppercase tracking-wider">{{ 'auditLogs.colTimestamp' | t }}</th>
                  <th class="py-3 px-4 text-start font-bold uppercase tracking-wider">{{ 'auditLogs.colActor' | t }}</th>
                  <th class="py-3 px-4 text-start font-bold uppercase tracking-wider">{{ 'auditLogs.colCategory' | t }}</th>
                  <th class="py-3 px-4 text-start font-bold uppercase tracking-wider">{{ 'auditLogs.colAction' | t }}</th>
                  <th class="py-3 px-4 text-start font-bold uppercase tracking-wider">{{ 'auditLogs.colEntity' | t }}</th>
                  <th class="py-3 px-4 text-start font-bold uppercase tracking-wider">{{ 'auditLogs.colSummary' | t }}</th>
                  <th class="py-3 px-4 text-center font-bold uppercase tracking-wider">{{ 'auditLogs.colActions' | t }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#EDE0D0]">
                @for (log of logs(); track log.id) {
                  <tr class="hover:bg-[#FDFBF7] transition-colors">
                    
                    <!-- 1. Timestamp -->
                    <td class="py-3.5 px-4 font-mono text-[11px] text-[#5C4936] whitespace-nowrap">
                      <div>{{ log.timestampUtc | date:'yyyy-MM-dd' }}</div>
                      <div class="text-[10px] text-[#A68B6D]">{{ log.timestampUtc | date:'HH:mm:ss' }} UTC</div>
                    </td>

                    <!-- 2. Actor -->
                    <td class="py-3.5 px-4 whitespace-nowrap">
                      <div class="flex items-center gap-2">
                        <div class="flex size-7 items-center justify-center rounded-full bg-[#F8EEE2] text-[#C27938] font-bold text-xs shrink-0">
                          <i class="pi pi-user text-xs"></i>
                        </div>
                        <div class="min-w-0">
                          <div class="font-bold text-[#181A1D] truncate max-w-44">
                            {{ log.userName || (log.userId ? log.userId : 'Admin (API Key)') }}
                          </div>
                          @if (log.userEmail) {
                            <div class="text-[10px] text-[#8A735C] truncate max-w-44">{{ log.userEmail }}</div>
                          }
                        </div>
                      </div>
                    </td>

                    <!-- 3. Category -->
                    <td class="py-3.5 px-4 whitespace-nowrap">
                      <span class="rounded-lg px-2.5 py-1 text-[11px] font-bold" [ngClass]="getCategoryBadgeClass(log.category)">
                        {{ getCategoryLabel(log.category) }}
                      </span>
                    </td>

                    <!-- 4. Action -->
                    <td class="py-3.5 px-4 whitespace-nowrap">
                      <span class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold" [ngClass]="getActionBadgeClass(log.action)">
                        <i [ngClass]="getActionIcon(log.action)" class="text-[10px]"></i>
                        <span>{{ getActionLabel(log.action) }}</span>
                      </span>
                    </td>

                    <!-- 5. Target Entity -->
                    <td class="py-3.5 px-4 whitespace-nowrap">
                      <div class="font-medium text-[#181A1D]">
                        <span class="text-[#8A735C] text-[10px]">{{ log.entityName }}:</span>
                        <span class="font-bold ms-1 text-xs">{{ log.entityIdentifier || log.entityId || '-' }}</span>
                      </div>
                    </td>

                    <!-- 6. Summary -->
                    <td class="py-3.5 px-4">
                      <div class="text-xs font-medium text-[#2C231B] line-clamp-2 max-w-md">
                        {{ log.summary }}
                      </div>
                      <div class="flex items-center gap-2 mt-1">
                        @if (log.hasChanges) {
                          <span class="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            <i class="pi pi-pencil text-[9px]"></i>
                            Diff
                          </span>
                        }
                        @if (log.hasDetails) {
                          <span class="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                            <i class="pi pi-info-circle text-[9px]"></i>
                            Metadata
                          </span>
                        }
                      </div>
                    </td>

                    <!-- 7. Actions Button -->
                    <td class="py-3.5 px-4 text-center whitespace-nowrap">
                      <button
                        type="button"
                        (click)="openDetail(log.id)"
                        class="inline-flex items-center gap-1 rounded-xl border border-[#E8D5BE] bg-white px-3 py-1.5 text-xs font-bold text-[#181A1D] hover:bg-[#F8EEE2] hover:text-[#C27938] hover:border-[#C27938] transition-colors cursor-pointer"
                      >
                        <i class="pi pi-eye text-xs"></i>
                        <span>{{ 'auditLogs.btnDetails' | t }}</span>
                      </button>
                    </td>

                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Pagination Bar -->
          <div class="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#EDE0D0] bg-[#FDFBF7] px-4 py-3 sm:px-6">
            <div class="text-xs text-[#8A735C]">
              <span>{{ 'auditLogs.page' | t }} <strong class="font-bold text-[#181A1D]">{{ currentPage() }}</strong> {{ 'auditLogs.of' | t }} <strong class="font-bold text-[#181A1D]">{{ totalPages() }}</strong></span>
              <span class="mx-2">•</span>
              <span>{{ 'auditLogs.totalRecords' | t }} <strong class="font-bold text-[#181A1D]">{{ totalCount() }}</strong></span>
            </div>

            <div class="flex items-center gap-2">
              <button
                type="button"
                [disabled]="currentPage() <= 1 || loading()"
                (click)="goToPage(currentPage() - 1)"
                class="inline-flex h-9 items-center gap-1 rounded-xl border border-[#E8D5BE] bg-white px-3 text-xs font-bold text-[#181A1D] hover:bg-[#FBF8F4] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                <i class="pi pi-chevron-right text-xs" [class.rotate-180]="!locale.isRtl()"></i>
                <span>{{ 'auditLogs.prev' | t }}</span>
              </button>

              <button
                type="button"
                [disabled]="currentPage() >= totalPages() || loading()"
                (click)="goToPage(currentPage() + 1)"
                class="inline-flex h-9 items-center gap-1 rounded-xl border border-[#E8D5BE] bg-white px-3 text-xs font-bold text-[#181A1D] hover:bg-[#FBF8F4] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                <span>{{ 'auditLogs.next' | t }}</span>
                <i class="pi pi-chevron-left text-xs" [class.rotate-180]="!locale.isRtl()"></i>
              </button>
            </div>
          </div>
        }
      </div>

      <!-- Detail & Diff Modal -->
      @if (selectedDetail()) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-fadeIn"
          role="dialog"
          aria-modal="true"
          (keydown.escape)="closeDetail()"
        >
          <!-- Backdrop click listener -->
          <div class="fixed inset-0" (click)="closeDetail()"></div>

          <!-- Modal Box -->
          <div
            class="relative w-full max-w-3xl max-h-[92vh] rounded-3xl bg-white shadow-2xl flex flex-col overflow-hidden border border-[#E8D5BE] z-10"
            [attr.dir]="locale.isRtl() ? 'rtl' : 'ltr'"
            (click)="$event.stopPropagation()"
          >
            <!-- Modal Header -->
            <div class="px-6 py-4 border-b border-[#EDE0D0] bg-[#FBF8F4] flex items-center justify-between gap-3 shrink-0">
              <div class="flex items-center gap-3 min-w-0">
                <div class="flex size-10 items-center justify-center rounded-2xl bg-[#F8EEE2] text-[#C27938] shrink-0 shadow-xs">
                  <i class="pi pi-file-edit text-lg"></i>
                </div>
                <div class="min-w-0">
                  <h3 class="text-base font-extrabold text-[#181A1D] truncate">
                    {{ 'auditLogs.modalTitle' | t }}
                  </h3>
                  <p class="text-xs font-medium text-[#8A735C] truncate">
                    {{ selectedDetail()?.summary }}
                  </p>
                </div>
              </div>

              <button
                type="button"
                (click)="closeDetail()"
                class="flex size-9 items-center justify-center rounded-xl border border-[#E8D5BE] bg-white text-[#8A735C] hover:bg-[#F8EEE2] hover:text-[#181A1D] cursor-pointer transition-colors"
              >
                <i class="pi pi-times text-xs"></i>
              </button>
            </div>

            <!-- Modal Tab Selector -->
            <div class="flex items-center gap-2 border-b border-[#EDE0D0] bg-white px-6 pt-3">
              <button
                type="button"
                (click)="activeModalTab.set('overview')"
                [class]="activeModalTab() === 'overview'
                  ? 'border-b-2 border-[#C27938] text-[#C27938] font-black'
                  : 'text-[#8A735C] hover:text-[#181A1D] font-bold'"
                class="pb-2.5 px-3 text-xs transition-colors cursor-pointer"
              >
                <i class="pi pi-info-circle me-1"></i>
                {{ 'auditLogs.tabOverview' | t }}
              </button>

              <button
                type="button"
                (click)="activeModalTab.set('diff')"
                [class]="activeModalTab() === 'diff'
                  ? 'border-b-2 border-[#C27938] text-[#C27938] font-black'
                  : 'text-[#8A735C] hover:text-[#181A1D] font-bold'"
                class="pb-2.5 px-3 text-xs transition-colors cursor-pointer"
              >
                <i class="pi pi-pencil me-1"></i>
                {{ 'auditLogs.tabDiff' | t }}
                @if (parsedDiffs().length > 0) {
                  <span class="ms-1 rounded-full bg-amber-100 text-amber-800 px-1.5 py-0.2 text-[10px] font-black">
                    {{ parsedDiffs().length }}
                  </span>
                }
              </button>

              <button
                type="button"
                (click)="activeModalTab.set('json')"
                [class]="activeModalTab() === 'json'
                  ? 'border-b-2 border-[#C27938] text-[#C27938] font-black'
                  : 'text-[#8A735C] hover:text-[#181A1D] font-bold'"
                class="pb-2.5 px-3 text-xs transition-colors cursor-pointer"
              >
                <i class="pi pi-code me-1"></i>
                {{ 'auditLogs.tabJson' | t }}
              </button>
            </div>

            <!-- Modal Body (Scrollable) -->
            <div class="flex-1 overflow-y-auto p-6 space-y-4">
              
              <!-- TAB 1: Overview -->
              @if (activeModalTab() === 'overview') {
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  
                  <!-- Actor Card -->
                  <div class="rounded-2xl border border-[#EDE0D0] bg-[#FDFBF7] p-4 space-y-2">
                    <div class="text-[11px] font-bold uppercase tracking-wider text-[#A68B6D] flex items-center gap-1.5">
                      <i class="pi pi-user text-xs"></i>
                      <span>{{ 'auditLogs.colActor' | t }}</span>
                    </div>
                    <div class="space-y-1 text-xs">
                      <div class="flex justify-between">
                        <span class="text-[#8A735C]">{{ 'auditLogs.actorName' | t }}:</span>
                        <strong class="text-[#181A1D]">{{ selectedDetail()?.userName || 'Admin (API Key)' }}</strong>
                      </div>
                      @if (selectedDetail()?.userEmail) {
                        <div class="flex justify-between">
                          <span class="text-[#8A735C]">{{ 'auditLogs.actorEmail' | t }}:</span>
                          <strong class="text-[#181A1D] font-mono">{{ selectedDetail()?.userEmail }}</strong>
                        </div>
                      }
                      @if (selectedDetail()?.userId) {
                        <div class="flex justify-between">
                          <span class="text-[#8A735C]">{{ 'auditLogs.actorId' | t }}:</span>
                          <span class="text-[#5C4936] font-mono text-[11px]">{{ selectedDetail()?.userId }}</span>
                        </div>
                      }
                      <div class="flex justify-between">
                        <span class="text-[#8A735C]">{{ 'auditLogs.ipAddress' | t }}:</span>
                        <strong class="text-[#181A1D] font-mono">{{ selectedDetail()?.ipAddress || 'N/A' }}</strong>
                      </div>
                    </div>
                  </div>

                  <!-- Entity Card -->
                  <div class="rounded-2xl border border-[#EDE0D0] bg-[#FDFBF7] p-4 space-y-2">
                    <div class="text-[11px] font-bold uppercase tracking-wider text-[#A68B6D] flex items-center gap-1.5">
                      <i class="pi pi-box text-xs"></i>
                      <span>{{ 'auditLogs.colEntity' | t }}</span>
                    </div>
                    <div class="space-y-1 text-xs">
                      <div class="flex justify-between">
                        <span class="text-[#8A735C]">{{ 'auditLogs.entityType' | t }}:</span>
                        <strong class="text-[#181A1D]">{{ selectedDetail()?.entityName }}</strong>
                      </div>
                      <div class="flex justify-between">
                        <span class="text-[#8A735C]">{{ 'auditLogs.entityIdentifier' | t }}:</span>
                        <strong class="text-[#181A1D] font-bold font-mono">{{ selectedDetail()?.entityIdentifier || '-' }}</strong>
                      </div>
                      @if (selectedDetail()?.entityId) {
                        <div class="flex justify-between">
                          <span class="text-[#8A735C]">{{ 'auditLogs.entityId' | t }}:</span>
                          <span class="text-[#5C4936] font-mono text-[11px]">{{ selectedDetail()?.entityId }}</span>
                        </div>
                      }
                      <div class="flex justify-between">
                        <span class="text-[#8A735C]">{{ 'auditLogs.timestamp' | t }}:</span>
                        <span class="text-[#181A1D] font-mono text-[11px]">{{ selectedDetail()?.timestampUtc | date:'yyyy-MM-dd HH:mm:ss' }} UTC</span>
                      </div>
                    </div>
                  </div>

                </div>

                <!-- Action & Summary Card -->
                <div class="rounded-2xl border border-[#EDE0D0] bg-white p-4 space-y-2 shadow-2xs">
                  <div class="flex items-center gap-2">
                    <span class="rounded-full px-2.5 py-0.5 text-xs font-black" [ngClass]="getActionBadgeClass(selectedDetail()!.action)">
                      {{ getActionLabel(selectedDetail()!.action) }}
                    </span>
                    <span class="text-xs text-[#8A735C]">•</span>
                    <span class="text-xs font-bold text-[#8A735C]">{{ getCategoryLabel(selectedDetail()!.category) }}</span>
                  </div>
                  <div class="text-sm font-bold text-[#181A1D] bg-[#FBF8F4] p-3 rounded-xl border border-[#EDE0D0]">
                    {{ selectedDetail()?.summary }}
                  </div>
                  @if (selectedDetail()?.userAgent) {
                    <div class="text-[11px] text-[#A68B6D] font-mono truncate">
                      <i class="pi pi-desktop me-1"></i>
                      {{ selectedDetail()?.userAgent }}
                    </div>
                  }
                </div>
              }

              <!-- TAB 2: Field Changes (Diff) -->
              @if (activeModalTab() === 'diff') {
                @if (parsedDiffs().length === 0) {
                  <div class="py-12 text-center text-[#8A735C]">
                    <i class="pi pi-check-circle text-2xl text-emerald-600"></i>
                    <p class="mt-2 text-xs font-bold">{{ 'auditLogs.noDiff' | t }}</p>
                  </div>
                } @else {
                  <div class="rounded-2xl border border-[#EDE0D0] overflow-hidden">
                    <table class="w-full text-xs">
                      <thead>
                        <tr class="bg-[#FDFBF7] border-b border-[#EDE0D0] text-[#8A735C]">
                          <th class="py-2.5 px-4 text-start font-bold uppercase tracking-wider">{{ 'auditLogs.diffField' | t }}</th>
                          <th class="py-2.5 px-4 text-start font-bold uppercase tracking-wider text-rose-700">{{ 'auditLogs.diffOld' | t }}</th>
                          <th class="py-2.5 px-4 text-start font-bold uppercase tracking-wider text-emerald-700">{{ 'auditLogs.diffNew' | t }}</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-[#EDE0D0]">
                        @for (diff of parsedDiffs(); track diff.propertyName) {
                          <tr class="hover:bg-[#FBF8F4]">
                            <td class="py-3 px-4 font-mono font-bold text-[#181A1D] whitespace-nowrap">
                              {{ diff.propertyName }}
                            </td>
                            <td class="py-3 px-4 bg-rose-50/40 text-rose-800 font-mono text-[11px] break-all">
                              <span class="line-through decoration-rose-400">{{ diff.oldValue || '— (null)' }}</span>
                            </td>
                            <td class="py-3 px-4 bg-emerald-50/40 text-emerald-800 font-mono text-[11px] font-bold break-all">
                              {{ diff.newValue || '— (null)' }}
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                }
              }

              <!-- TAB 3: JSON Metadata -->
              @if (activeModalTab() === 'json') {
                <div class="space-y-4">
                  @if (selectedDetail()?.detailsJson) {
                    <div>
                      <div class="flex items-center justify-between mb-1.5">
                        <span class="text-xs font-bold text-[#181A1D]">Details JSON:</span>
                        <button
                          type="button"
                          (click)="copyText(selectedDetail()!.detailsJson!)"
                          class="text-xs text-[#C27938] hover:underline cursor-pointer font-bold inline-flex items-center gap-1"
                        >
                          <i class="pi pi-copy text-xs"></i>
                          <span>Copy JSON</span>
                        </button>
                      </div>
                      <pre class="rounded-xl bg-[#1E1E24] p-4 text-[11px] text-emerald-400 font-mono overflow-x-auto max-h-56 leading-relaxed">{{ formatJson(selectedDetail()!.detailsJson) }}</pre>
                    </div>
                  } @else {
                    <p class="text-xs text-[#8A735C] italic">{{ 'auditLogs.noDetailsJson' | t }}</p>
                  }

                  @if (selectedDetail()?.changesJson) {
                    <div>
                      <div class="flex items-center justify-between mb-1.5">
                        <span class="text-xs font-bold text-[#181A1D]">Changes JSON:</span>
                        <button
                          type="button"
                          (click)="copyText(selectedDetail()!.changesJson!)"
                          class="text-xs text-[#C27938] hover:underline cursor-pointer font-bold inline-flex items-center gap-1"
                        >
                          <i class="pi pi-copy text-xs"></i>
                          <span>Copy JSON</span>
                        </button>
                      </div>
                      <pre class="rounded-xl bg-[#1E1E24] p-4 text-[11px] text-amber-400 font-mono overflow-x-auto max-h-56 leading-relaxed">{{ formatJson(selectedDetail()!.changesJson) }}</pre>
                    </div>
                  }
                </div>
              }

            </div>

            <!-- Modal Footer -->
            <div class="px-6 py-3.5 border-t border-[#EDE0D0] bg-[#FDFBF7] flex justify-end">
              <button
                type="button"
                (click)="closeDetail()"
                class="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#181A1D] px-5 text-xs font-bold text-white hover:bg-black transition-colors cursor-pointer"
              >
                {{ 'common.close' | t }}
              </button>
            </div>

          </div>
        </div>
      }

    </section>
  `
})
export class AuditLogsComponent implements OnInit {
  readonly isEmbedded = input<boolean>(false);
  private readonly auditLogRepo = inject(AuditLogRepository);
  readonly locale = inject(LocaleService);
  private readonly notify = inject(NotificationService);

  // Filter Signals
  readonly searchQuery = signal<string>('');
  readonly selectedCategory = signal<string>('');
  readonly selectedAction = signal<string>('');
  readonly selectedUserId = signal<string>('');
  readonly fromDate = signal<string>('');
  readonly toDate = signal<string>('');
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(20);

  // Data Signals
  readonly loading = signal<boolean>(false);
  readonly logs = signal<AuditLogItem[]>([]);
  readonly totalCount = signal<number>(0);
  readonly totalPages = signal<number>(1);
  readonly filterOptions = signal<AuditLogFilterOptions>({
    categories: [],
    actions: [],
    users: []
  });

  // Modal Signals
  readonly selectedDetail = signal<AuditLogDetail | null>(null);
  readonly activeModalTab = signal<'overview' | 'diff' | 'json'>('overview');

  readonly hasActiveFilters = computed(() => {
    return !!(
      this.searchQuery() ||
      this.selectedCategory() ||
      this.selectedAction() ||
      this.selectedUserId() ||
      this.fromDate() ||
      this.toDate()
    );
  });

  readonly parsedDiffs = computed<PropertyDiffDisplay[]>(() => {
    const detail = this.selectedDetail();
    if (!detail?.changesJson) return [];
    try {
      const raw = JSON.parse(detail.changesJson);
      if (!Array.isArray(raw)) return [];
      return raw.map((item: any) => ({
        propertyName: item.propertyName || item.PropertyName || 'Unknown',
        oldValue: this.formatValue(item.oldValue ?? item.OldValue),
        newValue: this.formatValue(item.newValue ?? item.NewValue)
      }));
    } catch {
      return [];
    }
  });

  ngOnInit(): void {
    this.loadFilterOptions();
    this.loadLogs();
  }

  loadFilterOptions(): void {
    this.auditLogRepo.getFilterOptions().subscribe({
      next: (opts) => this.filterOptions.set(opts),
      error: () => {}
    });
  }

  loadLogs(): void {
    this.loading.set(true);

    const query: AuditLogQuery = {
      search: this.searchQuery().trim() || null,
      category: this.selectedCategory() || null,
      action: this.selectedAction() || null,
      userId: this.selectedUserId() || null,
      fromDateUtc: this.fromDate() ? new Date(this.fromDate()).toISOString() : null,
      toDateUtc: this.toDate() ? new Date(this.toDate() + 'T23:59:59.999Z').toISOString() : null,
      page: this.currentPage(),
      pageSize: this.pageSize()
    };

    this.auditLogRepo
      .query(query)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (result) => {
          this.logs.set(result.items);
          this.totalCount.set(result.totalCount);
          this.totalPages.set(result.totalPages || 1);
        },
        error: () => {
          this.notify.showError('تعذر تحميل سجلات العمليات.');
        }
      });
  }

  applyFilters(): void {
    this.currentPage.set(1);
    this.loadLogs();
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.selectedCategory.set('');
    this.selectedAction.set('');
    this.selectedUserId.set('');
    this.fromDate.set('');
    this.toDate.set('');
    this.currentPage.set(1);
    this.loadLogs();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.loadLogs();
  }

  openDetail(id: string): void {
    this.auditLogRepo.getById(id).subscribe({
      next: (detail) => {
        this.selectedDetail.set(detail);
        this.activeModalTab.set(detail.changesJson ? 'diff' : 'overview');
      },
      error: () => {
        this.notify.showError('تعذر جلب تفاصيل السجل.');
      }
    });
  }

  closeDetail(): void {
    this.selectedDetail.set(null);
  }

  copyText(text: string): void {
    void navigator.clipboard.writeText(text);
    this.notify.showSuccess('تم نسخ البيانات بنجاح.');
  }

  formatJson(raw: string | null | undefined): string {
    if (!raw) return '';
    try {
      return JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      return raw;
    }
  }

  private formatValue(val: any): string {
    if (val === null || val === undefined) return '';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  }

  getActionBadgeClass(action: string): string {
    switch (action) {
      case 'LINK_GROUP_CODE':
      case 'ACCEPT_MATCH':
      case 'FORCE_MATCH':
        return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
      case 'UNLINK_PRODUCT':
      case 'REJECT_MATCH':
      case 'DELETE_PRODUCT_IMAGE':
      case 'DELETE_CATEGORY_IMAGE':
        return 'bg-rose-100 text-rose-800 border border-rose-200';
      case 'MERGE_GROUPS':
      case 'ENSURE_GROUP_CODE':
      case 'UPDATE_PRODUCT_IMAGE':
      case 'UPDATE_CATEGORY_IMAGE':
      case 'UPDATE_DEALS_SETTINGS':
        return 'bg-amber-100 text-amber-800 border border-amber-200';
      case 'TOGGLE_DEAL_PIN':
      case 'TOGGLE_DEAL_EXCLUDE':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      default:
        return 'bg-[#F0E4D5] text-[#2C231B] border border-[#E8D5BE]';
    }
  }

  getActionIcon(action: string): string {
    switch (action) {
      case 'LINK_GROUP_CODE':
        return 'pi pi-link';
      case 'UNLINK_PRODUCT':
        return 'pi pi-unlink';
      case 'MERGE_GROUPS':
        return 'pi pi-clone';
      case 'ENSURE_GROUP_CODE':
        return 'pi pi-check';
      case 'ACCEPT_MATCH':
        return 'pi pi-check-circle';
      case 'REJECT_MATCH':
        return 'pi pi-times-circle';
      case 'FORCE_MATCH':
        return 'pi pi-bolt';
      case 'UPDATE_PRODUCT_IMAGE':
      case 'UPDATE_CATEGORY_IMAGE':
        return 'pi pi-image';
      case 'DELETE_PRODUCT_IMAGE':
      case 'DELETE_CATEGORY_IMAGE':
        return 'pi pi-trash';
      case 'UPDATE_DEALS_SETTINGS':
        return 'pi pi-cog';
      case 'TOGGLE_DEAL_PIN':
        return 'pi pi-bookmark';
      case 'TOGGLE_DEAL_EXCLUDE':
        return 'pi pi-ban';
      default:
        return 'pi pi-info-circle';
    }
  }

  getCategoryBadgeClass(category: string): string {
    switch (category) {
      case 'Catalog':
        return 'bg-[#F8EEE2] text-[#C27938] border border-[#E8D5BE]';
      case 'MatchReview':
        return 'bg-purple-50 text-purple-700 border border-purple-200';
      case 'Categories':
        return 'bg-teal-50 text-teal-700 border border-teal-200';
      case 'Deals':
        return 'bg-rose-50 text-rose-700 border border-rose-200';
      default:
        return 'bg-gray-100 text-gray-700 border border-gray-200';
    }
  }

  getActionLabel(action: string): string {
    const key = `auditLogs.actions.${action}`;
    const translated = this.locale.isRtl() ? (actionLabelsAr[action] || action) : (actionLabelsEn[action] || action);
    return translated;
  }

  getCategoryLabel(category: string): string {
    const translated = this.locale.isRtl() ? (categoryLabelsAr[category] || category) : (categoryLabelsEn[category] || category);
    return translated;
  }
}

const actionLabelsAr: Record<string, string> = {
  LINK_GROUP_CODE: 'ربط بكتالوج ماستر',
  UNLINK_PRODUCT: 'فك ربط منتج',
  MERGE_GROUPS: 'دمج مجموعات',
  ENSURE_GROUP_CODE: 'تثبيت رمز مجموعة',
  ACCEPT_MATCH: 'قبول مطابقة مراجعة',
  REJECT_MATCH: 'رفض مطابقة مراجعة',
  FORCE_MATCH: 'مطابقة إجبارية',
  UPDATE_PRODUCT_IMAGE: 'تحديث صورة منتج',
  DELETE_PRODUCT_IMAGE: 'حذف صورة منتج',
  UPDATE_CATEGORY_IMAGE: 'تحديث صورة تصنيف',
  DELETE_CATEGORY_IMAGE: 'حذف صورة تصنيف',
  UPDATE_DEALS_SETTINGS: 'تحديث إعدادات العروض',
  TOGGLE_DEAL_PIN: 'تثبيت / إلغاء تثبيت عرض',
  TOGGLE_DEAL_EXCLUDE: 'استبعاد / إلغاء استبعاد عرض'
};

const actionLabelsEn: Record<string, string> = {
  LINK_GROUP_CODE: 'Link Group Code',
  UNLINK_PRODUCT: 'Unlink Product',
  MERGE_GROUPS: 'Merge Groups',
  ENSURE_GROUP_CODE: 'Ensure Group Code',
  ACCEPT_MATCH: 'Accept Match Review',
  REJECT_MATCH: 'Reject Match Review',
  FORCE_MATCH: 'Force Match',
  UPDATE_PRODUCT_IMAGE: 'Update Product Image',
  DELETE_PRODUCT_IMAGE: 'Delete Product Image',
  UPDATE_CATEGORY_IMAGE: 'Update Category Image',
  DELETE_CATEGORY_IMAGE: 'Delete Category Image',
  UPDATE_DEALS_SETTINGS: 'Update Deals Settings',
  TOGGLE_DEAL_PIN: 'Toggle Deal Pin',
  TOGGLE_DEAL_EXCLUDE: 'Toggle Deal Exclude'
};

const categoryLabelsAr: Record<string, string> = {
  Catalog: 'الكتالوج والمطابقة',
  MatchReview: 'مراجعة الجودة',
  Categories: 'التصنيفات',
  Deals: 'أفضل العروض',
  System: 'النظام'
};

const categoryLabelsEn: Record<string, string> = {
  Catalog: 'Catalog & Linking',
  MatchReview: 'Match Quality',
  Categories: 'Categories',
  Deals: 'Best Deals',
  System: 'System'
};
