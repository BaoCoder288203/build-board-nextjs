"use client";

import {
  Archive,
  ArrowLeft,
  Columns3,
  FolderKanban,
  LayoutGrid,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button, buttonClassName } from "@/components/ui/button";
import {
  fetchArchived,
  restoreBoard,
  restoreColumn,
  restoreProject,
  type ArchivedBoard,
  type ArchivedColumn,
  type ArchivedItems,
  type ArchivedProject,
} from "@/lib/archived";
import { toastError, toastFromError, toastSuccess } from "@/lib/toast";
import {
  fetchWorkspace,
  type WorkspaceDetail,
} from "@/lib/workspaces";
import type { ThemeColors } from "@/lib/visual-identity";
import { prefetchBoardPage, prefetchWorkspacePage } from "@/stores/entity-cache";

function formatWhen(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function WorkspaceArchivedContent() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params.workspaceId;

  const [workspace, setWorkspace] = useState<WorkspaceDetail | null>(null);
  const [items, setItems] = useState<ArchivedItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ws, archived] = await Promise.all([
        fetchWorkspace(workspaceId),
        fetchArchived(workspaceId),
      ]);
      setWorkspace(ws);
      setItems(archived);
    } catch (error) {
      toastFromError(error);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onRestoreProject(p: ArchivedProject) {
    setBusyId(p.id);
    try {
      await restoreProject(p.id);
      toastSuccess(`Restored project “${p.name}”`);
      void prefetchWorkspacePage(workspaceId);
      await load();
    } catch (error) {
      toastFromError(error);
    } finally {
      setBusyId(null);
    }
  }

  async function onRestoreBoard(b: ArchivedBoard) {
    if (b.projectArchived) {
      toastError("Restore the project first, then restore this board.");
      return;
    }
    setBusyId(b.id);
    try {
      await restoreBoard(b.id);
      toastSuccess(`Restored board “${b.name}”`);
      void prefetchBoardPage(b.id);
      await load();
    } catch (error) {
      toastFromError(error);
    } finally {
      setBusyId(null);
    }
  }

  async function onRestoreColumn(c: ArchivedColumn) {
    if (c.projectArchived || c.boardArchived) {
      toastError(
        c.projectArchived
          ? "Restore the project (and board) first."
          : "Restore the board first, then restore this list.",
      );
      return;
    }
    setBusyId(c.id);
    try {
      const result = await restoreColumn(c.id);
      toastSuccess(
        `Restored list “${c.name}”${c.tasksCount ? ` (${c.tasksCount} cards)` : ""}`,
      );
      void prefetchBoardPage(result.boardId);
      await load();
    } catch (error) {
      toastFromError(error);
    } finally {
      setBusyId(null);
    }
  }

  const theme: ThemeColors | null = workspace
    ? {
        themeColorFrom: workspace.themeColorFrom,
        themeColorTo: workspace.themeColorTo,
      }
    : null;

  const total =
    (items?.projects.length ?? 0) +
    (items?.boards.length ?? 0) +
    (items?.columns.length ?? 0);

  return (
    <AppShell
      title="Archived items"
      subtitle={
        workspace
          ? `Restore archived projects, boards, and lists in ${workspace.name}`
          : "Restore archived items"
      }
      theme={theme}
    >
      <div className="mb-6 flex flex-wrap gap-3">
        <Link
          href={`/workspaces/${workspaceId}`}
          className={buttonClassName({
            variant: "secondary",
            size: "sm",
            className: "px-2.5",
          })}
          aria-label="Back to workspace"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2} aria-hidden />
        </Link>
      </div>

      {loading && !items ? (
        <p className="text-sm text-bb-muted">Loading archived items…</p>
      ) : total === 0 ? (
        <div className="rounded-[12px] border border-dashed border-bb-border bg-bb-sky/40 px-6 py-16 text-center">
          <Archive
            className="mx-auto h-8 w-8 text-bb-muted"
            strokeWidth={1.5}
            aria-hidden
          />
          <h2 className="mt-3 text-lg font-bold text-bb-ink">
            Nothing archived
          </h2>
          <p className="mt-2 text-sm text-bb-muted">
            Archived projects, boards, and lists will show up here.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          <section>
            <div className="mb-3 flex items-center gap-2">
              <FolderKanban
                className="h-4 w-4 text-bb-blue"
                strokeWidth={2}
                aria-hidden
              />
              <h2 className="text-lg font-bold text-bb-ink">
                Projects ({items?.projects.length ?? 0})
              </h2>
            </div>
            {(items?.projects.length ?? 0) === 0 ? (
              <p className="text-sm text-bb-muted">No archived projects.</p>
            ) : (
              <ul className="divide-y divide-bb-border/60 overflow-hidden rounded-[12px] border border-bb-border/80 bg-bb-surface shadow-bb">
                {items!.projects.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-bb-ink">
                        {p.name}
                      </p>
                      <p className="text-xs text-bb-muted">
                        Archived {formatWhen(p.archivedAt)}
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={busyId === p.id}
                      onClick={() => void onRestoreProject(p)}
                    >
                      <RotateCcw
                        className="h-4 w-4"
                        strokeWidth={2}
                        aria-hidden
                      />
                      Restore
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2">
              <LayoutGrid
                className="h-4 w-4 text-bb-blue"
                strokeWidth={2}
                aria-hidden
              />
              <h2 className="text-lg font-bold text-bb-ink">
                Boards ({items?.boards.length ?? 0})
              </h2>
            </div>
            {(items?.boards.length ?? 0) === 0 ? (
              <p className="text-sm text-bb-muted">No archived boards.</p>
            ) : (
              <ul className="divide-y divide-bb-border/60 overflow-hidden rounded-[12px] border border-bb-border/80 bg-bb-surface shadow-bb">
                {items!.boards.map((b) => (
                  <li
                    key={b.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-bb-ink">
                        {b.name}
                      </p>
                      <p className="text-xs text-bb-muted">
                        {b.projectName}
                        {b.projectArchived ? " · project archived" : ""} ·{" "}
                        {formatWhen(b.updatedAt)}
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={busyId === b.id || b.projectArchived}
                      title={
                        b.projectArchived
                          ? "Restore the project first"
                          : "Restore board"
                      }
                      onClick={() => void onRestoreBoard(b)}
                    >
                      <RotateCcw
                        className="h-4 w-4"
                        strokeWidth={2}
                        aria-hidden
                      />
                      Restore
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2">
              <Columns3
                className="h-4 w-4 text-bb-blue"
                strokeWidth={2}
                aria-hidden
              />
              <h2 className="text-lg font-bold text-bb-ink">
                Lists ({items?.columns.length ?? 0})
              </h2>
            </div>
            <p className="mb-3 text-xs text-bb-muted">
              Restoring a list brings its cards back onto the board.
            </p>
            {(items?.columns.length ?? 0) === 0 ? (
              <p className="text-sm text-bb-muted">No archived lists.</p>
            ) : (
              <ul className="divide-y divide-bb-border/60 overflow-hidden rounded-[12px] border border-bb-border/80 bg-bb-surface shadow-bb">
                {items!.columns.map((c) => {
                  const blocked = c.projectArchived || c.boardArchived;
                  return (
                    <li
                      key={c.id}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-bb-ink">
                          {c.name}
                        </p>
                        <p className="text-xs text-bb-muted">
                          {c.projectName} · {c.boardName} · {c.tasksCount} cards
                          {c.boardArchived ? " · board archived" : ""}
                          {c.projectArchived ? " · project archived" : ""}
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={busyId === c.id || blocked}
                        title={
                          blocked
                            ? "Restore parent project/board first"
                            : "Restore list"
                        }
                        onClick={() => void onRestoreColumn(c)}
                      >
                        <RotateCcw
                          className="h-4 w-4"
                          strokeWidth={2}
                          aria-hidden
                        />
                        Restore
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      )}
    </AppShell>
  );
}

export default function WorkspaceArchivedPage() {
  return <WorkspaceArchivedContent />;
}
