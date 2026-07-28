"use client";

import { api } from "@/lib/api";

export type ArchivedProject = {
  id: string;
  type: "project";
  name: string;
  slug: string;
  archivedAt: string | null;
  updatedAt: string;
};

export type ArchivedBoard = {
  id: string;
  type: "board";
  name: string;
  projectId: string;
  projectName: string;
  projectArchived: boolean;
  updatedAt: string;
};

export type ArchivedColumn = {
  id: string;
  type: "column";
  name: string;
  boardId: string;
  boardName: string;
  boardArchived: boolean;
  projectId: string;
  projectName: string;
  projectArchived: boolean;
  tasksCount: number;
  updatedAt: string;
};

export type ArchivedItems = {
  projects: ArchivedProject[];
  boards: ArchivedBoard[];
  columns: ArchivedColumn[];
};

export async function fetchArchived(workspaceId: string) {
  const { data } = await api.get(`/workspaces/${workspaceId}/archived`);
  return data.data as ArchivedItems;
}

export async function restoreColumn(columnId: string) {
  const { data } = await api.post(`/columns/${columnId}/restore`);
  return data.data as {
    message: string;
    boardId: string;
    projectId: string;
  };
}

export async function restoreBoard(boardId: string) {
  const { data } = await api.post(`/boards/${boardId}/restore`);
  return data.data as { message: string; projectId: string };
}

export async function restoreProject(projectId: string) {
  await api.post(`/projects/${projectId}/restore`);
}
