"use client";

import { api } from "@/lib/api";

export type ProjectSummary = {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  visibility: string;
  boardsCount?: number;
  membersCount?: number;
  tasksCount?: number;
  defaultBoardId?: string | null;
  canManage?: boolean;
};

export type BoardSummary = {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  color: string | null;
  isDefault: boolean;
  columnsCount?: number;
  tasksCount?: number;
};

export type BoardColumn = {
  id: string;
  name: string;
  color: string | null;
  position: number;
  taskLimit: number | null;
  isDefault: boolean;
  isDone: boolean;
  tasksCount?: number;
};

export type BoardDetail = BoardSummary & {
  project?: { id: string; name: string; workspaceId: string };
  columns: BoardColumn[];
};

export async function fetchProjects(workspaceId: string) {
  const { data } = await api.get("/projects", { params: { workspaceId } });
  return data.data as { items: ProjectSummary[]; total: number };
}

export async function createProject(input: {
  workspaceId: string;
  name: string;
  slug?: string;
  description?: string;
  visibility?: "PRIVATE" | "WORKSPACE";
}) {
  const { data } = await api.post("/projects", input);
  return data.data as ProjectSummary & { projectId: string };
}

export async function fetchProject(projectId: string) {
  const { data } = await api.get(`/projects/${projectId}`);
  return data.data as ProjectSummary;
}

export async function fetchBoards(projectId: string) {
  const { data } = await api.get("/boards", { params: { projectId } });
  return data.data as { items: BoardSummary[]; total: number };
}

export async function createBoard(input: {
  projectId: string;
  name: string;
  description?: string;
  color?: string;
}) {
  const { data } = await api.post("/boards", input);
  return data.data as BoardSummary & { boardId: string };
}

export async function fetchBoard(boardId: string) {
  const { data } = await api.get(`/boards/${boardId}`);
  return data.data as BoardDetail;
}

export async function createColumn(input: {
  boardId: string;
  name: string;
  color?: string;
}) {
  const { data } = await api.post("/columns", input);
  return data.data as BoardColumn & { columnId: string };
}
