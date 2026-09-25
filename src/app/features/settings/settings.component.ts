import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { LocaleService } from '../../core/services/locale.service';
import { NotificationService } from '../../core/services/notification.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { API_ORIGIN } from '../../core/infrastructure/http/api-origin';
import { API_ENDPOINTS } from '../../core/infrastructure/http/api-endpoints.constants';
import { AuditLogsComponent } from '../audit-logs/audit-logs.component';

type SettingsTab = 'help' | 'terms' | 'privacy' | 'logs' | 'dev';
type ContentLang = 'ar' | 'en';

interface FaqItem {
  id: string;
  questionAr: string;
  questionEn: string;
  answerAr: string;
  answerEn: string;
  icon?: string;
  category?: string;
}

interface PlatformContentAdmin {
  termsAr: string;
  termsEn: string;
  privacyAr: string;
  privacyEn: string;
  deliveryInfoAr: string;
  deliveryInfoEn: string;
  prescriptionInfoAr: string;
  prescriptionInfoEn: string;
  returnPolicyAr: string;
  returnPolicyEn: string;
  supportEmail: string;
  supportPhone: string;
  supportWhatsapp: string;
  workingHoursAr: string;
  workingHoursEn: string;
  isMaintenanceMode: boolean;
  maintenanceMessageAr: string;
  maintenanceMessageEn: string;
  maintenanceEstimatedEndTime: string;
  isDevMode: boolean;
  faqs: FaqItem[];
  updatedAtUtc?: string;
}

interface SystemLogEntry {
  id: string;
  timestampUtc: string;
  level: 'success' | 'info' | 'warn' | 'error';
  category: 'sync' | 'matching' | 'auth' | 'cms' | 'health';
  categoryLabelAr: string;
  categoryLabelEn: string;
  titleAr: string;
  titleEn: string;
  messageAr: string;
  messageEn: string;
  pharmacyCode?: string;
  detailsJson?: string;
}

interface DevSettings {
  devMode: boolean;
  debugLogs: boolean;
  mockFallback: boolean;
}

const SETTINGS_KEY = 'se7en_dev_settings';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, AuditLogsComponent],
  template: `
    <section class="w-full space-y-4 px-4 py-4 sm:px-5 sm:py-5" [attr.dir]="locale.isRtl() ? 'rtl' : 'ltr'">
      <!-- Active Maintenance Banner if enabled -->
      @if (content.isMaintenanceMode) {
        <div class="flex items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900 shadow-xs">
          <div class="flex items-center gap-3">
            <span class="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-700">
              <i class="pi pi-exclamation-triangle text-base"></i>
            </span>
            <div>
              <div class="text-xs font-bold sm:text-sm">{{ 'settings.maintenanceActiveAlert' | t }}</div>
              <div class="mt-0.5 text-[11px] text-amber-700">
                {{ locale.locale() === 'ar' ? content.maintenanceMessageAr : content.maintenanceMessageEn }}
              </div>
            </div>
          </div>
          <button
            type="button"
            (click)="setTab('dev')"
            class="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-amber-700"
          >
            <i class="pi pi-cog text-xs"></i>
            <span>{{ 'settings.tabDev' | t }}</span>
          </button>
        </div>
      }

      <!-- Header Banner -->
      <div class="overflow-hidden rounded-2xl border border-[#E8D5BE] bg-white shadow-sm">
        <div class="h-1.5 bg-[#C27938]"></div>
        <div class="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div class="min-w-0">
            <div class="inline-flex items-center gap-2 rounded-full bg-[#F8EEE2] px-3 py-1 text-[11px] font-bold text-[#C27938]">
              <span class="size-1.5 rounded-full bg-[#C27938]"></span>
              {{ 'settings.badge' | t }}
            </div>
            <h1 class="mt-3 text-balance text-2xl font-extrabold text-[#181A1D] sm:text-3xl">
              {{ 'settings.title' | t }}
            </h1>
            <p class="mt-1.5 max-w-2xl text-pretty text-sm font-medium text-[#8A735C]">
              {{ 'settings.subtitle' | t }}
            </p>
          </div>

          <!-- Save Button for CMS & Dev Tabs -->
          @if (activeTab() !== 'logs') {
            <button
              type="button"
              (click)="saveContentChanges()"
              [disabled]="savingContent()"
              class="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#C27938] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#A8682F] disabled:opacity-50"
            >
              @if (savingContent()) {
                <i class="pi pi-spin pi-spinner text-sm"></i>
                <span>{{ 'settings.savingContent' | t }}</span>
              } @else {
                <i class="pi pi-check text-sm"></i>
                <span>{{ 'settings.saveContent' | t }}</span>
              }
            </button>
          }
        </div>

        <!-- Navigation Tabs -->
        <div class="flex flex-wrap items-center justify-between border-t border-[#EDE0D0] bg-[#FDFBF7] px-3 py-2 sm:px-6">
          <div class="flex flex-wrap gap-1.5 sm:gap-2">
            <button
              type="button"
              (click)="setTab('help')"
              class="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all sm:text-sm"
              [ngClass]="activeTab() === 'help' ? 'bg-[#C27938] text-white shadow-sm' : 'bg-transparent text-[#6B5A48] hover:bg-[#F3EDE5] hover:text-[#181A1D]'"
            >
              <i class="pi pi-question-circle text-sm"></i>
              <span>{{ 'settings.tabHelp' | t }}</span>
            </button>

            <button
              type="button"
              (click)="setTab('terms')"
              class="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all sm:text-sm"
              [ngClass]="activeTab() === 'terms' ? 'bg-[#C27938] text-white shadow-sm' : 'bg-transparent text-[#6B5A48] hover:bg-[#F3EDE5] hover:text-[#181A1D]'"
            >
              <i class="pi pi-file text-sm"></i>
              <span>{{ 'settings.tabTerms' | t }}</span>
            </button>

            <button
              type="button"
              (click)="setTab('privacy')"
              class="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all sm:text-sm"
              [ngClass]="activeTab() === 'privacy' ? 'bg-[#C27938] text-white shadow-sm' : 'bg-transparent text-[#6B5A48] hover:bg-[#F3EDE5] hover:text-[#181A1D]'"
            >
              <i class="pi pi-shield text-sm"></i>
              <span>{{ 'settings.tabPrivacy' | t }}</span>
            </button>

            <button
              type="button"
              (click)="setTab('logs')"
              class="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all sm:text-sm"
              [ngClass]="activeTab() === 'logs' ? 'bg-[#C27938] text-white shadow-sm' : 'bg-transparent text-[#6B5A48] hover:bg-[#F3EDE5] hover:text-[#181A1D]'"
            >
              <i class="pi pi-history text-sm"></i>
              <span>{{ 'settings.tabLogs' | t }}</span>
            </button>

            <button
              type="button"
              (click)="setTab('dev')"
              class="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all sm:text-sm"
              [ngClass]="activeTab() === 'dev' ? 'bg-[#C27938] text-white shadow-sm' : 'bg-transparent text-[#6B5A48] hover:bg-[#F3EDE5] hover:text-[#181A1D]'"
            >
              <i class="pi pi-wrench text-sm"></i>
              <span>{{ 'settings.tabDev' | t }}</span>
            </button>
          </div>

          <!-- Language switch for content editing -->
          @if (activeTab() !== 'logs') {
            <div class="mt-2 flex items-center gap-1 rounded-xl border border-[#E8D5BE] bg-white p-1 sm:mt-0">
              <button
                type="button"
                (click)="setEditLang('ar')"
                class="rounded-lg px-2.5 py-1 text-xs font-bold transition-all"
                [ngClass]="editLang() === 'ar' ? 'bg-[#181A1D] text-white' : 'text-[#8A735C] hover:bg-[#FBF8F4]'"
              >
                عربي (AR)
              </button>
              <button
                type="button"
                (click)="setEditLang('en')"
                class="rounded-lg px-2.5 py-1 text-xs font-bold transition-all"
                [ngClass]="editLang() === 'en' ? 'bg-[#181A1D] text-white' : 'text-[#8A735C] hover:bg-[#FBF8F4]'"
              >
                English (EN)
              </button>
            </div>
          }
        </div>
      </div>

      <!-- Tab 1: Help Center, Delivery, Prescriptions, Returns & Support -->
      @if (activeTab() === 'help') {
        <div class="grid gap-4 lg:grid-cols-12">
          <!-- Main Form Column (8 cols) -->
          <div class="space-y-4 lg:col-span-8">
            <!-- Delivery Options Guide -->
            <div class="space-y-3 rounded-2xl border border-[#E8D5BE] bg-white p-5 shadow-sm sm:p-6">
              <div class="flex items-center gap-2 text-base font-bold text-[#181A1D] sm:text-lg">
                <span class="inline-flex size-8 items-center justify-center rounded-lg bg-[#C27938]/15 text-[#C27938]">
                  <i class="pi pi-truck text-sm"></i>
                </span>
                <span>{{ 'settings.deliveryTitle' | t }}</span>
              </div>
              <p class="text-xs text-[#8A735C] sm:text-sm">{{ 'settings.deliverySubtitle' | t }}</p>

              @if (editLang() === 'ar') {
                <textarea
                  rows="4"
                  [(ngModel)]="content.deliveryInfoAr"
                  dir="rtl"
                  class="w-full rounded-xl border border-[#E8D5BE] bg-[#FBF8F4] p-3 text-xs font-medium leading-relaxed outline-none focus:border-[#C27938] focus:bg-white sm:text-sm"
                  placeholder="أدخل تفاصيل وخيارات التوصيل بالعربية..."
                ></textarea>
              } @else {
                <textarea
                  rows="4"
                  [(ngModel)]="content.deliveryInfoEn"
                  dir="ltr"
                  class="w-full rounded-xl border border-[#E8D5BE] bg-[#FBF8F4] p-3 text-xs font-medium leading-relaxed outline-none focus:border-[#C27938] focus:bg-white sm:text-sm"
                  placeholder="Enter delivery options and times in English..."
                ></textarea>
              }
            </div>

            <!-- Prescription Management Guide -->
            <div class="space-y-3 rounded-2xl border border-[#E8D5BE] bg-white p-5 shadow-sm sm:p-6">
              <div class="flex items-center gap-2 text-base font-bold text-[#181A1D] sm:text-lg">
                <span class="inline-flex size-8 items-center justify-center rounded-lg bg-[#C27938]/15 text-[#C27938]">
                  <i class="pi pi-file-edit text-sm"></i>
                </span>
                <span>{{ 'settings.prescriptionTitle' | t }}</span>
              </div>
              <p class="text-xs text-[#8A735C] sm:text-sm">{{ 'settings.prescriptionSubtitle' | t }}</p>

              @if (editLang() === 'ar') {
                <textarea
                  rows="4"
                  [(ngModel)]="content.prescriptionInfoAr"
                  dir="rtl"
                  class="w-full rounded-xl border border-[#E8D5BE] bg-[#FBF8F4] p-3 text-xs font-medium leading-relaxed outline-none focus:border-[#C27938] focus:bg-white sm:text-sm"
                  placeholder="أدخل إرشادات الوصفات الطبية بالعربية..."
                ></textarea>
              } @else {
                <textarea
                  rows="4"
                  [(ngModel)]="content.prescriptionInfoEn"
                  dir="ltr"
                  class="w-full rounded-xl border border-[#E8D5BE] bg-[#FBF8F4] p-3 text-xs font-medium leading-relaxed outline-none focus:border-[#C27938] focus:bg-white sm:text-sm"
                  placeholder="Enter prescription guidelines in English..."
                ></textarea>
              }
            </div>

            <!-- Return Policy Guide -->
            <div class="space-y-3 rounded-2xl border border-[#E8D5BE] bg-white p-5 shadow-sm sm:p-6">
              <div class="flex items-center gap-2 text-base font-bold text-[#181A1D] sm:text-lg">
                <span class="inline-flex size-8 items-center justify-center rounded-lg bg-[#C27938]/15 text-[#C27938]">
                  <i class="pi pi-refresh text-sm"></i>
                </span>
                <span>{{ 'settings.returnTitle' | t }}</span>
              </div>
              <p class="text-xs text-[#8A735C] sm:text-sm">{{ 'settings.returnSubtitle' | t }}</p>

              @if (editLang() === 'ar') {
                <textarea
                  rows="4"
                  [(ngModel)]="content.returnPolicyAr"
                  dir="rtl"
                  class="w-full rounded-xl border border-[#E8D5BE] bg-[#FBF8F4] p-3 text-xs font-medium leading-relaxed outline-none focus:border-[#C27938] focus:bg-white sm:text-sm"
                  placeholder="أدخل سياسة الإرجاع واسترداد الأموال بالعربية..."
                ></textarea>
              } @else {
                <textarea
                  rows="4"
                  [(ngModel)]="content.returnPolicyEn"
                  dir="ltr"
                  class="w-full rounded-xl border border-[#E8D5BE] bg-[#FBF8F4] p-3 text-xs font-medium leading-relaxed outline-none focus:border-[#C27938] focus:bg-white sm:text-sm"
                  placeholder="Enter return and refund policy in English..."
                ></textarea>
              }
            </div>

            <!-- Direct Contact Support Channels -->
            <div class="space-y-4 rounded-2xl border border-[#E8D5BE] bg-white p-5 shadow-sm sm:p-6">
              <div class="flex items-center gap-2 text-base font-bold text-[#181A1D] sm:text-lg">
                <span class="inline-flex size-8 items-center justify-center rounded-lg bg-[#C27938]/15 text-[#C27938]">
                  <i class="pi pi-phone text-sm"></i>
                </span>
                <span>{{ 'settings.contactChannelsTitle' | t }}</span>
              </div>

              <div class="grid gap-3 sm:grid-cols-2">
                <label class="block space-y-1">
                  <span class="text-xs font-bold text-[#8A735C]">{{ 'settings.emailSupportTitle' | t }}</span>
                  <input
                    type="email"
                    [(ngModel)]="content.supportEmail"
                    class="h-10 w-full rounded-xl border border-[#E8D5BE] bg-[#FBF8F4] px-3 text-xs font-medium outline-none focus:border-[#C27938] focus:bg-white sm:text-sm"
                  />
                </label>

                <label class="block space-y-1">
                  <span class="text-xs font-bold text-[#8A735C]">{{ 'settings.phoneSupportTitle' | t }}</span>
                  <input
                    type="text"
                    [(ngModel)]="content.supportPhone"
                    class="h-10 w-full rounded-xl border border-[#E8D5BE] bg-[#FBF8F4] px-3 text-xs font-medium outline-none focus:border-[#C27938] focus:bg-white sm:text-sm"
                  />
                </label>

                <label class="block space-y-1">
                  <span class="text-xs font-bold text-[#8A735C]">{{ 'settings.whatsappTitle' | t }}</span>
                  <input
                    type="text"
                    [(ngModel)]="content.supportWhatsapp"
                    class="h-10 w-full rounded-xl border border-[#E8D5BE] bg-[#FBF8F4] px-3 text-xs font-medium outline-none focus:border-[#C27938] focus:bg-white sm:text-sm"
                  />
                </label>

                <label class="block space-y-1">
                  <span class="text-xs font-bold text-[#8A735C]">{{ 'settings.workingHoursTitle' | t }}</span>
                  <input
                    type="text"
                    [ngModel]="editLang() === 'ar' ? content.workingHoursAr : content.workingHoursEn"
                    (ngModelChange)="editLang() === 'ar' ? content.workingHoursAr = $event : content.workingHoursEn = $event"
                    class="h-10 w-full rounded-xl border border-[#E8D5BE] bg-[#FBF8F4] px-3 text-xs font-medium outline-none focus:border-[#C27938] focus:bg-white sm:text-sm"
                  />
                </label>
              </div>
            </div>
          </div>

          <!-- Mobile Live Preview Column (4 cols) -->
          <div class="space-y-4 lg:col-span-4">
            <div class="sticky top-4 rounded-3xl border-4 border-[#181A1D] bg-[#F7F2EA] p-3 shadow-xl">
              <!-- Phone notch / header -->
              <div class="mb-3 flex items-center justify-between px-2 pt-1 text-[11px] font-bold text-[#181A1D]">
                <span>9:41</span>
                <span class="rounded-full bg-[#181A1D]/10 px-2 py-0.5 text-[9px]">Mobile App Live Preview</span>
                <div class="flex items-center gap-1">
                  <i class="pi pi-wifi text-[10px]"></i>
                  <i class="pi pi-battery-empty text-[10px]"></i>
                </div>
              </div>

              <!-- App Header Bar -->
              <div class="flex items-center justify-between rounded-2xl bg-[#A87B4F] px-4 py-3 text-white">
                <span class="text-sm font-bold">{{ editLang() === 'ar' ? 'مركز المساعدة' : 'Help Center' }}</span>
                <span class="inline-flex size-7 items-center justify-center rounded-full bg-white/20 text-xs">
                  <i class="pi" [ngClass]="editLang() === 'ar' ? 'pi-arrow-right' : 'pi-arrow-left'"></i>
                </span>
              </div>

              <!-- App Content Cards -->
              <div class="mt-3 max-h-[500px] space-y-2.5 overflow-y-auto px-1 pb-2">
                <!-- Delivery Card -->
                <div class="flex items-center justify-between rounded-2xl border border-[#E6D7C3] bg-white p-3 shadow-xs">
                  <div class="min-w-0 flex-1">
                    <div class="truncate text-xs font-bold text-[#181A1D]">
                      {{ editLang() === 'ar' ? 'ما هي خيارات التوصيل؟' : 'What are the delivery options?' }}
                    </div>
                    <div class="mt-0.5 line-clamp-1 text-[10px] text-[#8A735C]">
                      {{ editLang() === 'ar' ? 'اطلع على طرق وأوقات التوصيل المتاحة' : 'Check available delivery methods' }}
                    </div>
                  </div>
                  <span class="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#F8EEE2] text-[#A87B4F]">
                    <i class="pi pi-truck text-sm"></i>
                  </span>
                </div>

                <!-- Prescriptions Card -->
                <div class="flex items-center justify-between rounded-2xl border border-[#E6D7C3] bg-white p-3 shadow-xs">
                  <div class="min-w-0 flex-1">
                    <div class="truncate text-xs font-bold text-[#181A1D]">
                      {{ editLang() === 'ar' ? 'كيف يمكنني إدارة وصفاتي الطبية؟' : 'How can I manage my prescriptions?' }}
                    </div>
                    <div class="mt-0.5 line-clamp-1 text-[10px] text-[#8A735C]">
                      {{ editLang() === 'ar' ? 'قم بتحميل وتتبع وصفاتك الطبية' : 'Upload and track your prescriptions' }}
                    </div>
                  </div>
                  <span class="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#F8EEE2] text-[#A87B4F]">
                    <i class="pi pi-file text-sm"></i>
                  </span>
                </div>

                <!-- Return Policy Card -->
                <div class="flex items-center justify-between rounded-2xl border border-[#E6D7C3] bg-white p-3 shadow-xs">
                  <div class="min-w-0 flex-1">
                    <div class="truncate text-xs font-bold text-[#181A1D]">
                      {{ editLang() === 'ar' ? 'ما هي سياسة الإرجاع؟' : 'What is the return policy?' }}
                    </div>
                    <div class="mt-0.5 line-clamp-1 text-[10px] text-[#8A735C]">
                      {{ editLang() === 'ar' ? 'تعرف على عملية الإرجاع واسترداد الأموال' : 'Learn about the return process' }}
                    </div>
                  </div>
                  <span class="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#F8EEE2] text-[#A87B4F]">
                    <i class="pi pi-box text-sm"></i>
                  </span>
                </div>

                <!-- Contact Section in Mobile Preview -->
                <div class="pt-2">
                  <div class="text-xs font-extrabold text-[#181A1D]">{{ editLang() === 'ar' ? 'اتصل بالدعم' : 'Contact Support' }}</div>
                  <div class="text-[10px] text-[#8A735C]">{{ editLang() === 'ar' ? 'تواصل مع فريق الدعم لدينا' : 'Get in touch with our team' }}</div>
                </div>

                <!-- Email Card -->
                <div class="flex items-center justify-between rounded-2xl border border-[#E6D7C3] bg-white p-3 shadow-xs">
                  <div class="min-w-0 flex-1">
                    <div class="text-xs font-bold text-[#181A1D]">
                      {{ editLang() === 'ar' ? 'الدعم عبر البريد الإلكتروني' : 'Email Support' }}
                    </div>
                    <div class="mt-0.5 truncate text-[10px] text-[#8A735C]">
                      {{ content.supportEmail || 'support@se-7en.com' }}
                    </div>
                  </div>
                  <span class="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#F8EEE2] text-[#A87B4F]">
                    <i class="pi pi-envelope text-sm"></i>
                  </span>
                </div>

                <!-- Phone Card -->
                <div class="flex items-center justify-between rounded-2xl border border-[#E6D7C3] bg-white p-3 shadow-xs">
                  <div class="min-w-0 flex-1">
                    <div class="text-xs font-bold text-[#181A1D]">
                      {{ editLang() === 'ar' ? 'الدعم عبر الهاتف' : 'Phone Support' }}
                    </div>
                    <div class="mt-0.5 truncate text-[10px] text-[#8A735C]">
                      {{ content.supportPhone || '+966 50 000 0000' }}
                    </div>
                  </div>
                  <span class="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#F8EEE2] text-[#A87B4F]">
                    <i class="pi pi-phone text-sm"></i>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Tab 2: Terms & Conditions -->
      @if (activeTab() === 'terms') {
        <div class="space-y-4 rounded-2xl border border-[#E8D5BE] bg-white p-5 shadow-sm sm:p-7">
          <div class="border-b border-[#EDE0D0] pb-4">
            <h2 class="text-lg font-bold text-[#181A1D] sm:text-xl">{{ 'settings.termsTitle' | t }}</h2>
            <p class="mt-1 text-xs text-[#8A735C] sm:text-sm">{{ 'settings.termsSubtitle' | t }}</p>
          </div>

          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-[#8A735C]">
                {{ editLang() === 'ar' ? 'نص الشروط والأحكام (عربي)' : 'Terms & Conditions Text (English)' }}
              </span>
              <span class="text-[11px] text-[#A8682F] font-semibold">{{ 'settings.mobileSyncNotice' | t }}</span>
            </div>

            @if (editLang() === 'ar') {
              <textarea
                rows="14"
                [(ngModel)]="content.termsAr"
                dir="rtl"
                class="w-full rounded-2xl border border-[#E8D5BE] bg-[#FBF8F4] p-4 text-xs font-medium leading-relaxed outline-none focus:border-[#C27938] focus:bg-white sm:text-sm"
                placeholder="أدخل نص الشروط والأحكام بالعربية..."
              ></textarea>
            } @else {
              <textarea
                rows="14"
                [(ngModel)]="content.termsEn"
                dir="ltr"
                class="w-full rounded-2xl border border-[#E8D5BE] bg-[#FBF8F4] p-4 text-xs font-medium leading-relaxed outline-none focus:border-[#C27938] focus:bg-white sm:text-sm"
                placeholder="Enter Terms and Conditions in English..."
              ></textarea>
            }
          </div>
        </div>
      }

      <!-- Tab 3: Privacy Policy -->
      @if (activeTab() === 'privacy') {
        <div class="space-y-4 rounded-2xl border border-[#E8D5BE] bg-white p-5 shadow-sm sm:p-7">
          <div class="border-b border-[#EDE0D0] pb-4">
            <h2 class="text-lg font-bold text-[#181A1D] sm:text-xl">{{ 'settings.privacyTitle' | t }}</h2>
            <p class="mt-1 text-xs text-[#8A735C] sm:text-sm">{{ 'settings.privacySubtitle' | t }}</p>
          </div>

          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-[#8A735C]">
                {{ editLang() === 'ar' ? 'نص سياسة الخصوصية (عربي)' : 'Privacy Policy Text (English)' }}
              </span>
              <span class="text-[11px] text-[#A8682F] font-semibold">{{ 'settings.mobileSyncNotice' | t }}</span>
            </div>

            @if (editLang() === 'ar') {
              <textarea
                rows="14"
                [(ngModel)]="content.privacyAr"
                dir="rtl"
                class="w-full rounded-2xl border border-[#E8D5BE] bg-[#FBF8F4] p-4 text-xs font-medium leading-relaxed outline-none focus:border-[#C27938] focus:bg-white sm:text-sm"
                placeholder="أدخل نص سياسة الخصوصية بالعربية..."
              ></textarea>
            } @else {
              <textarea
                rows="14"
                [(ngModel)]="content.privacyEn"
                dir="ltr"
                class="w-full rounded-2xl border border-[#E8D5BE] bg-[#FBF8F4] p-4 text-xs font-medium leading-relaxed outline-none focus:border-[#C27938] focus:bg-white sm:text-sm"
                placeholder="Enter Privacy Policy in English..."
              ></textarea>
            }
          </div>
        </div>
      }

      <!-- Tab 4: Unified System & Audit Logs -->
      @if (activeTab() === 'logs') {
        <app-audit-logs [isEmbedded]="true" />
      }

      <!-- Tab 5: Development & Maintenance Mode -->
      @if (activeTab() === 'dev') {
        <div class="grid gap-4 lg:grid-cols-12">
          <!-- Left Column: Controls (7 cols) -->
          <div class="space-y-4 lg:col-span-7">
            <!-- Mobile App Maintenance Mode Card -->
            <div class="space-y-4 rounded-2xl border-2 border-[#C27938]/40 bg-white p-5 shadow-sm sm:p-6">
              <div class="flex items-center justify-between border-b border-[#EDE0D0] pb-3">
                <div>
                  <h2 class="text-base font-bold text-[#181A1D] sm:text-lg">{{ 'settings.maintenanceTitle' | t }}</h2>
                  <p class="mt-1 text-xs text-[#8A735C] sm:text-sm">{{ 'settings.maintenanceSubtitle' | t }}</p>
                </div>
                <button
                  type="button"
                  (click)="content.isMaintenanceMode = !content.isMaintenanceMode"
                  class="relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                  [ngClass]="content.isMaintenanceMode ? 'bg-[#C27938]' : 'bg-[#D6C4B0]'"
                >
                  <span
                    class="pointer-events-none inline-block size-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                    [ngClass]="content.isMaintenanceMode ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0'"
                  ></span>
                </button>
              </div>

              <!-- Maintenance Message Inputs -->
              <div class="space-y-3 pt-1">
                <label class="block space-y-1">
                  <span class="text-xs font-bold text-[#181A1D]">
                    {{ editLang() === 'ar' ? ('settings.maintenanceMsgArLabel' | t) : ('settings.maintenanceMsgEnLabel' | t) }}
                  </span>
                  @if (editLang() === 'ar') {
                    <textarea
                      rows="3"
                      [(ngModel)]="content.maintenanceMessageAr"
                      dir="rtl"
                      class="w-full rounded-xl border border-[#E8D5BE] bg-[#FBF8F4] p-3 text-xs font-medium leading-relaxed outline-none focus:border-[#C27938] focus:bg-white sm:text-sm"
                      placeholder="أدخل رسالة التنبيه التي تظهر للمستخدم..."
                    ></textarea>
                  } @else {
                    <textarea
                      rows="3"
                      [(ngModel)]="content.maintenanceMessageEn"
                      dir="ltr"
                      class="w-full rounded-xl border border-[#E8D5BE] bg-[#FBF8F4] p-3 text-xs font-medium leading-relaxed outline-none focus:border-[#C27938] focus:bg-white sm:text-sm"
                      placeholder="Enter maintenance message in English..."
                    ></textarea>
                  }
                </label>

                <label class="block space-y-1">
                  <span class="text-xs font-bold text-[#8A735C]">{{ 'settings.maintenanceEstTimeLabel' | t }}</span>
                  <input
                    type="text"
                    [(ngModel)]="content.maintenanceEstimatedEndTime"
                    placeholder="مثال: خلال ساعة واحدة"
                    class="h-10 w-full rounded-xl border border-[#E8D5BE] bg-[#FBF8F4] px-3 text-xs font-medium outline-none focus:border-[#C27938] focus:bg-white sm:text-sm"
                  />
                </label>
              </div>
            </div>

            <!-- Platform Dev Mode & Local Tools -->
            <div class="space-y-4 rounded-2xl border border-[#E8D5BE] bg-white p-5 shadow-sm sm:p-6">
              <div>
                <h2 class="text-base font-bold text-[#181A1D] sm:text-lg">{{ 'settings.devTitle' | t }}</h2>
                <p class="mt-1 text-xs text-[#8A735C] sm:text-sm">{{ 'settings.devSubtitle' | t }}</p>
              </div>

              <div class="space-y-3 pt-1">
                <!-- Platform Dev Mode Toggle -->
                <div class="flex items-center justify-between gap-3 rounded-xl border border-[#E8D5BE] bg-[#FBF8F4] p-3.5">
                  <div class="min-w-0 flex-1">
                    <div class="text-xs font-bold text-[#181A1D] sm:text-sm">{{ 'settings.devModeToggle' | t }}</div>
                    <div class="text-[11px] text-[#8A735C] sm:text-xs">{{ 'settings.devModeHint' | t }}</div>
                  </div>
                  <button
                    type="button"
                    (click)="content.isDevMode = !content.isDevMode"
                    class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                    [ngClass]="content.isDevMode ? 'bg-[#C27938]' : 'bg-[#D6C4B0]'"
                  >
                    <span
                      class="pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                      [ngClass]="content.isDevMode ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0'"
                    ></span>
                  </button>
                </div>

                <!-- Debug Logs Toggle -->
                <div class="flex items-center justify-between gap-3 rounded-xl border border-[#E8D5BE] bg-[#FBF8F4] p-3.5">
                  <div class="min-w-0 flex-1">
                    <div class="text-xs font-bold text-[#181A1D] sm:text-sm">{{ 'settings.debugLogsToggle' | t }}</div>
                    <div class="text-[11px] text-[#8A735C] sm:text-xs">{{ 'settings.debugLogsHint' | t }}</div>
                  </div>
                  <button
                    type="button"
                    (click)="toggleDebugLogs()"
                    class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                    [ngClass]="devSettings().debugLogs ? 'bg-[#C27938]' : 'bg-[#D6C4B0]'"
                  >
                    <span
                      class="pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                      [ngClass]="devSettings().debugLogs ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0'"
                    ></span>
                  </button>
                </div>

                <!-- Mock Fallback Toggle -->
                <div class="flex items-center justify-between gap-3 rounded-xl border border-[#E8D5BE] bg-[#FBF8F4] p-3.5">
                  <div class="min-w-0 flex-1">
                    <div class="text-xs font-bold text-[#181A1D] sm:text-sm">{{ 'settings.mockModeToggle' | t }}</div>
                    <div class="text-[11px] text-[#8A735C] sm:text-xs">{{ 'settings.mockModeHint' | t }}</div>
                  </div>
                  <button
                    type="button"
                    (click)="toggleMockFallback()"
                    class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                    [ngClass]="devSettings().mockFallback ? 'bg-[#C27938]' : 'bg-[#D6C4B0]'"
                  >
                    <span
                      class="pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                      [ngClass]="devSettings().mockFallback ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0'"
                    ></span>
                  </button>
                </div>
              </div>

              <!-- Clear Cache Action -->
              <div class="mt-4 rounded-xl border border-rose-200 bg-rose-50/50 p-4">
                <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div class="min-w-0">
                    <div class="text-xs font-bold text-rose-900 sm:text-sm">{{ 'settings.cacheTitle' | t }}</div>
                    <div class="text-[11px] text-rose-700 sm:text-xs">{{ 'settings.cacheHint' | t }}</div>
                  </div>
                  <button
                    type="button"
                    (click)="clearLocalCache()"
                    class="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-rose-700"
                  >
                    <i class="pi pi-trash text-xs"></i>
                    <span>{{ 'settings.clearCacheBtn' | t }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Column: Live Mobile Preview & System Info (5 cols) -->
          <div class="space-y-4 lg:col-span-5">
            <!-- Mobile App Maintenance Preview -->
            <div class="rounded-3xl border-4 border-[#181A1D] bg-[#FAF7F2] p-4 shadow-xl text-center">
              <div class="mb-3 flex items-center justify-between px-1 text-[10px] font-bold text-[#8A735C]">
                <span>9:41</span>
                <span class="rounded-full bg-[#181A1D]/10 px-2 py-0.5 text-[9px] font-bold text-[#181A1D]">
                  {{ 'settings.maintenancePreviewBadge' | t }}
                </span>
                <div class="flex items-center gap-1">
                  <i class="pi pi-wifi text-[10px]"></i>
                  <i class="pi pi-battery-empty text-[10px]"></i>
                </div>
              </div>

              <div class="my-6 flex flex-col items-center justify-center px-3">
                <span class="inline-flex size-16 items-center justify-center rounded-2xl bg-[#C27938]/15 text-[#C27938]">
                  <i class="pi pi-wrench text-2xl"></i>
                </span>
                <h3 class="mt-4 text-base font-extrabold text-[#181A1D]">
                  {{ editLang() === 'ar' ? 'وضع الصيانة والتطوير' : 'Maintenance & Upgrade Mode' }}
                </h3>
                <p class="mt-2 text-xs font-medium leading-relaxed text-[#6B5A48]">
                  {{ (editLang() === 'ar' ? content.maintenanceMessageAr : content.maintenanceMessageEn) || 'التطبيق حالياً تحت الصيانة الدورية...' }}
                </p>

                @if (content.maintenanceEstimatedEndTime) {
                  <div class="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#F3EDE5] px-3 py-1 text-[11px] font-bold text-[#8A735C]">
                    <i class="pi pi-clock text-xs text-[#C27938]"></i>
                    <span>{{ content.maintenanceEstimatedEndTime }}</span>
                  </div>
                }

                <div class="mt-6 flex w-full flex-col gap-2">
                  <div class="rounded-xl border border-[#E8D5BE] bg-white p-2.5 text-xs font-bold text-[#181A1D]">
                    <i class="pi pi-envelope text-[#C27938] me-1.5"></i>
                    {{ content.supportEmail || 'support@se-7en.com' }}
                  </div>
                  <div class="rounded-xl border border-[#E8D5BE] bg-white p-2.5 text-xs font-bold text-[#181A1D]">
                    <i class="pi pi-whatsapp text-emerald-600 me-1.5"></i>
                    {{ content.supportWhatsapp || '+966 50 000 0000' }}
                  </div>
                </div>
              </div>
            </div>

            <!-- System Info Card -->
            <div class="space-y-3 rounded-2xl border border-[#E8D5BE] bg-white p-5 shadow-sm">
              <h3 class="text-sm font-bold text-[#181A1D]">{{ 'settings.systemInfoTitle' | t }}</h3>
              <div class="space-y-2">
                <div class="flex items-center justify-between rounded-xl border border-[#EDE0D0] bg-[#FBF8F4] px-3 py-2 text-xs">
                  <span class="font-bold text-[#8A735C]">{{ 'settings.appVersion' | t }}</span>
                  <span class="font-mono font-bold text-[#181A1D]">v2.1.0-release</span>
                </div>
                <div class="flex items-center justify-between rounded-xl border border-[#EDE0D0] bg-[#FBF8F4] px-3 py-2 text-xs">
                  <span class="font-bold text-[#8A735C]">{{ 'settings.environment' | t }}</span>
                  <span class="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-0.5 font-bold text-emerald-800">
                    <span class="size-1.5 rounded-full bg-emerald-600"></span>
                    Production
                  </span>
                </div>
                <div class="flex items-center justify-between rounded-xl border border-[#EDE0D0] bg-[#FBF8F4] px-3 py-2 text-xs">
                  <span class="font-bold text-[#8A735C]">{{ 'settings.apiOrigin' | t }}</span>
                  <span class="font-mono font-bold text-[#C27938]">{{ apiOrigin }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    </section>
  `
})
export class SettingsComponent implements OnInit {
  readonly locale = inject(LocaleService);
  private readonly notification = inject(NotificationService);
  private readonly i18n = inject(I18nService);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly apiOrigin = API_ORIGIN;
  readonly activeTab = signal<SettingsTab>('help');
  readonly editLang = signal<ContentLang>('ar');
  readonly savingContent = signal(false);
  readonly loadingContent = signal(false);

  readonly devSettings = signal<DevSettings>({
    devMode: false,
    debugLogs: false,
    mockFallback: false
  });

  content: PlatformContentAdmin = {
    termsAr: '',
    termsEn: '',
    privacyAr: '',
    privacyEn: '',
    deliveryInfoAr: '',
    deliveryInfoEn: '',
    prescriptionInfoAr: '',
    prescriptionInfoEn: '',
    returnPolicyAr: '',
    returnPolicyEn: '',
    supportEmail: 'support@se-7en.com',
    supportPhone: '+966 50 000 0000',
    supportWhatsapp: '+966 50 000 0000',
    workingHoursAr: 'السبت - الخميس: 9:00 ص - 6:00 م',
    workingHoursEn: 'Saturday - Thursday: 9:00 AM - 6:00 PM',
    isMaintenanceMode: false,
    maintenanceMessageAr: 'التطبيق حالياً تحت الصيانة والتطوير الدوري لتحديث الأسعار وتحسين الخدمة. سنعود قريباً!',
    maintenanceMessageEn: 'The application is currently undergoing scheduled maintenance and service upgrades. We will be back shortly!',
    maintenanceEstimatedEndTime: '',
    isDevMode: false,
    faqs: []
  };

  ngOnInit(): void {
    this.loadLocalDevSettings();
    this.syncFromUrl();
    this.fetchAdminContent();
  }

  setTab(tab: SettingsTab): void {
    this.activeTab.set(tab);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge'
    });
  }

  setEditLang(lang: ContentLang): void {
    this.editLang.set(lang);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { lang },
      queryParamsHandling: 'merge'
    });
  }

  private syncFromUrl(): void {
    this.route.queryParams.subscribe((params) => {
      const tabParam = params['tab'] as SettingsTab | undefined;
      if (tabParam && ['help', 'terms', 'privacy', 'logs', 'dev'].includes(tabParam)) {
        this.activeTab.set(tabParam);
      }
      const langParam = params['lang'] as ContentLang | undefined;
      if (langParam && ['ar', 'en'].includes(langParam)) {
        this.editLang.set(langParam);
      }
    });
  }

  fetchAdminContent(): void {
    this.loadingContent.set(true);
    this.http.get<PlatformContentAdmin>(API_ENDPOINTS.ADMIN_CONTENT).subscribe({
      next: (res) => {
        this.loadingContent.set(false);
        if (res) {
          this.content = {
            ...this.content,
            ...res
          };
        }
      },
      error: () => {
        this.loadingContent.set(false);
      }
    });
  }



  saveContentChanges(): void {
    this.savingContent.set(true);
    this.http.put<PlatformContentAdmin>(API_ENDPOINTS.ADMIN_CONTENT, this.content).subscribe({
      next: (res) => {
        this.savingContent.set(false);
        if (res) {
          this.content = { ...this.content, ...res };
        }
        this.notification.showSuccess(
          this.i18n.t('settings.contentSaved'),
          this.locale.isRtl() ? 'تم الحفظ' : 'Saved'
        );
      },
      error: () => {
        this.savingContent.set(false);
        this.notification.showError(
          this.i18n.t('settings.saveError'),
          this.locale.isRtl() ? 'خطأ' : 'Error'
        );
      }
    });
  }



  private loadLocalDevSettings(): void {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        this.devSettings.set(JSON.parse(raw));
      }
    } catch {
      // ignore
    }
  }

  toggleDebugLogs(): void {
    this.updateSetting({ debugLogs: !this.devSettings().debugLogs });
  }

  toggleMockFallback(): void {
    this.updateSetting({ mockFallback: !this.devSettings().mockFallback });
  }

  clearLocalCache(): void {
    const authKey = 'se7en_auth_user';
    const authUser = localStorage.getItem(authKey);
    localStorage.clear();
    if (authUser) {
      localStorage.setItem(authKey, authUser);
    }
    this.notification.showSuccess(
      this.i18n.t('settings.cacheClearedMsg'),
      this.i18n.t('settings.cacheClearedTitle')
    );
  }

  private updateSetting(patch: Partial<DevSettings>): void {
    const updated = { ...this.devSettings(), ...patch };
    this.devSettings.set(updated);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      this.notification.showSuccess(this.i18n.t('settings.settingsSaved'));
    } catch {
      // ignore
    }
  }
}
