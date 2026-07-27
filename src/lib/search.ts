"use client";

import { api } from "@/lib/api";
import type { TaskPriority, TaskStatus } from "@/lib/tasks";

export type SearchProjectHit = {
  id: string;
  type: "project";
  name: string;
  slug: string;
  workspaceId: string;
  workspaceName: string;
  color?: string | null;
  updatedAt: string;
};

export type SearchBoardHit = {
  id: string;
  type: "board";
  name: string;
  projectId: string;
  projectName: string;
  workspaceId: string;
  workspaceName: string;
  updatedAt: string;
};

export type SearchTaskHit = {
  id: string;
  type: "task";
  code: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  boardId: string;
  boardName: string;
  projectId: string;
  projectName: string;
  workspaceId: string;
  workspaceName?: string;
  updatedAt: string;
  createdAt?: string;
};

export type SearchCommentHit = {
  id: string;
  type: "comment";
  content: string;
  taskId: string;
  taskTitle: string;
  taskCode: string;
  boardId: string;
  projectId: string;
  workspaceId: string;
  createdAt: string;
  author: {
    id: string;
    fullName: string;
    avatar?: string | null;
  };
};

export type SearchMemberHit = {
  id: string;
  type: "member";
  workspaceMemberId: string;
  workspaceId: string;
  workspaceName: string;
  roleName: string;
  joinedAt: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    username: string;
    avatar?: string | null;
  };
};

export type GlobalSearchResult = {
  projects: SearchProjectHit[];
  boards: SearchBoardHit[];
  tasks: SearchTaskHit[];
  comments: SearchCommentHit[];
  members: SearchMemberHit[];
};

export async function globalSearch(params: {
  keyword: string;
  workspaceId?: string;
  limit?: number;
}) {
  const { data } = await api.get("/search", { params });
  return data.data as GlobalSearchResult;
}

export async function searchTasks(params: {
  workspaceId: string;
  keyword?: string;
  projectId?: string;
  boardId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  sortBy?: "updatedAt" | "dueDate" | "title" | "createdAt";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}) {
  const { data } = await api.get("/search/tasks", { params });
  return data.data as {
    items: SearchTaskHit[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
