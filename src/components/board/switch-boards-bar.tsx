"use client";

import { ChevronDown, Columns3, LayoutGrid } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { fetchBoards, type BoardSummary } from "@/lib/projects";
import { fetchProjects } from "@/lib/projects";
import { fetchMyWorkspaces, type WorkspaceSummary } from "@/lib/workspaces";
import { toastFromError } from "@/lib/toast";

type WorkspaceBoards = {
  workspace: WorkspaceSummary;
  boards: Array<BoardSummary & { projectName: string }>;
  open: boolean;
};

type Props = {
  currentBoardId: string;
  onSwitchBoard: (boardId: string) => void;
  disabled?: boolean;
};

export function SwitchBoardsBar({
  currentBoardId,
  onSwitchBoard,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<WorkspaceBoards[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (!open || groups.length) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { items: workspaces } = await fetchMyWorkspaces();
        const next: WorkspaceBoards[] = [];
        for (const ws of workspaces) {
          const { items: projects } = await fetchProjects(ws.id);
          const boards: Array<BoardSummary & { projectName: string }> = [];
          for (const project of projects) {
            const { items } = await fetchBoards(project.id);
            for (const b of items) {
              boards.push({ ...b, projectName: project.name });
            }
          }
          next.push({ workspace: ws, boards, open: true });
        }
        if (!cancelled) setGroups(next);
      } catch (error) {
        toastFromError(error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, groups.length]);

  function toggleWorkspace(id: string) {
    setGroups((prev) =>
      prev.map((g) =>
        g.workspace.id === id ? { ...g, open: !g.open } : g,
      ),
    );
  }

  return (
    <div className="relative flex justify-center pb-5 pt-1" ref={panelRef}>
      <div className="inline-flex items-center rounded-full border border-bb-border/80 bg-white px-1 py-1 shadow-bb">
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-bb-ink">
          <Columns3 className="h-4 w-4 text-bb-muted" aria-hidden />
          Board
        </span>
        <span className="mx-0.5 h-5 w-px bg-bb-border" aria-hidden />
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-bb-ink transition hover:bg-bb-sky disabled:opacity-50"
        >
          <LayoutGrid className="h-4 w-4 text-bb-muted" aria-hidden />
          Switch boards
        </button>
      </div>

      {open ? (
        <div className="absolute bottom-14 z-30 w-[min(100%,360px)] overflow-hidden rounded-xl border border-bb-border bg-white shadow-bb-lg">
          <div className="border-b border-bb-border px-4 py-3">
            <p className="text-sm font-bold text-bb-ink">Switch boards</p>
            <p className="text-xs text-bb-muted">
              Expand a workspace to pick a board
            </p>
          </div>
          <div className="max-h-80 overflow-y-auto p-2">
            {loading ? (
              <p className="px-3 py-6 text-center text-sm text-bb-muted">
                Loading workspaces...
              </p>
            ) : groups.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-bb-muted">
                No workspaces yet
              </p>
            ) : (
              groups.map((group) => (
                <div key={group.workspace.id} className="mb-1">
                  <button
                    type="button"
                    onClick={() => toggleWorkspace(group.workspace.id)}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-bold text-bb-ink hover:bg-bb-sky"
                  >
                    <span className="truncate">{group.workspace.name}</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-bb-muted transition ${
                        group.open ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {group.open ? (
                    <ul className="mb-2 ml-2 space-y-0.5 border-l border-bb-border pl-2">
                      {group.boards.length === 0 ? (
                        <li className="px-2 py-2 text-xs text-bb-muted">
                          No boards
                        </li>
                      ) : (
                        group.boards.map((board) => {
                          const active = board.id === currentBoardId;
                          return (
                            <li key={board.id}>
                              <button
                                type="button"
                                disabled={disabled || active}
                                onClick={() => {
                                  setOpen(false);
                                  onSwitchBoard(board.id);
                                }}
                                className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                                  active
                                    ? "bg-bb-sky font-semibold text-bb-blue"
                                    : "text-bb-ink hover:bg-bb-sky/60"
                                } disabled:cursor-default`}
                              >
                                <span className="block truncate">{board.name}</span>
                                <span className="block truncate text-[11px] text-bb-muted">
                                  {board.projectName}
                                </span>
                              </button>
                            </li>
                          );
                        })
                      )}
                    </ul>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
