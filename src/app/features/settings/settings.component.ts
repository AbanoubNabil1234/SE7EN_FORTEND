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
  templateUrl: './settings.component.html'
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
    workingHoursAr: '',
    workingHoursEn: '',
    isMaintenanceMode: false,
    maintenanceMessageAr: '',
    maintenanceMessageEn: '',
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
          this.i18n.t('common.saved')
        );
      },
      error: () => {
        this.savingContent.set(false);
        this.notification.showError(
          this.i18n.t('settings.saveError'),
          this.i18n.t('common.error')
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
