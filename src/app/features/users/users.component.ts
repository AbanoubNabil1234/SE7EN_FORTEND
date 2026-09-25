import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { finalize } from 'rxjs';
import { I18nService } from '../../core/i18n/i18n.service';
import { LocaleService } from '../../core/services/locale.service';
import { NotificationService } from '../../core/services/notification.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { API_ENDPOINTS } from '../../core/infrastructure/http/api-endpoints.constants';

interface AdminUserRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: string;
  phone?: string | null;
  isActive: boolean;
  createdAt: string;
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './users.component.html'
})
export class UsersComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);
  private readonly i18n = inject(I18nService);
  private readonly notifications = inject(NotificationService);
  readonly locale = inject(LocaleService);

  readonly query = signal('');
  readonly roleFilter = signal<'all' | 'Admin' | 'Customer'>('all');
  readonly items = signal<AdminUserRow[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly createOpen = signal(false);
  readonly creating = signal(false);
  readonly createError = signal('');

  readonly createForm = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  readonly adminCount = computed(
    () => this.items().filter((u) => u.role === 'Admin').length
  );
  readonly customerCount = computed(
    () => this.items().filter((u) => u.role === 'Customer').length
  );
  readonly activeCount = computed(() => this.items().filter((u) => u.isActive).length);

  readonly roleTabs = computed(() => {
    this.locale.locale();
    return [
      { value: 'all' as const, label: this.i18n.t('users.all') },
      { value: 'Admin' as const, label: this.i18n.t('users.roleAdmin') },
      { value: 'Customer' as const, label: this.i18n.t('users.roleCustomer') }
    ];
  });

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const role = this.roleFilter();
    return this.items().filter((user) => {
      const matchesQuery =
        !q ||
        user.fullName.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        (user.phone || '').includes(q);
      const matchesRole = role === 'all' || user.role === role;
      return matchesQuery && matchesRole;
    });
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set('');
    this.http
      .get<AdminUserRow[]>(API_ENDPOINTS.ADMIN_USERS)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (rows) => this.items.set(rows ?? []),
        error: () => this.error.set(this.i18n.t('users.loadError'))
      });
  }

  openCreate(): void {
    this.createForm.reset({ firstName: '', lastName: '', email: '', phone: '', password: '' });
    this.createError.set('');
    this.createOpen.set(true);
  }

  submitCreate(): void {
    if (this.createForm.invalid) return;
    this.creating.set(true);
    this.createError.set('');
    const v = this.createForm.getRawValue();
    this.http
      .post<AdminUserRow>(API_ENDPOINTS.ADMIN_USERS, {
        firstName: v.firstName.trim(),
        lastName: v.lastName.trim(),
        email: v.email.trim(),
        phone: v.phone.trim() || null,
        password: v.password
      })
      .pipe(finalize(() => this.creating.set(false)))
      .subscribe({
        next: (created) => {
          this.items.update((list) => [created, ...list]);
          this.createOpen.set(false);
          this.notifications.showSuccess(
            this.i18n.t('users.createdMsg'),
            this.i18n.t('users.createAdmin')
          );
        },
        error: (err) => {
          const msg = err?.error?.message || this.i18n.t('users.createError');
          this.createError.set(msg);
        }
      });
  }

  roleLabel(role: string): string {
    return role === 'Admin' ? this.i18n.t('users.roleAdmin') : this.i18n.t('users.roleCustomer');
  }

  formatDate(iso: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
    return d.toISOString().slice(0, 10);
  }

  initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'U';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
}
