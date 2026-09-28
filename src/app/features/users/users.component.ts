import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { finalize } from 'rxjs';
import { I18nService } from '../../core/i18n/i18n.service';
import { LocaleService } from '../../core/services/locale.service';
import { NotificationService } from '../../core/services/notification.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { API_ENDPOINTS } from '../../core/infrastructure/http/api-endpoints.constants';
import { RoleService } from '../../core/services/role.service';
import { AdminRole, PermissionGroup } from '../../core/domain/models/role.model';
import { PermissionService } from '../../core/services/permission.service';

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
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './users.component.html',
  styleUrl: './users.component.css'
})
export class UsersComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);
  private readonly i18n = inject(I18nService);
  private readonly notifications = inject(NotificationService);
  private readonly roleService = inject(RoleService);
  private readonly permissionService = inject(PermissionService);
  readonly locale = inject(LocaleService);

  readonly canManageUsers = computed(() => this.permissionService.hasPermission('users.manage'));
  readonly canManageRoles = computed(() => this.permissionService.hasPermission('roles.manage'));

  readonly activeTab = signal<'users' | 'roles'>('users');

  // Users State
  readonly query = signal('');
  readonly roleFilter = signal<string>('all');
  readonly items = signal<AdminUserRow[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly createOpen = signal(false);
  readonly creating = signal(false);
  readonly createError = signal('');

  // Roles State
  readonly roles = signal<AdminRole[]>([]);
  readonly permissionGroups = signal<PermissionGroup[]>([]);
  readonly loadingRoles = signal(false);
  readonly rolesError = signal('');

  // Create/Edit Role Dialog
  readonly roleModalOpen = signal(false);
  readonly roleModalMode = signal<'create' | 'edit'>('create');
  readonly editingRole = signal<AdminRole | null>(null);
  readonly roleNameInput = signal('');
  readonly selectedPerms = signal<string[]>([]);
  readonly savingRole = signal(false);
  readonly roleModalError = signal('');

  // Delete Role Dialog
  readonly deleteConfirmRole = signal<AdminRole | null>(null);
  readonly deletingRole = signal(false);

  // Change User Role Dialog
  readonly changeRoleUser = signal<AdminUserRow | null>(null);
  readonly selectedNewRole = signal<string>('');
  readonly savingRoleChange = signal(false);

  readonly createForm = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    password: ['', [Validators.required, Validators.minLength(6)]],
    role: ['Admin', Validators.required]
  });

  readonly adminCount = computed(
    () => this.items().filter((u) => u.role === 'Admin').length
  );
  readonly customerCount = computed(
    () => this.items().filter((u) => u.role === 'Customer').length
  );
  readonly customStaffCount = computed(
    () => this.items().filter((u) => u.role !== 'Admin' && u.role !== 'Customer').length
  );
  readonly activeCount = computed(() => this.items().filter((u) => u.isActive).length);

  readonly availableStaffRoles = computed(() => {
    return this.roles().filter((r) => r.name !== 'Customer');
  });

  readonly roleTabs = computed(() => {
    this.locale.locale();
    const dynamicTabs = this.roles().map((r) => ({
      value: r.name,
      label: r.name === 'Admin' ? this.i18n.t('users.roleAdmin') : r.name === 'Customer' ? this.i18n.t('users.roleCustomer') : r.name
    }));

    return [
      { value: 'all', label: this.i18n.t('users.all') },
      ...dynamicTabs
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

  readonly allSystemPermKeys = computed(() => {
    const keys: string[] = [];
    for (const group of this.permissionGroups()) {
      for (const p of group.permissions) {
        keys.push(p.key);
      }
    }
    return keys;
  });

  ngOnInit(): void {
    this.reloadUsers();
    if (this.canManageRoles()) {
      this.reloadRoles();
    }
  }

  reloadUsers(): void {
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

  reloadRoles(): void {
    this.loadingRoles.set(true);
    this.rolesError.set('');

    this.roleService.getPermissions().subscribe({
      next: (groups) => this.permissionGroups.set(groups ?? []),
      error: () => this.rolesError.set(this.i18n.t('roles.loadError'))
    });

    this.roleService.getRoles()
      .pipe(finalize(() => this.loadingRoles.set(false)))
      .subscribe({
        next: (list) => this.roles.set(list ?? []),
        error: () => this.rolesError.set(this.i18n.t('roles.loadError'))
      });
  }

  openCreate(): void {
    this.createForm.reset({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      role: 'Admin'
    });
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
        password: v.password,
        role: v.role
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
          this.reloadRoles();
        },
        error: (err) => {
          const msg = err?.error?.message || this.i18n.t('users.createError');
          this.createError.set(msg);
        }
      });
  }

  openChangeRole(user: AdminUserRow): void {
    this.changeRoleUser.set(user);
    this.selectedNewRole.set(user.role);
  }

  submitChangeRole(): void {
    const user = this.changeRoleUser();
    const newRole = this.selectedNewRole();
    if (!user || !newRole || newRole === user.role) {
      this.changeRoleUser.set(null);
      return;
    }

    this.savingRoleChange.set(true);
    this.roleService.updateUserRole(user.id, newRole)
      .pipe(finalize(() => this.savingRoleChange.set(false)))
      .subscribe({
        next: () => {
          this.items.update((list) =>
            list.map((u) => (u.id === user.id ? { ...u, role: newRole } : u))
          );
          this.notifications.showSuccess(
            this.i18n.t('users.roleUpdated'),
            this.i18n.t('users.changeRoleTitle')
          );
          this.changeRoleUser.set(null);
          this.reloadRoles();
        },
        error: (err) => {
          this.notifications.showError(
            err?.error?.message || this.i18n.t('common.error'),
            this.i18n.t('users.changeRoleTitle')
          );
        }
      });
  }

  toggleUserStatus(user: AdminUserRow): void {
    const nextStatus = !user.isActive;
    this.roleService.updateUserStatus(user.id, nextStatus).subscribe({
      next: () => {
        this.items.update((list) =>
          list.map((u) => (u.id === user.id ? { ...u, isActive: nextStatus } : u))
        );
        this.notifications.showSuccess(
          this.i18n.t('users.statusUpdated'),
          this.i18n.t('users.toggleStatus')
        );
      },
      error: (err) => {
        this.notifications.showError(
          err?.error?.message || this.i18n.t('common.error'),
          this.i18n.t('users.toggleStatus')
        );
      }
    });
  }

  // Role Management Methods
  openCreateRole(): void {
    this.roleModalMode.set('create');
    this.editingRole.set(null);
    this.roleNameInput.set('');
    this.selectedPerms.set([]);
    this.roleModalError.set('');
    this.roleModalOpen.set(true);
  }

  openEditRole(role: AdminRole): void {
    this.roleModalMode.set('edit');
    this.editingRole.set(role);
    this.roleNameInput.set(role.name);
    this.selectedPerms.set([...role.permissions]);
    this.roleModalError.set('');
    this.roleModalOpen.set(true);
  }

  togglePerm(key: string): void {
    const current = this.selectedPerms();
    if (current.includes(key)) {
      this.selectedPerms.set(current.filter((k) => k !== key));
    } else {
      this.selectedPerms.set([...current, key]);
    }
  }

  hasPerm(key: string): boolean {
    return this.selectedPerms().includes(key);
  }

  toggleGroup(group: PermissionGroup): void {
    const groupKeys = group.permissions.map((p) => p.key);
    const current = this.selectedPerms();
    const allSelected = groupKeys.every((k) => current.includes(k));

    if (allSelected) {
      this.selectedPerms.set(current.filter((k) => !groupKeys.includes(k)));
    } else {
      const merged = new Set([...current, ...groupKeys]);
      this.selectedPerms.set(Array.from(merged));
    }
  }

  isGroupSelected(group: PermissionGroup): boolean {
    const groupKeys = group.permissions.map((p) => p.key);
    const current = this.selectedPerms();
    return groupKeys.length > 0 && groupKeys.every((k) => current.includes(k));
  }

  toggleAllPerms(): void {
    const allKeys = this.allSystemPermKeys();
    const current = this.selectedPerms();
    if (allKeys.length > 0 && allKeys.every((k) => current.includes(k))) {
      this.selectedPerms.set([]);
    } else {
      this.selectedPerms.set([...allKeys]);
    }
  }

  isAllPermsSelected(): boolean {
    const allKeys = this.allSystemPermKeys();
    const current = this.selectedPerms();
    return allKeys.length > 0 && allKeys.every((k) => current.includes(k));
  }

  submitRoleModal(): void {
    const name = this.roleNameInput().trim();
    if (!name) {
      this.roleModalError.set(this.i18n.t('roles.roleNamePlaceholder'));
      return;
    }

    this.savingRole.set(true);
    this.roleModalError.set('');

    const perms = this.selectedPerms();

    if (this.roleModalMode() === 'create') {
      this.roleService.createRole({ name, permissions: perms })
        .pipe(finalize(() => this.savingRole.set(false)))
        .subscribe({
          next: (created) => {
            this.roles.update((list) => [...list, created]);
            this.roleModalOpen.set(false);
            this.notifications.showSuccess(
              this.i18n.t('roles.createdSuccess'),
              this.i18n.t('roles.createRole')
            );
          },
          error: (err) => {
            this.roleModalError.set(err?.error?.message || this.i18n.t('common.error'));
          }
        });
    } else {
      const targetRole = this.editingRole();
      if (!targetRole) return;

      this.roleService.updateRole(targetRole.name, {
        newName: name !== targetRole.name ? name : null,
        permissions: perms
      })
        .pipe(finalize(() => this.savingRole.set(false)))
        .subscribe({
          next: (updated) => {
            this.roles.update((list) =>
              list.map((r) => (r.name === targetRole.name ? updated : r))
            );
            this.roleModalOpen.set(false);
            this.notifications.showSuccess(
              this.i18n.t('roles.updatedSuccess'),
              this.i18n.t('roles.editRole')
            );
          },
          error: (err) => {
            this.roleModalError.set(err?.error?.message || this.i18n.t('common.error'));
          }
        });
    }
  }

  openDeleteRoleConfirm(role: AdminRole): void {
    this.deleteConfirmRole.set(role);
  }

  confirmDeleteRole(): void {
    const role = this.deleteConfirmRole();
    if (!role) return;

    this.deletingRole.set(true);
    this.roleService.deleteRole(role.name)
      .pipe(finalize(() => this.deletingRole.set(false)))
      .subscribe({
        next: () => {
          this.roles.update((list) => list.filter((r) => r.name !== role.name));
          this.deleteConfirmRole.set(null);
          this.notifications.showSuccess(
            this.i18n.t('roles.deletedSuccess'),
            this.i18n.t('roles.deleteRole')
          );
        },
        error: (err) => {
          this.deleteConfirmRole.set(null);
          this.notifications.showError(
            err?.error?.message || this.i18n.t('roles.deleteError'),
            this.i18n.t('roles.deleteRole')
          );
        }
      });
  }

  roleLabel(role: string): string {
    if (role === 'Admin') return this.i18n.t('users.roleAdmin');
    if (role === 'Customer') return this.i18n.t('users.roleCustomer');
    return role;
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
