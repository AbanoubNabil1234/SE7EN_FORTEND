import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { LoginUseCase } from '../../../core/use-cases/auth/login.use-case';
import { NotificationService } from '../../../core/services/notification.service';
import { LocaleService } from '../../../core/services/locale.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { AuthRepository } from '../../../core/domain/repositories/auth.repository';
import { DashboardRepository } from '../../../core/domain/repositories/dashboard.repository';
import { CatalogBrowseRepository } from '../../../core/domain/repositories/catalog-browse.repository';
import { PHARMACY_BRANDS, pharmacyDisplayName } from '../../../core/domain/pharmacy-brands';

interface PharmacySource {
  code: string;
  nameEn: string;
  nameAr: string;
  logo: string;
  angle: number;
}

type AuthView = 'login' | 'forgot' | 'verify' | 'reset';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly loginUseCase = inject(LoginUseCase);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  readonly localeService = inject(LocaleService);
  private readonly i18n = inject(I18nService);
  private readonly auth = inject(AuthRepository);
  private readonly dashboard = inject(DashboardRepository);
  private readonly catalog = inject(CatalogBrowseRepository);

  /** Accepts normal emails and seed hosts like admin@se7en.local */
  private static emailAddress(control: AbstractControl): ValidationErrors | null {
    const value = String(control.value ?? '').trim();
    if (!value) return null;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : { email: true };
  }

  readonly year = new Date().getFullYear();
  readonly submitting = signal(false);
  readonly showPassword = signal(false);
  readonly showConfirmPassword = signal(false);
  readonly error = signal<string | null>(null);
  readonly view = signal<AuthView>('login');
  readonly recoveryEmail = signal('');
  readonly recoveryCode = signal('');
  readonly orbitRadius = 128;

  readonly pharmacies = PHARMACY_BRANDS.map((p, i) => ({
    code: p.code,
    logo: p.logo,
    angle: (360 / PHARMACY_BRANDS.length) * i
  }));

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, LoginComponent.emailAddress]],
    password: ['', [Validators.required, Validators.minLength(4)]]
  });

  readonly forgotForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, LoginComponent.emailAddress]]
  });

  readonly verifyForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
  });

  readonly resetForm = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required, Validators.minLength(6)]]
  });

  pharmacyName(p: { code: string }): string {
    return pharmacyDisplayName(p.code, undefined, this.localeService.locale());
  }

  hubX(angleDeg: number): number {
    return 210 + this.orbitRadius * Math.sin((angleDeg * Math.PI) / 180);
  }

  hubY(angleDeg: number): number {
    return 210 - this.orbitRadius * Math.cos((angleDeg * Math.PI) / 180);
  }

  openForgot(): void {
    this.error.set(null);
    const email = this.form.controls.email.value;
    if (email) {
      this.forgotForm.controls.email.setValue(email);
    }
    this.view.set('forgot');
  }

  backToLogin(): void {
    this.error.set(null);
    this.verifyForm.reset();
    this.resetForm.reset();
    this.showPassword.set(false);
    this.showConfirmPassword.set(false);
    this.view.set('login');
  }

  onForgotSubmit(): void {
    if (this.forgotForm.invalid || this.submitting()) {
      this.forgotForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.error.set(null);
    const email = this.forgotForm.controls.email.value;
    this.recoveryEmail.set(email);

    this.auth
      .forgotPassword({ email })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => {
          this.notifications.showSuccess(this.i18n.t('login.codeSent'), this.i18n.t('login.forgotTitle'));
          this.verifyForm.reset();
          this.view.set('verify');
        },
        error: () => this.error.set(this.i18n.t('login.loginError'))
      });
  }

  resendCode(): void {
    if (this.submitting()) {
      return;
    }
    this.submitting.set(true);
    this.auth
      .forgotPassword({ email: this.recoveryEmail() })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () =>
          this.notifications.showSuccess(this.i18n.t('login.codeSent'), this.i18n.t('login.verifyTitle')),
        error: () => this.error.set(this.i18n.t('login.loginError'))
      });
  }

  onVerifySubmit(): void {
    if (this.verifyForm.invalid || this.submitting()) {
      this.verifyForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.error.set(null);
    const code = this.verifyForm.controls.code.value.trim();

    this.auth
      .verifyResetCode({ email: this.recoveryEmail(), code })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => {
          this.recoveryCode.set(code);
          this.resetForm.reset();
          this.showPassword.set(false);
          this.showConfirmPassword.set(false);
          this.view.set('reset');
        },
        error: () => this.error.set(this.i18n.t('login.codeInvalid'))
      });
  }

  onResetSubmit(): void {
    if (this.resetForm.invalid || this.submitting()) {
      this.resetForm.markAllAsTouched();
      return;
    }

    const { password, confirmPassword } = this.resetForm.getRawValue();
    if (password !== confirmPassword) {
      this.error.set(this.i18n.t('login.passwordMismatch'));
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    this.auth
      .resetPassword({
        email: this.recoveryEmail(),
        code: this.recoveryCode(),
        newPassword: password
      })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => {
          this.notifications.showSuccess(this.i18n.t('login.resetDone'), this.i18n.t('login.resetTitle'));
          this.form.controls.email.setValue(this.recoveryEmail());
          this.form.controls.password.setValue('');
          this.backToLogin();
        },
        error: () => this.error.set(this.i18n.t('login.loginError'))
      });
  }

  onSubmit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.error.set(null);
    this.loginUseCase
      .execute(this.form.getRawValue())
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (user) => {
          if (user.role !== 'Admin') {
            this.auth.logout().subscribe();
            this.error.set(this.i18n.t('login.adminOnlyError'));
            return;
          }
          this.notifications.showSuccess(this.i18n.t('login.signedInMsg'), this.i18n.t('login.signedInTitle'));
          this.prefetchAdminHome();
          void this.router.navigateByUrl('/dashboard');
        },
        error: (err) => {
          const apiMessage = err?.error?.message;
          this.error.set(typeof apiMessage === 'string' && apiMessage.trim() ? apiMessage : this.i18n.t('login.loginError'));
        }
      });
  }

  private prefetchAdminHome(): void {
    this.dashboard.getSnapshot().subscribe({ error: () => undefined });
    this.catalog.listFamilies({ page: 1, pageSize: 24, sort: 'nameAsc' }).subscribe({ error: () => undefined });
  }
}
