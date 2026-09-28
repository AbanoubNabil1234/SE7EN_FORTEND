import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../infrastructure/http/api-endpoints.constants';
import {
  AdminRole,
  CreateRolePayload,
  PermissionGroup,
  UpdateRolePayload,
  UpdateUserRolePayload,
  UpdateUserStatusPayload
} from '../domain/models/role.model';

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private readonly http = inject(HttpClient);

  getRoles(): Observable<AdminRole[]> {
    return this.http.get<AdminRole[]>(API_ENDPOINTS.ADMIN_ROLES);
  }

  getPermissions(): Observable<PermissionGroup[]> {
    return this.http.get<PermissionGroup[]>(API_ENDPOINTS.ADMIN_PERMISSIONS);
  }

  createRole(payload: CreateRolePayload): Observable<AdminRole> {
    return this.http.post<AdminRole>(API_ENDPOINTS.ADMIN_ROLES, payload);
  }

  updateRole(roleName: string, payload: UpdateRolePayload): Observable<AdminRole> {
    return this.http.put<AdminRole>(API_ENDPOINTS.ADMIN_ROLE(roleName), payload);
  }

  deleteRole(roleName: string): Observable<void> {
    return this.http.delete<void>(API_ENDPOINTS.ADMIN_ROLE(roleName));
  }

  updateUserRole(userId: string, role: string): Observable<void> {
    const payload: UpdateUserRolePayload = { role };
    return this.http.put<void>(API_ENDPOINTS.ADMIN_USER_ROLE(userId), payload);
  }

  updateUserStatus(userId: string, isActive: boolean): Observable<void> {
    const payload: UpdateUserStatusPayload = { isActive };
    return this.http.put<void>(API_ENDPOINTS.ADMIN_USER_STATUS(userId), payload);
  }
}
