"use client";

import { api } from "@/lib/api";

export type ActivityActor = {
  id: string;
  fullName: string;
  email: string;
  username: string;
  avatar?: string | null;
};

export type ActivityItem = {
  id: string;
  workspaceId: string;
  projectId?: string | null;
  actorId: string;
  entityType: string;
  entityId: string;
  action: string;
  type: string;
  beforeData?: unknown;
  afterData?: unknown;
  metadata?: unknown;
  createdAt: string;
  actor: ActivityActor | null;
};

export type ActivityListResult = {
  items: ActivityItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type ActivitySearchFilters = {
  keyword?: string;
  entityType?: string;
  action?: string;
  actorId?: string;
  dateFrom?: string;
  dateTo?: string;
};

export async function fetchActivities(params: {
  workspaceId: string;
  projectId?: string;
  boardId?: string;
  taskId?: string;
  userId?: string;
  page?: number;
  limit?: number;
}) {
  const { data } = await api.get("/activities", { params });
  return data.data as ActivityListResult;
}

export async function fetchActivityTimeline(params: {
  workspaceId: string;
  page?: number;
  limit?: number;
}) {
  const { data } = await api.get("/activities/timeline", { params });
  return data.data as ActivityListResult;
}

export async function searchActivities(
  params: {
    workspaceId: string;
    page?: number;
    limit?: number;
  } & ActivitySearchFilters,
) {
  const { data } = await api.get("/activities/search", { params });
  return data.data as ActivityListResult;
}

export async function fetchActivity(activityId: string) {
  const { data } = await api.get(`/activities/${activityId}`);
  return data.data as ActivityItem;
}

const ACTION_LABELS: Record<string, string> = {
  CREATE: "created",
  UPDATE: "updated",
  DELETE: "deleted",
  RESTORE: "restored",
  MOVE: "moved",
  ASSIGN: "assigned",
  UNASSIGN: "unassigned",
  UPLOAD: "uploaded",
  DOWNLOAD: "downloaded",
  COMMENT: "commented",
  MENTION: "mentioned",
  COMPLETE: "completed",
  REOPEN: "reopened",
  LOGIN: "signed in",
  LOGOUT: "signed out",
  ARCHIVE: "archived",
};

const ENTITY_LABELS: Record<string, string> = {
  WORKSPACE: "workspace",
  PROJECT: "project",
  BOARD: "board",
  COLUMN: "column",
  TASK: "task",
  CHECKLIST: "checklist",
  CHECKLIST_ITEM: "checklist item",
  COMMENT: "comment",
  ATTACHMENT: "attachment",
  MEMBER: "member",
  USER: "account",
  ROLE: "role",
};

export function formatActivitySummary(item: ActivityItem): string {
  const actor = item.actor?.fullName ?? "Someone";
  const action = ACTION_LABELS[item.action] ?? item.action.toLowerCase();
  const entity = ENTITY_LABELS[item.entityType] ?? item.entityType.toLowerCase();

  const after = item.afterData as Record<string, unknown> | null;
  const title =
    typeof after?.title === "string"
      ? after.title
      : typeof after?.code === "string"
        ? after.code
        : typeof after?.name === "string"
          ? after.name
          : null;

  if (title) return `${actor} ${action} ${entity} “${title}”`;
  return `${actor} ${action} ${entity}`;
}

export function formatActivityTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatActivityDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
