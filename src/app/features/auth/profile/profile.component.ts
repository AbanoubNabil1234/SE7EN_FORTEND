import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { AuthRepository } from '../../../core/domain/repositories/auth.repository';
import { User } from '../../../core/domain/models/user.model';
import { LocaleService } from '../../../core/services/locale.service';
import { NotificationService } from '../../../core/services/notification.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-profile',
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
              {{ 'profile.badge' | t }}
            </div>
            <h1 class="mt-3 text-balance text-3xl font-extrabold text-[#181A1D] sm:text-4xl">
              {{ 'profile.title' | t }}
            </h1>
            <p class="mt-1.5 max-w-xl text-pretty text-sm font-medium text-[#8A735C]">
              {{ 'profile.subtitle' | t }}
            </p>
          </div>
          @if (user()) {
            <div class="flex items-center gap-3 rounded-2xl border border-[#E8D5BE] bg-[#FBF8F4] p-3">
              <img src="assets/logo.png" alt="" class="size-12 rounded-xl object-cover" aria-hidden="true" />
              <div class="min-w-0">
                <div class="truncate text-sm font-bold text-[#181A1D]">{{ user()!.fullName }}</div>
                <div class="truncate text-xs font-medium text-[#8A735C]">{{ user()!.email }}</div>
                <div class="mt-0.5 text-[11px] font-bold text-[#C27938]">{{ user()!.role }}</div>
              </div>
            </div>
          }
        </div>
      </div>

      <div class="grid gap-4 lg:grid-cols-2">
        <form
          class="space-y-4 rounded-2xl border border-[#E8D5BE] bg-white p-5 shadow-sm sm:p-6"
          [formGroup]="profileForm"
          (ngSubmit)="saveProfile()"
        >
          <h2 class="text-lg font-bold text-[#181A1D]">{{ 'profile.detailsTitle' | t }}</h2>
          <p class="text-pretty text-sm text-[#8A735C]">{{ 'profile.detailsHint' | t }}</p>

          <label class="block space-y-1.5">
            <span class="text-xs font-bold text-[#8A735C]">{{ 'profile.firstName' | t }}</span>
            <input
              type="text"
              formControlName="firstName"
              class="min-h-11 w-full rounded-xl border border-[#E8D5BE] bg-[#FBF8F4] px-3 text-sm font-medium outline-none focus:border-[#C27938] focus:bg-white"
            />
          </label>

          <label class="block space-y-1.5">
            <span class="text-xs font-bold text-[#8A735C]">{{ 'profile.lastName' | t }}</span>
            <input
              type="text"
              formControlName="lastName"
              class="min-h-11 w-full rounded-xl border border-[#E8D5BE] bg-[#FBF8F4] px-3 text-sm font-medium outline-none focus:border-[#C27938] focus:bg-white"
            />
          </label>

          <label class="block space-y-1.5">
            <span class="text-xs font-bold text-[#8A735C]">{{ 'profile.email' | t }}</span>
            <input
              type="email"
              [value]="user()?.email || ''"
              readonly
              class="min-h-11 w-full rounded-xl border border-[#EDE0D0] bg-[#F3EDE5] px-3 text-sm font-medium text-[#8A735C]"
            />
          </label>

          <label class="block space-y-1.5">
            <span class="text-xs font-bold text-[#8A735C]">{{ 'profile.phone' | t }}</span>
            <input
              type="tel"
              formControlName="phone"
              class="min-h-11 w-full rounded-xl border border-[#E8D5BE] bg-[#FBF8F4] px-3 text-sm font-medium outline-none focus:border-[#C27938] focus:bg-white"
              [placeholder]="'profile.phonePlaceholder' | t"
            />
          </label>

          @if (profileError()) {
            <p class="text-sm font-medium text-rose-700">{{ profileError() }}</p>
          }

          <button
            type="submit"
            class="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#C27938] px-5 text-sm font-bold text-white hover:bg-[#A8682F] disabled:opacity-60"
            [disabled]="profileForm.invalid || savingProfile()"
          >
            {{ savingProfile() ? ('profile.saving' | t) : ('profile.save' | t) }}
          </button>
        </form>

        <form
          class="space-y-4 rounded-2xl border border-[#E8D5BE] bg-white p-5 shadow-sm sm:p-6"
          [formGroup]="passwordForm"
          (ngSubmit)="savePassword()"
        >
          <h2 class="text-lg font-bold text-[#181A1D]">{{ 'profile.passwordTitle' | t }}</h2>
          <p class="text-pretty text-sm text-[#8A735C]">{{ 'profile.passwordHint' | t }}</p>

          <label class="block space-y-1.5">
            <span class="text-xs font-bold text-[#8A735C]">{{ 'profile.currentPassword' | t }}</span>
            <input
              type="password"
              formControlName="currentPassword"
              autocomplete="current-password"
              class="min-h-11 w-full rounded-xl border border-[#E8D5BE] bg-[#FBF8F4] px-3 text-sm font-medium outline-none focus:border-[#C27938] focus:bg-white"
            />
          </label>

          <label class="block space-y-1.5">
            <span class="text-xs font-bold text-[#8A735C]">{{ 'profile.newPassword' | t }}</span>
            <input
              type="password"
              formControlName="newPassword"
              autocomplete="new-password"
              class="min-h-11 w-full rounded-xl border border-[#E8D5BE] bg-[#FBF8F4] px-3 text-sm font-medium outline-none focus:border-[#C27938] focus:bg-white"
            />
          </label>

          <label class="block space-y-1.5">
            <span class="text-xs font-bold text-[#8A735C]">{{ 'profile.confirmPassword' | t }}</span>
            <input
              type="password"
              formControlName="confirmPassword"
              autocomplete="new-password"
              class="min-h-11 w-full rounded-xl border border-[#E8D5BE] bg-[#FBF8F4] px-3 text-sm font-medium outline-none focus:border-[#C27938] focus:bg-white"
            />
          </label>

          @if (passwordError()) {
            <p class="text-sm font-medium text-rose-700">{{ passwordError() }}</p>
          }

          <button
            type="submit"
            class="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#E8D5BE] bg-[#F8EEE2] px-5 text-sm font-bold text-[#181A1D] hover:bg-[#F0E0CC] disabled:opacity-60"
            [disabled]="passwordForm.invalid || savingPassword()"
          >
            {{ savingPassword() ? ('profile.saving' | t) : ('profile.changePassword' | t) }}
          </button>
        </form>
      </div>
    </section>
  `
})
export class ProfileComponent implements OnInit {
  private readonly auth = inject(AuthRepository);
  private readonly fb = inject(FormBuilder);
  private readonly notifications = inject(NotificationService);
  private readonly i18n = inject(I18nService);
  readonly locale = inject(LocaleService);

  readonly user = signal<User | null>(null);
  readonly savingProfile = signal(false);
  readonly savingPassword = signal(false);
  readonly profileError = signal('');
  readonly passwordError = signal('');

  readonly profileForm = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.minLength(1)]],
    lastName: ['', [Validators.required, Validators.minLength(1)]],
    phone: ['']
  });

  readonly passwordForm = this.fb.nonNullable.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required]
  });

  ngOnInit(): void {
    this.auth.refreshMe().subscribe({
      next: (u) => this.applyUser(u),
      error: () => this.profileError.set(this.i18n.t('profile.loadError'))
    });
  }

  saveProfile(): void {
    if (this.profileForm.invalid) return;
    this.profileError.set('');
    this.savingProfile.set(true);
    const value = this.profileForm.getRawValue();
    this.auth
      .updateProfile({
        firstName: value.firstName.trim(),
        lastName: value.lastName.trim(),
        phone: value.phone.trim() || null
      })
      .pipe(finalize(() => this.savingProfile.set(false)))
      .subscribe({
        next: (u) => {
          this.applyUser(u);
          this.notifications.showSuccess(
            this.i18n.t('profile.savedMsg'),
            this.i18n.t('profile.savedTitle')
          );
        },
        error: () => this.profileError.set(this.i18n.t('profile.saveError'))
      });
  }

  savePassword(): void {
    if (this.passwordForm.invalid) return;
    const value = this.passwordForm.getRawValue();
    if (value.newPassword !== value.confirmPassword) {
      this.passwordError.set(this.i18n.t('profile.passwordMismatch'));
      return;
    }
    this.passwordError.set('');
    this.savingPassword.set(true);
    this.auth
      .changePassword({
        currentPassword: value.currentPassword,
        newPassword: value.newPassword
      })
      .pipe(finalize(() => this.savingPassword.set(false)))
      .subscribe({
        next: () => {
          this.passwordForm.reset();
          this.notifications.showSuccess(
            this.i18n.t('profile.passwordChangedMsg'),
            this.i18n.t('profile.passwordChangedTitle')
          );
        },
        error: () => this.passwordError.set(this.i18n.t('profile.passwordError'))
      });
  }

  private applyUser(u: User | null): void {
    this.user.set(u);
    if (!u) return;
    this.profileForm.patchValue({
      firstName: u.firstName || u.fullName.split(/\s+/)[0] || '',
      lastName: u.lastName || u.fullName.split(/\s+/).slice(1).join(' ') || '',
      phone: u.phone || ''
    });
  }
}
