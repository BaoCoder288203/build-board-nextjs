"use client";

import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { BoardCover } from "@/components/visual/board-cover";
import { Button, buttonClassName } from "@/components/ui/button";
import { Field } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { navigateWithCover } from "@/lib/route-cover";
import { toastFromError, toastSuccess } from "@/lib/toast";
import {
  createBoard,
  type BoardSummary,
  type ProjectSummary,
} from "@/lib/projects";
import {
  getProjectPageCache,
  prefetchBoardPage,
  prefetchProjectPage,
  prefetchWorkspacePage,
  useEntityCache,
} from "@/stores/entity-cache";

function ProjectDetailContent() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const projectId = params.projectId;

  const cached = useEntityCache((s) => s.projects[projectId]);
  const [project, setProject] = useState<ProjectSummary | null>(
    () => getProjectPageCache(projectId)?.project ?? null,
  );
  const [boards, setBoards] = useState<BoardSummary[]>(
    () => getProjectPageCache(projectId)?.boards ?? [],
  );
  const [loading, setLoading] = useState(
    () => !getProjectPageCache(projectId)?.project,
  );
  const [boardName, setBoardName] = useState("");
  const [creating, setCreating] = useState(false);
  const [boardModalOpen, setBoardModalOpen] = useState(false);

  const applyPage = useCallback(
    (page: { project: ProjectSummary; boards: BoardSummary[] }) => {
      setProject(page.project);
      setBoards(page.boards);
      useEntityCache.getState().putProjectPage(projectId, page);
    },
    [projectId],
  );

  const load = useCallback(async () => {
    const hasCache = Boolean(getProjectPageCache(projectId)?.project);
    if (!hasCache) setLoading(true);
    try {
      const page = await prefetchProjectPage(projectId);
      applyPage(page);
    } catch (error) {
      toastFromError(error);
      navigateWithCover(() => router.replace("/dashboard"));
    } finally {
      setLoading(false);
    }
  }, [projectId, router, applyPage]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!cached?.project) return;
    setProject(cached.project);
    setBoards(cached.boards);
    setLoading(false);
  }, [cached]);

  function closeBoardModal() {
    if (creating) return;
    setBoardModalOpen(false);
    setBoardName("");
  }

  async function onCreateBoard(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const board = await createBoard({ projectId, name: boardName });
      toastSuccess("Board created", board.name);
      setBoardName("");
      setBoardModalOpen(false);
      await load();
      useEntityCache.getState().seedBoardFromSummary(board, project);
      void prefetchBoardPage(board.id ?? board.boardId);
      navigateWithCover(() =>
        router.push(`/boards/${board.id ?? board.boardId}`),
      );
    } catch (error) {
      toastFromError(error);
    } finally {
      setCreating(false);
    }
  }

  const projectTheme = project
    ? {
        themeColorFrom: project.themeColorFrom ?? project.color,
        themeColorTo: project.themeColorTo ?? project.color,
      }
    : null;

  if (!project) {
    return (
      <AppShell theme={projectTheme}>
        <p className="text-sm text-bb-muted">Loading project...</p>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={project.name}
      subtitle={project.description || `/${project.slug}`}
      theme={projectTheme}
    >
      <div className="mb-6 flex flex-wrap gap-3">
        <Link
          href={`/workspaces/${project.workspaceId}`}
          onMouseEnter={() => {
            void prefetchWorkspacePage(project.workspaceId);
          }}
          className={buttonClassName({
            variant: "secondary",
            size: "sm",
            className: "px-2.5",
          })}
          aria-label="Back to workspace"
          title="Back to workspace"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2} aria-hidden />
        </Link>
        {project.defaultBoardId ? (
          <Link
            href={`/boards/${project.defaultBoardId}`}
            onMouseEnter={() => {
              void prefetchBoardPage(project.defaultBoardId!);
            }}
            className={buttonClassName({ variant: "primary", size: "sm" })}
          >
            Open main board
          </Link>
        ) : null}
      </div>

      <section className="rounded-[12px] border border-bb-border/80 bg-bb-surface p-5 shadow-bb">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-bb-ink">Boards</h2>
            <p className="mt-1 text-sm text-bb-muted">
              {boards.length} boards · {project.tasksCount ?? 0} tasks
            </p>
          </div>
          {project.canManage ||
          project.myRole === "OWNER" ||
          project.myRole === "PROJECT_MANAGER" ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setBoardModalOpen(true)}
              aria-label="New board"
              title="New board"
              className="px-2.5"
            >
              <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
            </Button>
          ) : null}
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {boards.map((board) => (
            <Link
              key={board.id}
              href={`/boards/${board.id}`}
              onMouseEnter={() => {
                useEntityCache
                  .getState()
                  .seedBoardFromSummary(board, project);
                void prefetchBoardPage(board.id);
              }}
              className="overflow-hidden rounded-[12px] border border-bb-border/70 transition hover:-translate-y-0.5 hover:shadow-bb"
            >
              <BoardCover
                coverUrl={board.coverUrl}
                alt={`${board.name} cover`}
                fallbackTheme={{
                  themeColorFrom: board.color ?? project.color,
                  themeColorTo: project.themeColorTo ?? project.color,
                }}
              />
              <div className="px-4 py-3">
                <p className="font-bold text-bb-ink">{board.name}</p>
                <p className="text-xs text-bb-muted">
                  {board.columnsCount ?? 0} columns · {board.tasksCount ?? 0}{" "}
                  tasks
                  {board.isDefault ? " · Default" : ""}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <Modal open={boardModalOpen} onClose={closeBoardModal} title="New board">
        <p className="mb-4 text-sm text-bb-muted">
          Creates a board with Todo / In Progress / Review / Done.
        </p>
        <form onSubmit={onCreateBoard}>
          <Field label="Name">
            <Input
              value={boardName}
              onChange={(e) => setBoardName(e.target.value)}
              required
              minLength={3}
              placeholder="Sprint board"
              autoFocus
            />
          </Field>
          <div className="mt-4 flex gap-2">
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={closeBoardModal}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button type="submit" fullWidth disabled={creating}>
              {creating ? "Creating..." : "Create board"}
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}

export default function ProjectPage() {
  return <ProjectDetailContent />;
}
