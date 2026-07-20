"use client";

import { api } from "@/lib/api";

export type AppNotification = {
  id: string;
  workspaceId: string;
  title: string;
  message: string;
  isRead: boolean;
  readAt?: string | null;
  notificationType: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
  sender?: {
    id: string;
    fullName: string;
    email: string;
    avatar?: string | null;
  } | null;
};

export type NotificationSettings = {
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  dueDateEnabled: boolean;
  mentionEnabled: boolean;
  assignmentEnabled: boolean;
  commentEnabled: boolean;
};

export async function fetchNotifications(params?: {
  page?: number;
  limit?: number;
  isRead?: boolean;
}) {
  const { data } = await api.get("/notifications", {
    params: {
      page: params?.page ?? 1,
      limit: params?.limit ?? 20,
      ...(params?.isRead === undefined
        ? {}
        : { isRead: String(params.isRead) }),
    },
  });
  return data.data as {
    items: AppNotification[];
    total: number;
    unreadCount: number;
    page: number;
    limit: number;
  };
}

export async function fetchUnreadCount() {
  const { data } = await api.get("/notifications/unread-count");
  return data.data as { unreadCount: number };
}

export async function markNotificationRead(notificationId: string) {
  const { data } = await api.patch(`/notifications/${notificationId}/read`);
  return data.data as AppNotification;
}

export async function markAllNotificationsRead() {
  const { data } = await api.patch("/notifications/read-all");
  return data.data as { updated: number };
}

export async function deleteNotification(notificationId: string) {
  await api.delete(`/notifications/${notificationId}`);
}

export async function fetchNotificationSettings() {
  const { data } = await api.get("/notifications/settings");
  return data.data as NotificationSettings;
}

export async function updateNotificationSettings(
  input: Partial<NotificationSettings>,
) {
  const { data } = await api.patch("/notifications/settings", input);
  return data.data as NotificationSettings;
}
