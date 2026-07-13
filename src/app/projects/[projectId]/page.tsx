"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Protected } from "@/components/protected";
import { Button, buttonClassName } from "@/components/ui/button";
import { Field } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toastFromError, toastSuccess } from "@/lib/toast";
import {
  createBoard,
  fetchBoards,
  fetchProject,
  type BoardSummary,
  type ProjectSummary,
} from "@/lib/projects";

function ProjectDetailContent() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const projectId = params.projectId;

  const [project, setProject] = useState<ProjectSummary | null>(null);
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [boardName, setBoardName] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, b] = await Promise.all([
        fetchProject(projectId),
        fetchBoards(projectId),
      ]);
      setProject(p);
      setBoards(b.items);
    } catch (error) {
      toastFromError(error);
      router.replace("/dashboard");
    } finally {
      setLoading(false);
    }
  }, [projectId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreateBoard(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const board = await createBoard({ projectId, name: boardName });
      toastSuccess("Board created", board.name);
      setBoardName("");
      await load();
      router.push(`/boards/${board.id ?? board.boardId}`);
    } catch (error) {
      toastFromError(error);
    } finally {
      setCreating(false);
    }
  }

  if (loading || !project) {
    return (
      <AppShell>
        <p className="text-sm text-bb-muted">Loading project...</p>
      </AppShell>
    );
  }

  return (
    <AppShell title={project.name} subtitle={project.description || `/${project.slug}`}>
      <div className="mb-6 flex flex-wrap gap-3">
        <Link
          href={`/workspaces/${project.workspaceId}`}
          className={buttonClassName({ variant: "secondary", size: "sm" })}
        >
          Back to workspace
        </Link>
        {project.defaultBoardId ? (
          <Link
            href={`/boards/${project.defaultBoardId}`}
            className={buttonClassName({ variant: "primary", size: "sm" })}
          >
            Open main board
          </Link>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <section className="rounded-[12px] border border-bb-border/80 bg-bb-surface p-5 shadow-bb">
          <h2 className="text-lg font-bold text-bb-ink">Boards</h2>
          <p className="mt-1 text-sm text-bb-muted">
            {boards.length} boards · {project.tasksCount ?? 0} tasks
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {boards.map((board) => (
              <Link
                key={board.id}
                href={`/boards/${board.id}`}
                className="overflow-hidden rounded-[12px] border border-bb-border/70 transition hover:-translate-y-0.5 hover:shadow-bb"
              >
                <div
                  className="h-20"
                  style={{ background: board.color || project.color || "#0C66E4" }}
                />
                <div className="px-4 py-3">
                  <p className="font-bold text-bb-ink">{board.name}</p>
                  <p className="text-xs text-bb-muted">
                    {board.columnsCount ?? 0} columns · {board.tasksCount ?? 0} tasks
                    {board.isDefault ? " · Default" : ""}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {project.canManage ? (
          <form
            onSubmit={onCreateBoard}
            className="h-fit rounded-[12px] border border-bb-border/80 bg-bb-surface p-5 shadow-bb"
          >
            <h2 className="font-bold text-bb-ink">New board</h2>
            <p className="mt-1 text-sm text-bb-muted">
              Creates a board with Todo / In Progress / Review / Done.
            </p>
            <div className="mt-4">
              <Field label="Name">
                <Input
                  value={boardName}
                  onChange={(e) => setBoardName(e.target.value)}
                  required
                  minLength={3}
                  placeholder="Sprint board"
                />
              </Field>
              <Button type="submit" fullWidth disabled={creating}>
                {creating ? "Creating..." : "Create board"}
              </Button>
            </div>
          </form>
        ) : null}
      </div>
    </AppShell>
  );
}

export default function ProjectPage() {
  return (
    <Protected>
      <ProjectDetailContent />
    </Protected>
  );
}
