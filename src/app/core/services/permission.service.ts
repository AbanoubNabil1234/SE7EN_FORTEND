import { inject, Injectable, signal } from '@angular/core';
import { AuthRepository } from '../domain/repositories/auth.repository';

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  private readonly auth = inject(AuthRepository);

  readonly permissions = signal<string[]>([]);
  readonly currentRole = signal<string>('');

  constructor() {
    this.auth.getCurrentUser().subscribe((user) => {
      if (user) {
        this.currentRole.set(user.role || '');
        this.permissions.set(user.permissions || []);
      } else {
        this.currentRole.set('');
        this.permissions.set([]);
      }
    });
  }

  hasPermission(permission?: string | null): boolean {
    if (!permission) return true;
    const role = this.currentRole().toLowerCase();
    if (role === 'admin') return true;

    const list = this.permissions();
    if (list.includes('*')) return true;

    return list.includes(permission);
  }

  hasAnyPermission(perms: string[]): boolean {
    if (!perms.length) return true;
    return perms.some((p) => this.hasPermission(p));
  }

  hasAllPermissions(perms: string[]): boolean {
    if (!perms.length) return true;
    return perms.every((p) => this.hasPermission(p));
  }
}
