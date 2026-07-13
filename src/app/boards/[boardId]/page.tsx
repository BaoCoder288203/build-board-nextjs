"use client";

import {
  ArrowLeft,
  LogOut,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Protected } from "@/components/protected";
import { Button, buttonClassName } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toastFromError, toastSuccess } from "@/lib/toast";
import {
  createColumn,
  fetchBoard,
  type BoardDetail,
} from "@/lib/projects";
import { useAuthStore } from "@/stores/auth-store";

function BoardViewContent() {
  const params = useParams<{ boardId: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const boardId = params.boardId;

  const [board, setBoard] = useState<BoardDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [columnName, setColumnName] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchBoard(boardId);
      setBoard(data);
    } catch (error) {
      toastFromError(error);
      router.replace("/dashboard");
    } finally {
      setLoading(false);
    }
  }, [boardId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onAddColumn(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    try {
      await createColumn({ boardId, name: columnName });
      toastSuccess("Column added");
      setColumnName("");
      await load();
    } catch (error) {
      toastFromError(error);
    } finally {
      setAdding(false);
    }
  }

  async function onLogout() {
    await logout();
    router.replace("/");
  }

  if (loading || !board) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bb-canvas text-sm text-bb-muted">
        Loading board...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0079BF]">
      <header className="flex items-center justify-between gap-4 px-4 py-3 text-white">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href={`/projects/${board.projectId}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-sm font-semibold hover:bg-white/25"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2} aria-hidden />
            Project
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold">{board.name}</h1>
            <p className="truncate text-xs text-white/80">
              {board.project?.name ?? "Board"} · {board.columns.length} columns
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-sm sm:inline">{user?.fullName}</span>
          <Button
            variant="onDark"
            size="sm"
            onClick={onLogout}
            className="!text-bb-blue"
          >
            <LogOut className="h-4 w-4" strokeWidth={2} aria-hidden />
            Sign out
          </Button>
        </div>
      </header>

      <div className="flex flex-1 gap-3 overflow-x-auto px-4 pb-6">
        {board.columns.map((column) => (
          <section
            key={column.id}
            className="bb-animate-card flex w-72 shrink-0 flex-col rounded-xl bg-[#F1F2F4] shadow-bb"
          >
            <div className="flex items-center justify-between px-3 py-3">
              <h2 className="text-sm font-bold text-bb-ink">{column.name}</h2>
              <span className="rounded-md bg-black/5 px-2 py-0.5 text-xs font-semibold text-bb-muted">
                {column.tasksCount ?? 0}
              </span>
            </div>
            <div className="flex-1 space-y-2 px-2 pb-3">
              <div className="rounded-lg border border-dashed border-bb-border/80 bg-white/60 px-3 py-6 text-center text-xs text-bb-muted">
                Tasks arrive in Phase 5
              </div>
            </div>
          </section>
        ))}

        <form
          onSubmit={onAddColumn}
          className="flex h-fit w-72 shrink-0 flex-col gap-2 rounded-xl bg-white/20 p-3 backdrop-blur"
        >
          <Input
            value={columnName}
            onChange={(e) => setColumnName(e.target.value)}
            placeholder="Add another list"
            className="!bg-white"
            required
            minLength={2}
          />
          <button
            type="submit"
            disabled={adding}
            className={buttonClassName({ variant: "onDark", size: "sm" })}
          >
            <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
            {adding ? "Adding..." : "Add list"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function BoardPage() {
  return (
    <Protected>
      <BoardViewContent />
    </Protected>
  );
}
