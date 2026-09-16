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
  template: `
    <section class="w-full space-y-4 px-4 py-4 sm:px-5 sm:py-5" [attr.dir]="locale.isRtl() ? 'rtl' : 'ltr'">
      <div class="overflow-hidden rounded-2xl border border-[#E8D5BE] bg-white shadow-sm">
        <div class="h-1.5 bg-[#C27938]"></div>
        <div class="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div class="min-w-0">
            <div class="inline-flex items-center gap-2 rounded-full bg-[#F8EEE2] px-3 py-1 text-[11px] font-bold text-[#C27938]">
              <span class="size-1.5 rounded-full bg-[#C27938]"></span>
              {{ 'users.badge' | t }}
            </div>
            <h1 class="mt-3 text-balance text-3xl font-extrabold text-[#181A1D] sm:text-4xl">
              {{ 'users.title' | t }}
            </h1>
            <p class="mt-1.5 max-w-xl text-pretty text-sm font-medium text-[#8A735C]">
              {{ 'users.subtitle' | t }}
            </p>
          </div>
          <button
            type="button"
            class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#C27938] px-4 text-sm font-bold text-white hover:bg-[#A8682F]"
            (click)="openCreate()"
          >
            <i class="pi pi-user-plus text-sm" aria-hidden="true"></i>
            {{ 'users.createAdmin' | t }}
          </button>
        </div>

        <div class="grid grid-cols-2 border-t border-[#EDE0D0] sm:grid-cols-4">
          <div class="border-e border-[#EDE0D0] px-4 py-3.5 sm:px-5">
            <div class="text-[11px] font-bold text-[#A68B6D]">{{ 'users.statTotal' | t }}</div>
            <div class="mt-1 text-2xl font-extrabold tabular-nums text-[#181A1D]">{{ items().length }}</div>
          </div>
          <div class="border-e border-[#EDE0D0] px-4 py-3.5 sm:px-5">
            <div class="text-[11px] font-bold text-[#A68B6D]">{{ 'users.statAdmins' | t }}</div>
            <div class="mt-1 text-2xl font-extrabold tabular-nums text-[#C27938]">{{ adminCount() }}</div>
          </div>
          <div class="border-e border-[#EDE0D0] px-4 py-3.5 sm:px-5">
            <div class="text-[11px] font-bold text-[#A68B6D]">{{ 'users.statCustomers' | t }}</div>
            <div class="mt-1 text-2xl font-extrabold tabular-nums text-[#181A1D]">{{ customerCount() }}</div>
          </div>
          <div class="px-4 py-3.5 sm:px-5">
            <div class="text-[11px] font-bold text-[#A68B6D]">{{ 'users.statActive' | t }}</div>
            <div class="mt-1 text-2xl font-extrabold tabular-nums text-[#181A1D]">{{ activeCount() }}</div>
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-3 rounded-2xl border border-[#E8D5BE] bg-white p-3 sm:flex-row sm:items-center sm:gap-3 sm:p-4">
        <label class="relative min-w-0 flex-1">
          <span class="sr-only">{{ 'users.search' | t }}</span>
          <i class="pi pi-search pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-[#A68B6D]" aria-hidden="true"></i>
          <input
            type="search"
            class="min-h-11 w-full rounded-xl border border-[#E8D5BE] bg-[#FBF8F4] pe-3 ps-10 text-sm font-medium text-[#181A1D] outline-none placeholder:text-[#A68B6D] focus:border-[#C27938] focus:bg-white"
            [placeholder]="'users.search' | t"
            [value]="query()"
            (input)="query.set(($any($event.target).value || '').toString())"
          />
        </label>

        <div class="flex gap-1 rounded-xl bg-[#F8EEE2] p-1" role="group" [attr.aria-label]="'users.roleGroup' | t">
          @for (opt of roleTabs(); track opt.value) {
            <button
              type="button"
              class="min-h-10 min-w-[5rem] flex-1 rounded-lg px-3 text-xs font-bold sm:flex-none"
              [ngClass]="
                roleFilter() === opt.value
                  ? 'bg-white text-[#181A1D] shadow-sm'
                  : 'bg-transparent text-[#8A735C] hover:text-[#181A1D]'
              "
              (click)="roleFilter.set(opt.value)"
            >
              {{ opt.label }}
            </button>
          }
        </div>
      </div>

      @if (loading()) {
        <div class="rounded-2xl border border-[#E8D5BE] bg-white p-8 text-center text-sm text-[#8A735C]">
          {{ 'users.loading' | t }}
        </div>
      } @else if (error()) {
        <div class="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">{{ error() }}</div>
      } @else {
        <div class="overflow-hidden rounded-2xl border border-[#E8D5BE] bg-white shadow-sm">
          <div class="overflow-x-auto">
            <table class="min-w-full text-start text-sm">
              <thead class="border-b border-[#EDE0D0] bg-[#FBF8F4] text-[11px] font-bold uppercase text-[#8A735C]">
                <tr>
                  <th class="px-4 py-3 text-start">{{ 'users.colName' | t }}</th>
                  <th class="px-4 py-3 text-start">{{ 'users.colEmail' | t }}</th>
                  <th class="px-4 py-3 text-start">{{ 'users.colPhone' | t }}</th>
                  <th class="px-4 py-3 text-start">{{ 'users.colRole' | t }}</th>
                  <th class="px-4 py-3 text-start">{{ 'users.colStatus' | t }}</th>
                  <th class="px-4 py-3 text-start">{{ 'users.colCreated' | t }}</th>
                </tr>
              </thead>
              <tbody>
                @for (user of filtered(); track user.id) {
                  <tr class="border-b border-[#EDE0D0] last:border-b-0 hover:bg-[#FBF8F4]">
                    <td class="px-4 py-3.5">
                      <div class="flex items-center gap-3">
                        <div
                          class="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-[#F8EEE2] text-xs font-extrabold text-[#C27938]"
                        >
                          {{ initials(user.fullName) }}
                        </div>
                        <span class="font-bold text-[#181A1D]">{{ user.fullName || '—' }}</span>
                      </div>
                    </td>
                    <td class="px-4 py-3.5 text-[#4A4038]">{{ user.email }}</td>
                    <td class="px-4 py-3.5 tabular-nums text-[#8A735C]">{{ user.phone || '—' }}</td>
                    <td class="px-4 py-3.5">
                      <span
                        class="inline-flex rounded-md px-2 py-1 text-[11px] font-bold"
                        [ngClass]="
                          user.role === 'Admin'
                            ? 'bg-[#F8EEE2] text-[#C27938]'
                            : 'bg-[#F3EDE5] text-[#8A735C]'
                        "
                      >
                        {{ roleLabel(user.role) }}
                      </span>
                    </td>
                    <td class="px-4 py-3.5">
                      @if (user.isActive) {
                        <span class="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                          <i class="pi pi-check-circle text-sm" aria-hidden="true"></i>
                          {{ 'users.active' | t }}
                        </span>
                      } @else {
                        <span class="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700">
                          <i class="pi pi-ban text-sm" aria-hidden="true"></i>
                          {{ 'users.blocked' | t }}
                        </span>
                      }
                    </td>
                    <td class="px-4 py-3.5 tabular-nums text-[#4A4038]">{{ formatDate(user.createdAt) }}</td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="6" class="px-4 py-12 text-center text-sm text-[#8A735C]">
                      {{ 'users.empty' | t }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </section>

    @if (createOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-[#181A1D]/50 p-4">
        <div
          class="w-full max-w-md rounded-2xl border border-[#E8D5BE] bg-white p-5 shadow-md sm:p-6"
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="'users.createAdmin' | t"
        >
          <h3 class="text-lg font-extrabold text-[#181A1D]">{{ 'users.createAdmin' | t }}</h3>
          <p class="mt-1 text-pretty text-sm text-[#8A735C]">{{ 'users.createHint' | t }}</p>

          <form class="mt-4 space-y-3" [formGroup]="createForm" (ngSubmit)="submitCreate()">
            <div class="grid gap-3 sm:grid-cols-2">
              <label class="block space-y-1.5">
                <span class="text-xs font-bold text-[#8A735C]">{{ 'users.firstName' | t }}</span>
                <input
                  type="text"
                  formControlName="firstName"
                  class="min-h-11 w-full rounded-xl border border-[#E8D5BE] bg-[#FBF8F4] px-3 text-sm outline-none focus:border-[#C27938] focus:bg-white"
                />
              </label>
              <label class="block space-y-1.5">
                <span class="text-xs font-bold text-[#8A735C]">{{ 'users.lastName' | t }}</span>
                <input
                  type="text"
                  formControlName="lastName"
                  class="min-h-11 w-full rounded-xl border border-[#E8D5BE] bg-[#FBF8F4] px-3 text-sm outline-none focus:border-[#C27938] focus:bg-white"
                />
              </label>
            </div>
            <label class="block space-y-1.5">
              <span class="text-xs font-bold text-[#8A735C]">{{ 'users.colEmail' | t }}</span>
              <input
                type="email"
                formControlName="email"
                class="min-h-11 w-full rounded-xl border border-[#E8D5BE] bg-[#FBF8F4] px-3 text-sm outline-none focus:border-[#C27938] focus:bg-white"
              />
            </label>
            <label class="block space-y-1.5">
              <span class="text-xs font-bold text-[#8A735C]">{{ 'users.colPhone' | t }}</span>
              <input
                type="tel"
                formControlName="phone"
                class="min-h-11 w-full rounded-xl border border-[#E8D5BE] bg-[#FBF8F4] px-3 text-sm outline-none focus:border-[#C27938] focus:bg-white"
              />
            </label>
            <label class="block space-y-1.5">
              <span class="text-xs font-bold text-[#8A735C]">{{ 'users.password' | t }}</span>
              <input
                type="password"
                formControlName="password"
                autocomplete="new-password"
                class="min-h-11 w-full rounded-xl border border-[#E8D5BE] bg-[#FBF8F4] px-3 text-sm outline-none focus:border-[#C27938] focus:bg-white"
              />
            </label>

            @if (createError()) {
              <p class="text-sm font-medium text-rose-700">{{ createError() }}</p>
            }

            <div class="flex justify-end gap-2 pt-2">
              <button
                type="button"
                class="min-h-11 rounded-xl px-4 text-sm font-bold text-[#6B5A48] hover:bg-[#F8EEE2]"
                (click)="createOpen.set(false)"
              >
                {{ 'common.cancel' | t }}
              </button>
              <button
                type="submit"
                class="min-h-11 rounded-xl bg-[#C27938] px-4 text-sm font-bold text-white hover:bg-[#A8682F] disabled:opacity-60"
                [disabled]="createForm.invalid || creating()"
              >
                {{ creating() ? ('users.creating' | t) : ('users.createSubmit' | t) }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `
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
