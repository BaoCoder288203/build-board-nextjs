"use client";

import { ArrowLeft, Filter, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ActivityFeed } from "@/components/activity/activity-feed";
import { AppShell } from "@/components/app-shell";
import { Button, buttonClassName } from "@/components/ui/button";
import { useRealtimeRoom } from "@/hooks/use-realtime-room";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import type { ActivitySearchFilters } from "@/lib/activities";
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
import {
  fetchMembers,
  fetchWorkspace,
  type WorkspaceDetail,
  type WorkspaceMember,
} from "@/lib/workspaces";

const ENTITY_OPTIONS = [
  "WORKSPACE",
  "PROJECT",
  "BOARD",
  "COLUMN",
  "TASK",
  "CHECKLIST",
  "CHECKLIST_ITEM",
  "COMMENT",
  "ATTACHMENT",
  "USER",
  "ROLE",
] as const;

const ACTION_OPTIONS = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "RESTORE",
  "MOVE",
  "ASSIGN",
  "UNASSIGN",
  "UPLOAD",
  "DOWNLOAD",
  "COMMENT",
  "MENTION",
  "COMPLETE",
  "REOPEN",
  "LOGIN",
  "LOGOUT",
  "ARCHIVE",
] as const;

const selectClassName =
  "h-11 w-full rounded-[10px] border border-bb-border bg-white px-3 text-sm text-bb-ink outline-none transition focus:border-bb-blue focus:ring-2 focus:ring-bb-blue/15";

function endOfLocalDay(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T23:59:59.999`);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function startOfLocalDay(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00.000`);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export default function WorkspaceActivityPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  useRealtimeRoom(workspaceRoom(workspaceId));
  const [workspace, setWorkspace] = useState<WorkspaceDetail | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loadingWorkspace, setLoadingWorkspace] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");
  const [actorId, setActorId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filters, setFilters] = useState<ActivitySearchFilters>({});
  const [refreshToken, setRefreshToken] = useState(0);
  const refreshTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadWorkspace() {
      setLoadingWorkspace(true);
      try {
        const [workspaceData, membersData] = await Promise.all([
          fetchWorkspace(workspaceId),
          fetchMembers(workspaceId),
        ]);
        if (cancelled) return;
        setWorkspace(workspaceData);
        setMembers(membersData.items);
      } catch (error) {
        if (!cancelled) toastFromError(error);
      } finally {
        if (!cancelled) setLoadingWorkspace(false);
      }
    }
    void loadWorkspace();
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  useEffect(() => {
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
      const payloadWorkspaceId =
        "workspaceId" in payload ? payload.workspaceId : payload.task.workspaceId;
      if (payloadWorkspaceId !== workspaceId) return;
      if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = window.setTimeout(() => {
        setRefreshToken((value) => value + 1);
      }, 300);
    };
    socket.on(SERVER_EVENT.WORKSPACE_CHANGED, onRealtimeChange);
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
      socket.off(SERVER_EVENT.WORKSPACE_CHANGED, onRealtimeChange);
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
  }, [workspaceId]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFilters({
      keyword: keyword.trim() || undefined,
      entityType: entityType || undefined,
      action: action || undefined,
      actorId: actorId || undefined,
      dateFrom: startOfLocalDay(dateFrom),
      dateTo: endOfLocalDay(dateTo),
    });
  }

  function resetFilters() {
    setKeyword("");
    setEntityType("");
    setAction("");
    setActorId("");
    setDateFrom("");
    setDateTo("");
    setFilters({});
  }

  const theme = workspace
    ? {
        themeColorFrom: workspace.themeColorFrom,
        themeColorTo: workspace.themeColorTo,
      }
    : null;

  return (
    <AppShell
      title={workspace ? `${workspace.name} activity` : "Workspace activity"}
      subtitle="Review and filter the complete history for this workspace."
      theme={theme}
    >
      <div className="mb-6">
        <Link
          href={`/workspaces/${workspaceId}`}
          className={buttonClassName({
            variant: "secondary",
            size: "sm",
          })}
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2} aria-hidden />
          Back to workspace
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="h-fit rounded-[12px] border border-bb-border/80 bg-bb-surface p-5 shadow-bb">
          <div className="mb-5">
            <h2 className="flex items-center gap-2 font-bold text-bb-ink">
              <Filter className="h-4 w-4" strokeWidth={2} aria-hidden />
              Filters
            </h2>
            <p className="mt-1 text-sm text-bb-muted">
              Narrow the timeline by actor, type, action, or date.
            </p>
          </div>

          <form onSubmit={applyFilters} className="space-y-4">
            <Field label="Actor name or email">
              <Input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="Search actor..."
                maxLength={100}
              />
            </Field>

            <Field label="Member">
              <select
                className={selectClassName}
                value={actorId}
                onChange={(event) => setActorId(event.target.value)}
                disabled={loadingWorkspace}
              >
                <option value="">All members</option>
                {members.map((member) => (
                  <option key={member.user.id} value={member.user.id}>
                    {member.user.fullName}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Entity">
              <select
                className={selectClassName}
                value={entityType}
                onChange={(event) => setEntityType(event.target.value)}
              >
                <option value="">All entities</option>
                {ENTITY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Action">
              <select
                className={selectClassName}
                value={action}
                onChange={(event) => setAction(event.target.value)}
              >
                <option value="">All actions</option>
                {ACTION_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="From">
                <Input
                  type="date"
                  value={dateFrom}
                  max={dateTo || undefined}
                  onChange={(event) => setDateFrom(event.target.value)}
                />
              </Field>
              <Field label="To">
                <Input
                  type="date"
                  value={dateTo}
                  min={dateFrom || undefined}
                  onChange={(event) => setDateTo(event.target.value)}
                />
              </Field>
            </div>

            <div className="flex gap-2 pt-1">
              <Button type="submit" size="sm" className="flex-1">
                Apply
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                aria-label="Reset filters"
                title="Reset filters"
              >
                <RotateCcw className="h-4 w-4" strokeWidth={2} aria-hidden />
              </Button>
            </div>
          </form>
        </aside>

        <section className="min-w-0 rounded-[12px] border border-bb-border/80 bg-bb-surface p-5 shadow-bb">
          <div className="mb-5 border-b border-bb-border pb-4">
            <h2 className="text-lg font-bold text-bb-ink">Full timeline</h2>
            <p className="mt-1 text-sm text-bb-muted">
              Newest workspace events appear first.
            </p>
          </div>
          <ActivityFeed
            workspaceId={workspaceId}
            mode="timeline"
            limit={30}
            filters={filters}
            showLoadMore
            showAbsoluteTime
            refreshToken={refreshToken}
          />
        </section>
      </div>
    </AppShell>
  );
}
