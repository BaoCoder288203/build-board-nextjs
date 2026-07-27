"use client";

import { api } from "@/lib/api";
import type { TaskPriority, TaskStatus } from "@/lib/tasks";

export type DashboardTaskItem = {
  id: string;
  taskId: string;
  code: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  boardId: string;
  projectId: string;
  workspaceId: string;
  updatedAt: string;
  projectName: string;
  projectSlug: string;
  boardName: string;
  isOverdue: boolean;
};

export type DashboardSummary = {
  workspace: {
    id: string;
    name: string;
    slug: string;
    membersCount: number;
    projectsCount: number;
    boardsCount: number;
    myMemberId: string;
  };
  tasks: {
    total: number;
    todo: number;
    inProgress: number;
    review: number;
    done: number;
    overdue: number;
    dueSoon: number;
  };
  projects: Array<{
    id: string;
    name: string;
    slug: string;
    updatedAt: string;
    boardsCount: number;
    tasksTotal: number;
    tasksDone: number;
  }>;
};

export type DashboardTaskList = {
  items: DashboardTaskItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  days?: number;
};

export async function fetchDashboardSummary(workspaceId: string) {
  const { data } = await api.get("/dashboard/summary", {
    params: { workspaceId },
  });
  return data.data as DashboardSummary;
}

export async function fetchMyTasks(params: {
  workspaceId: string;
  status?: TaskStatus;
  page?: number;
  limit?: number;
}) {
  const { data } = await api.get("/dashboard/my-tasks", { params });
  return data.data as DashboardTaskList;
}

export async function fetchUpcomingTasks(params: {
  workspaceId: string;
  days?: number;
  page?: number;
  limit?: number;
}) {
  const { data } = await api.get("/dashboard/upcoming", { params });
  return data.data as DashboardTaskList;
}
