"use client";

import { ArrowLeft, CalendarDays, Clock3 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityFeed } from "@/components/activity/activity-feed";
import { AppShell } from "@/components/app-shell";
import { buttonClassName } from "@/components/ui/button";
import { useRealtimeRoom } from "@/hooks/use-realtime-room";
import { connectRealtime } from "@/lib/realtime/socket-client";
import {
  SERVER_EVENT,
  workspaceRoom,
  type CommentDeletedPayload,
  type CommentRealtimePayload,
  type TaskCreatedPayload,
  type TaskDeletedPayload,
  type TaskMovedPayload,
  type TaskUpdatedPayload,
} from "@/lib/realtime/events";
import { toastFromError } from "@/lib/toast";
import { fetchWorkspace, type WorkspaceDetail } from "@/lib/workspaces";

export default function WorkspaceTimelinePage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  useRealtimeRoom(workspaceRoom(workspaceId));

  const [workspace, setWorkspace] = useState<WorkspaceDetail | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchWorkspace(workspaceId);
        if (!cancelled) setWorkspace(data);
      } catch (error) {
        if (!cancelled) toastFromError(error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  const triggerRefresh = useCallback(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      setRefreshToken((v) => v + 1);
    }, 350);
  }, []);

  useEffect(() => {
    const socket = connectRealtime();
    const onTaskChanged = (
      payload: TaskCreatedPayload | TaskUpdatedPayload | TaskMovedPayload | TaskDeletedPayload,
    ) => {
      const payloadWorkspaceId =
        "workspaceId" in payload ? payload.workspaceId : payload.task.workspaceId;
      if (payloadWorkspaceId !== workspaceId) return;
      triggerRefresh();
    };
    const onCommentChanged = (
      payload: CommentRealtimePayload | CommentDeletedPayload,
    ) => {
      if (payload.workspaceId !== workspaceId) return;
      triggerRefresh();
    };
    socket.on(SERVER_EVENT.TASK_CREATED, onTaskChanged);
    socket.on(SERVER_EVENT.TASK_UPDATED, onTaskChanged);
    socket.on(SERVER_EVENT.TASK_MOVED, onTaskChanged);
    socket.on(SERVER_EVENT.TASK_DELETED, onTaskChanged);
    socket.on(SERVER_EVENT.COMMENT_CREATED, onCommentChanged);
    socket.on(SERVER_EVENT.COMMENT_UPDATED, onCommentChanged);
    socket.on(SERVER_EVENT.COMMENT_DELETED, onCommentChanged);
    socket.on(SERVER_EVENT.COMMENT_REACTION, onCommentChanged);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      socket.off(SERVER_EVENT.TASK_CREATED, onTaskChanged);
      socket.off(SERVER_EVENT.TASK_UPDATED, onTaskChanged);
      socket.off(SERVER_EVENT.TASK_MOVED, onTaskChanged);
      socket.off(SERVER_EVENT.TASK_DELETED, onTaskChanged);
      socket.off(SERVER_EVENT.COMMENT_CREATED, onCommentChanged);
      socket.off(SERVER_EVENT.COMMENT_UPDATED, onCommentChanged);
      socket.off(SERVER_EVENT.COMMENT_DELETED, onCommentChanged);
      socket.off(SERVER_EVENT.COMMENT_REACTION, onCommentChanged);
    };
  }, [workspaceId, triggerRefresh]);

  return (
    <AppShell
      title="Timeline"
      subtitle={workspace ? `${workspace.name} live activity timeline` : "Live activity timeline"}
      theme={
        workspace
          ? {
              themeColorFrom: workspace.themeColorFrom,
              themeColorTo: workspace.themeColorTo,
            }
          : null
      }
    >
      <div className="mb-6 flex flex-wrap gap-2">
        <Link
          href={`/workspaces/${workspaceId}`}
          className={buttonClassName({ variant: "secondary", size: "sm" })}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back
        </Link>
        <Link
          href={`/workspaces/${workspaceId}/calendar`}
          className={buttonClassName({ variant: "ghost", size: "sm" })}
        >
          <CalendarDays className="h-4 w-4" aria-hidden />
          Calendar
        </Link>
      </div>

      <section className="rounded-[12px] border border-bb-border/80 bg-bb-surface p-5 shadow-bb">
        <div className="mb-5 border-b border-bb-border pb-3">
          <h2 className="flex items-center gap-2 text-lg font-bold text-bb-ink">
            <Clock3 className="h-4 w-4 text-bb-blue" aria-hidden />
            Workspace timeline
          </h2>
          <p className="mt-1 text-sm text-bb-muted">
            Auto-refreshes on realtime task and comment events.
          </p>
        </div>
        <ActivityFeed
          workspaceId={workspaceId}
          mode="timeline"
          limit={40}
          showLoadMore
          showAbsoluteTime
          refreshToken={refreshToken}
        />
      </section>
    </AppShell>
  );
}

