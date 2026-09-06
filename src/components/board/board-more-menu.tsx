"use client";

import { Archive, Ellipsis, RotateCcw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  fetchArchivedTasks,
  restoreTask,
  type TaskCard,
} from "@/lib/tasks";
import { toastFromError, toastSuccess } from "@/lib/toast";

type Props = {
  boardId: string;
  onRestored: (task: TaskCard) => void;
};

export function BoardMoreMenu({ boardId, onRestored }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [items, setItems] = useState<TaskCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(event: MouseEvent) {
      const el = rootRef.current;
      if (!el) return;
      if (event.target instanceof Node && !el.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!archivedOpen) return;
    let cancelled = false;
    setLoading(true);
    void fetchArchivedTasks(boardId)
      .then((data) => {
        if (!cancelled) setItems(data.items);
      })
      .catch((error) => {
        if (!cancelled) toastFromError(error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [archivedOpen, boardId]);

  async function onRestore(task: TaskCard) {
    setBusyId(task.id);
    try {
      const restored = await restoreTask(task.id);
      setItems((prev) => prev.filter((item) => item.id !== task.id));
      onRestored(restored);
      toastSuccess("Card restored");
    } catch (error) {
      toastFromError(error);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <div className="relative" ref={rootRef}>
        <button
          type="button"
          aria-label="Board menu"
          title="More"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition ${
            menuOpen
              ? "border-bb-blue bg-bb-sky text-bb-blue"
              : "border-bb-border bg-white text-bb-ink hover:bg-bb-sky"
          }`}
        >
          <Ellipsis className="h-4 w-4" strokeWidth={2} aria-hidden />
        </button>

        {menuOpen ? (
          <div className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-xl border border-bb-border bg-white py-1 shadow-bb-lg">
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-bb-ink hover:bg-bb-sky"
              onClick={() => {
                setMenuOpen(false);
                setArchivedOpen(true);
              }}
            >
              <Archive className="h-4 w-4 text-bb-muted" aria-hidden />
              Archived
            </button>
          </div>
        ) : null}
      </div>

      {archivedOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-end p-3 sm:p-6">
          <button
            type="button"
            aria-label="Close archived"
            className="absolute inset-0 bg-black/35"
            onClick={() => setArchivedOpen(false)}
          />
          <div className="relative z-10 flex h-full max-h-[min(92vh,720px)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-bb-border bg-white shadow-bb-lg">
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-bb-border px-4 py-3">
              <div>
                <p className="text-sm font-bold text-bb-ink">Archived cards</p>
                <p className="text-xs text-bb-muted">Restore cards to this board</p>
              </div>
              <button
                type="button"
                onClick={() => setArchivedOpen(false)}
                className="rounded-lg p-1.5 text-bb-muted hover:bg-bb-sky"
                aria-label="Close"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              {loading ? (
                <p className="text-sm text-bb-muted">Loading…</p>
              ) : items.length === 0 ? (
                <p className="text-sm text-bb-muted">No archived cards.</p>
              ) : (
                <ul className="space-y-2">
                  {items.map((task) => (
                    <li
                      key={task.id}
                      className="flex items-center gap-2 rounded-xl border border-bb-border/70 bg-bb-canvas/60 px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-bb-ink">
                          {task.title}
                        </p>
                        <p className="text-[11px] font-semibold text-bb-muted">
                          {task.code}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={busyId === task.id}
                        onClick={() => void onRestore(task)}
                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-bb-border bg-white px-2 text-xs font-semibold text-bb-ink transition hover:bg-bb-sky disabled:opacity-60"
                      >
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                        {busyId === task.id ? "…" : "Restore"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
