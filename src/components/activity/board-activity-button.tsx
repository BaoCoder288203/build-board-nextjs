"use client";

import { History } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ActivityFeed } from "@/components/activity/activity-feed";

type Props = {
  workspaceId: string;
  boardId?: string;
  projectId?: string;
};

export function BoardActivityButton({
  workspaceId,
  boardId,
  projectId,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      const el = rootRef.current;
      if (!el) return;
      if (event.target instanceof Node && !el.contains(event.target)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-label="Board activity"
        title="Activity"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition ${
          open
            ? "border-bb-blue bg-bb-sky text-bb-blue"
            : "border-bb-border bg-white text-bb-ink hover:bg-bb-sky"
        }`}
      >
        <History className="h-4 w-4" strokeWidth={2} aria-hidden />
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-1 w-[min(100vw-2rem,380px)] overflow-hidden rounded-xl border border-bb-border bg-white shadow-bb-lg">
          <div className="border-b border-bb-border px-4 py-3">
            <p className="text-sm font-bold text-bb-ink">Activity</p>
            <p className="text-xs text-bb-muted">Recent board history</p>
          </div>
          <div className="max-h-96 overflow-y-auto px-4 py-3">
            <ActivityFeed
              workspaceId={workspaceId}
              boardId={boardId}
              projectId={projectId}
              limit={25}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
