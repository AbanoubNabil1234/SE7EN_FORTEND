export interface AuditLogItem {
  id: string;
  timestampUtc: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  category: string;
  action: string;
  entityName: string;
  entityId: string | null;
  entityIdentifier: string | null;
  summary: string;
  hasDetails: boolean;
  hasChanges: boolean;
}

export interface AuditLogDetail {
  id: string;
  timestampUtc: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  category: string;
  action: string;
  entityName: string;
  entityId: string | null;
  entityIdentifier: string | null;
  summary: string;
  detailsJson: string | null;
  changesJson: string | null;
}

export interface AuditLogQuery {
  search?: string | null;
  category?: string | null;
  action?: string | null;
  userId?: string | null;
  fromDateUtc?: string | null;
  toDateUtc?: string | null;
  page: number;
  pageSize: number;
}

export interface AuditLogPagedResult {
  items: AuditLogItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AuditUserOption {
  id: string;
  name: string;
  email: string;
}

export interface AuditLogFilterOptions {
  categories: string[];
  actions: string[];
  users: AuditUserOption[];
}
