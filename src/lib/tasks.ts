"use client";

import { api } from "@/lib/api";

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";

export type TaskLabel = {
  id: string;
  name: string;
  color: string;
};

export type TaskAssignee = {
  workspaceMemberId: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl?: string | null;
  };
};

export type TaskCard = {
  id: string;
  taskId?: string;
  workspaceId?: string;
  projectId?: string;
  boardId?: string;
  columnId: string;
  code: string;
  title: string;
  description?: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  startDate?: string | null;
  dueDate?: string | null;
  isPinned?: boolean;
  isWatching?: boolean;
  watchersCount?: number;
  position: number;
  createdAt?: string;
  assignees: TaskAssignee[];
  labels: TaskLabel[];
  checklistProgress?: {
    completed: number;
    total: number;
    progress: number;
  } | null;
  commentsCount?: number;
  attachmentsCount?: number;
};

export type CalendarTasksResult = {
  items: TaskCard[];
  rangeStart: string;
  rangeEnd: string;
};

export async function createTask(input: {
  columnId: string;
  title: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: string | null;
  assigneeUserIds?: string[];
  labelIds?: string[];
}) {
  const { data } = await api.post("/tasks", input);
  return data.data as TaskCard;
}

export async function fetchTasks(params: {
  boardId?: string;
  columnId?: string;
  projectId?: string;
}) {
  const { data } = await api.get("/tasks", { params });
  return data.data as { items: TaskCard[]; total: number };
}

export async function fetchCalendarTasks(params: {
  workspaceId: string;
  rangeStart: string;
  rangeEnd: string;
  projectId?: string;
  boardId?: string;
  assigneeUserId?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
}) {
  const { data } = await api.get("/tasks/calendar", { params });
  return data.data as CalendarTasksResult;
}

export async function fetchTask(taskId: string) {
  const { data } = await api.get(`/tasks/${taskId}`);
  return data.data as TaskCard;
}

export async function updateTask(
  taskId: string,
  input: {
    title?: string;
    description?: string | null;
    priority?: TaskPriority;
    status?: TaskStatus;
    startDate?: string | null;
    dueDate?: string | null;
  },
) {
  const { data } = await api.patch(`/tasks/${taskId}`, input);
  return data.data as TaskCard;
}

export async function deleteTask(taskId: string) {
  await api.delete(`/tasks/${taskId}`);
}

export async function moveTask(
  taskId: string,
  input: {
    destinationColumnId: string;
    newPosition: number;
    sourceColumnId?: string;
  },
) {
  const { data } = await api.patch(`/tasks/${taskId}/move`, input);
  return data.data as TaskCard;
}

export async function fetchProjectLabels(projectId: string) {
  const { data } = await api.get("/tasks/labels", { params: { projectId } });
  return data.data as { items: TaskLabel[] };
}

export async function createProjectLabel(input: {
  projectId: string;
  name: string;
  color: string;
  taskId?: string;
}) {
  const { data } = await api.post("/tasks/labels", input);
  return data.data as { label: TaskLabel; task: TaskCard | null };
}

export async function deleteProjectLabel(labelId: string) {
  const { data } = await api.delete(`/tasks/labels/${labelId}`);
  return data.data as { id: string; projectId: string };
}

export async function addTaskLabel(taskId: string, labelId: string) {
  const { data } = await api.post(`/tasks/${taskId}/labels`, { labelId });
  return data.data as TaskCard;
}

export async function removeTaskLabel(taskId: string, labelId: string) {
  const { data } = await api.delete(`/tasks/${taskId}/labels/${labelId}`);
  return data.data as TaskCard;
}

export async function assignTask(taskId: string, userId: string) {
  const { data } = await api.post(`/tasks/${taskId}/assignees`, { userId });
  return data.data as TaskCard;
}

export async function unassignTask(taskId: string, userId: string) {
  const { data } = await api.delete(`/tasks/${taskId}/assignees`, {
    data: { userId },
  });
  return data.data as TaskCard;
}

export async function watchTask(taskId: string) {
  const { data } = await api.post(`/tasks/${taskId}/watchers`);
  return data.data as TaskCard;
}

export async function unwatchTask(taskId: string) {
  const { data } = await api.delete(`/tasks/${taskId}/watchers`);
  return data.data as TaskCard;
}

export async function pinTask(taskId: string, pinned: boolean) {
  const { data } = await api.patch(`/tasks/${taskId}/pin`, { pinned });
  return data.data as TaskCard;
}

export async function duplicateTask(
  taskId: string,
  destinationColumnId?: string,
) {
  const { data } = await api.post(`/tasks/${taskId}/duplicate`, {
    ...(destinationColumnId ? { destinationColumnId } : {}),
  });
  return data.data as TaskCard;
}
