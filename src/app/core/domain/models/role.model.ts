export interface PermissionItem {
  key: string;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
}

export interface PermissionGroup {
  groupKey: string;
  nameAr: string;
  nameEn: string;
  permissions: PermissionItem[];
}

export interface AdminRole {
  name: string;
  isSystemRole: boolean;
  userCount: number;
  permissions: string[];
}

export interface CreateRolePayload {
  name: string;
  permissions: string[];
}

export interface UpdateRolePayload {
  newName?: string | null;
  permissions: string[];
}

export interface UpdateUserRolePayload {
  role: string;
}

export interface UpdateUserStatusPayload {
  isActive: boolean;
}
