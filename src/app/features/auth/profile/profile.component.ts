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
  templateUrl: './profile.component.html'
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
