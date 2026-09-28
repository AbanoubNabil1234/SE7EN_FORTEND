export interface AdminNotificationItem {
  id: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  type: string;
  targetUserId: string | null;
  imageUrl: string | null;
  deepLink: string | null;
  createdBy: string | null;
  createdAtUtc: string;
}

export interface AdminNotificationPage {
  page: number;
  pageSize: number;
  totalCount: number;
  items: AdminNotificationItem[];
}

export interface BroadcastNotificationPayload {
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  type: string;
  deepLink?: string | null;
  imageUrl?: string | null;
  sendPush?: boolean;
}
