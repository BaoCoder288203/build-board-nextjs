"use client";

import { History } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ActivityFeed } from "@/components/activity/activity-feed";
import { connectRealtime } from "@/lib/realtime/socket-client";
import {
  SERVER_EVENT,
  type CommentDeletedPayload,
  type CommentRealtimePayload,
  type TaskCreatedPayload,
  type TaskDeletedPayload,
  type TaskMovedPayload,
  type TaskUpdatedPayload,
} from "@/lib/realtime/events";

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
  const [refreshToken, setRefreshToken] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const refreshTimerRef = useRef<number | null>(null);

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

  useEffect(() => {
    if (!open) return;
    const socket = connectRealtime();
    const onRealtimeChange = (
      payload:
        | TaskCreatedPayload
        | TaskUpdatedPayload
        | TaskMovedPayload
        | TaskDeletedPayload
        | CommentRealtimePayload
        | CommentDeletedPayload,
    ) => {
      if (boardId) {
        const payloadBoardId =
          "boardId" in payload ? payload.boardId : payload.task.boardId;
        if (payloadBoardId !== boardId) return;
      } else {
        const payloadWorkspaceId =
          "workspaceId" in payload ? payload.workspaceId : payload.task.workspaceId;
        if (payloadWorkspaceId !== workspaceId) return;
      }
      if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = window.setTimeout(() => {
        setRefreshToken((value) => value + 1);
      }, 250);
    };
    socket.on(SERVER_EVENT.BOARD_CHANGED, onRealtimeChange);
    socket.on(SERVER_EVENT.TASK_CREATED, onRealtimeChange);
    socket.on(SERVER_EVENT.TASK_UPDATED, onRealtimeChange);
    socket.on(SERVER_EVENT.TASK_MOVED, onRealtimeChange);
    socket.on(SERVER_EVENT.TASK_DELETED, onRealtimeChange);
    socket.on(SERVER_EVENT.COMMENT_CREATED, onRealtimeChange);
    socket.on(SERVER_EVENT.COMMENT_UPDATED, onRealtimeChange);
    socket.on(SERVER_EVENT.COMMENT_DELETED, onRealtimeChange);
    socket.on(SERVER_EVENT.COMMENT_REACTION, onRealtimeChange);
    return () => {
      if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
      socket.off(SERVER_EVENT.BOARD_CHANGED, onRealtimeChange);
      socket.off(SERVER_EVENT.TASK_CREATED, onRealtimeChange);
      socket.off(SERVER_EVENT.TASK_UPDATED, onRealtimeChange);
      socket.off(SERVER_EVENT.TASK_MOVED, onRealtimeChange);
      socket.off(SERVER_EVENT.TASK_DELETED, onRealtimeChange);
      socket.off(SERVER_EVENT.COMMENT_CREATED, onRealtimeChange);
      socket.off(SERVER_EVENT.COMMENT_UPDATED, onRealtimeChange);
      socket.off(SERVER_EVENT.COMMENT_DELETED, onRealtimeChange);
      socket.off(SERVER_EVENT.COMMENT_REACTION, onRealtimeChange);
    };
  }, [open, boardId, workspaceId]);

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
              refreshToken={refreshToken}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
