"use client";

import { create } from "zustand";
import {
  fetchBoard,
  fetchBoards,
  fetchProject,
  fetchProjects,
  type BoardDetail,
  type BoardSummary,
  type ProjectSummary,
} from "@/lib/projects";
import {
  fetchMembers,
  fetchMyWorkspaces,
  fetchRoles,
  fetchWorkspace,
  type WorkspaceDetail,
  type WorkspaceMember,
  type WorkspaceRole,
  type WorkspaceSummary,
} from "@/lib/workspaces";
import type { ThemeColors } from "@/lib/visual-identity";

export type WorkspacePageCache = {
  workspace: WorkspaceDetail;
  members: WorkspaceMember[];
  roles: WorkspaceRole[];
  projects: ProjectSummary[];
};

export type ProjectPageCache = {
  project: ProjectSummary;
  boards: BoardSummary[];
};

export type BoardPageCache = {
  board: BoardDetail;
  projectBoards: BoardSummary[];
  workspaceTheme: ThemeColors | null;
};

type EntityCacheState = {
  workspaceList: WorkspaceSummary[] | null;
  workspaces: Record<string, WorkspacePageCache>;
  projects: Record<string, ProjectPageCache>;
  boards: Record<string, BoardPageCache>;

  setWorkspaceList: (items: WorkspaceSummary[]) => void;
  putWorkspacePage: (id: string, data: WorkspacePageCache) => void;
  putProjectPage: (id: string, data: ProjectPageCache) => void;
  putBoardPage: (id: string, data: BoardPageCache) => void;
  seedWorkspaceFromSummary: (ws: WorkspaceSummary) => void;
  seedProjectFromSummary: (project: ProjectSummary) => void;
  seedBoardFromSummary: (
    board: BoardSummary,
    project?: ProjectSummary | null,
  ) => void;
};

const inflight = new Map<string, Promise<unknown>>();

function once<T>(key: string, run: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;
  const p = run().finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, p);
  return p;
}

export const useEntityCache = create<EntityCacheState>((set, get) => ({
  workspaceList: null,
  workspaces: {},
  projects: {},
  boards: {},

  setWorkspaceList: (items) => {
    set({ workspaceList: items });
    for (const ws of items) {
      get().seedWorkspaceFromSummary(ws);
    }
  },

  putWorkspacePage: (id, data) =>
    set((s) => ({
      workspaces: { ...s.workspaces, [id]: data },
    })),

  putProjectPage: (id, data) =>
    set((s) => ({
      projects: { ...s.projects, [id]: data },
      // Keep workspace project list in sync when possible.
      workspaces: s.workspaces[data.project.workspaceId]
        ? {
            ...s.workspaces,
            [data.project.workspaceId]: {
              ...s.workspaces[data.project.workspaceId]!,
              projects: s.workspaces[
                data.project.workspaceId
              ]!.projects.map((p) =>
                p.id === id ? data.project : p,
              ),
            },
          }
        : s.workspaces,
    })),

  putBoardPage: (id, data) =>
    set((s) => ({
      boards: { ...s.boards, [id]: data },
    })),

  seedWorkspaceFromSummary: (ws) => {
    const prev = get().workspaces[ws.id];
    if (prev?.workspace.myMembership) return;
    set((s) => ({
      workspaces: {
        ...s.workspaces,
        [ws.id]: {
          workspace: (prev?.workspace ?? {
            ...ws,
          }) as WorkspaceDetail,
          members: prev?.members ?? [],
          roles: prev?.roles ?? [],
          projects: prev?.projects ?? [],
        },
      },
    }));
  },

  seedProjectFromSummary: (project) => {
    const prev = get().projects[project.id];
    if (prev) {
      set((s) => ({
        projects: {
          ...s.projects,
          [project.id]: { ...prev, project },
        },
      }));
      return;
    }
    set((s) => ({
      projects: {
        ...s.projects,
        [project.id]: { project, boards: [] },
      },
    }));
  },

  seedBoardFromSummary: (board, project) => {
    const prev = get().boards[board.id];
    if (prev?.board.columns?.length) return;
    const detail: BoardDetail = {
      ...(prev?.board ?? board),
      columns: prev?.board.columns ?? [],
      project: prev?.board.project ??
        (project
          ? {
              id: project.id,
              name: project.name,
              workspaceId: project.workspaceId,
            }
          : undefined),
    };
    set((s) => ({
      boards: {
        ...s.boards,
        [board.id]: {
          board: detail,
          projectBoards: prev?.projectBoards ?? [],
          workspaceTheme:
            prev?.workspaceTheme ??
            (project
              ? {
                  themeColorFrom: project.themeColorFrom ?? project.color,
                  themeColorTo: project.themeColorTo ?? project.color,
                }
              : null),
        },
      },
    }));
  },
}));

export function getWorkspacePageCache(id: string) {
  return useEntityCache.getState().workspaces[id] ?? null;
}

export function getProjectPageCache(id: string) {
  return useEntityCache.getState().projects[id] ?? null;
}

export function getBoardPageCache(id: string) {
  return useEntityCache.getState().boards[id] ?? null;
}

export async function prefetchWorkspaceList() {
  return once("workspace-list", async () => {
    const data = await fetchMyWorkspaces();
    useEntityCache.getState().setWorkspaceList(data.items);
    return data;
  });
}

export async function prefetchWorkspacePage(workspaceId: string) {
  return once(`workspace:${workspaceId}`, async () => {
    const [ws, mem, roleList, projectList] = await Promise.all([
      fetchWorkspace(workspaceId),
      fetchMembers(workspaceId),
      fetchRoles(workspaceId),
      fetchProjects(workspaceId),
    ]);
    const page: WorkspacePageCache = {
      workspace: ws,
      members: mem.items,
      roles: roleList,
      projects: projectList.items,
    };
    useEntityCache.getState().putWorkspacePage(workspaceId, page);
    for (const p of projectList.items) {
      useEntityCache.getState().seedProjectFromSummary(p);
    }
    return page;
  });
}

export async function prefetchProjectPage(projectId: string) {
  return once(`project:${projectId}`, async () => {
    const [project, boards] = await Promise.all([
      fetchProject(projectId),
      fetchBoards(projectId),
    ]);
    const page: ProjectPageCache = { project, boards: boards.items };
    useEntityCache.getState().putProjectPage(projectId, page);
    for (const b of boards.items) {
      useEntityCache.getState().seedBoardFromSummary(b, project);
    }
    // Warm workspace theme / shell for back-nav.
    void prefetchWorkspacePage(project.workspaceId).catch(() => {});
    return page;
  });
}

export async function prefetchBoardPage(boardId: string) {
  return once(`board:${boardId}`, async () => {
    const board = await fetchBoard(boardId);
    let projectBoards: BoardSummary[] = [];
    if (board.projectId) {
      const boards = await fetchBoards(board.projectId);
      projectBoards = boards.items;
    }
    let workspaceTheme: ThemeColors | null = null;
    const workspaceId = board.project?.workspaceId;
    if (workspaceId) {
      try {
        const cached = getWorkspacePageCache(workspaceId);
        if (cached?.workspace) {
          workspaceTheme = {
            themeColorFrom: cached.workspace.themeColorFrom,
            themeColorTo: cached.workspace.themeColorTo,
          };
        } else {
          const ws = await fetchWorkspace(workspaceId);
          workspaceTheme = {
            themeColorFrom: ws.themeColorFrom,
            themeColorTo: ws.themeColorTo,
          };
          useEntityCache.getState().seedWorkspaceFromSummary(ws);
        }
      } catch {
        workspaceTheme = null;
      }
    }
    const page: BoardPageCache = { board, projectBoards, workspaceTheme };
    useEntityCache.getState().putBoardPage(boardId, page);
    return page;
  });
}
