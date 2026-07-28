"use client";

import {
  ArrowLeft,
  CalendarClock,
  CheckSquare,
  Clock3,
  LayoutDashboard,
  ListTodo,
} from "lucide-react";
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
import {
  fetchDashboardSummary,
  fetchMyTasks,
  fetchUpcomingTasks,
  type DashboardSummary,
  type DashboardTaskItem,
} from "@/lib/dashboard";
import { toastFromError } from "@/lib/toast";
import {
  fetchWorkspace,
  type WorkspaceDetail,
} from "@/lib/workspaces";
import type { ThemeColors } from "@/lib/visual-identity";

const STATUS_LABEL: Record<string, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  REVIEW: "Review",
  DONE: "Done",
};

function formatDue(dueDate: string | null) {
  if (!dueDate) return "No due date";
  const d = new Date(dueDate);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function TaskRow({ task }: { task: DashboardTaskItem }) {
  return (
    <Link
      href={`/boards/${task.boardId}`}
      className="flex items-start justify-between gap-3 rounded-lg px-2 py-2.5 transition hover:bg-bb-sky/50"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-bb-ink">
          <span className="text-bb-muted">{task.code}</span> {task.title}
        </p>
        <p className="mt-0.5 truncate text-xs text-bb-muted">
          {task.projectName} · {task.boardName} ·{" "}
          {STATUS_LABEL[task.status] ?? task.status}
        </p>
      </div>
      <span
        className={`shrink-0 text-xs font-medium ${
          task.isOverdue ? "text-red-600" : "text-bb-muted"
        }`}
      >
        {formatDue(task.dueDate)}
      </span>
    </Link>
  );
}

function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: number;
  hint?: string;
  tone?: "default" | "warn" | "ok";
}) {
  const valueClass =
    tone === "warn"
      ? "text-amber-700"
      : tone === "ok"
        ? "text-emerald-700"
        : "text-bb-ink";
  return (
    <div className="rounded-[12px] border border-bb-border/80 bg-bb-surface px-4 py-3 shadow-bb">
      <p className="text-xs font-semibold uppercase tracking-wide text-bb-muted">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${valueClass}`}>
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-bb-muted">{hint}</p> : null}
    </div>
  );
}

function WorkspaceDashboardContent() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params.workspaceId;
  useRealtimeRoom(workspaceRoom(workspaceId));

  const [workspace, setWorkspace] = useState<WorkspaceDetail | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [myTasks, setMyTasks] = useState<DashboardTaskItem[]>([]);
  const [upcoming, setUpcoming] = useState<DashboardTaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityRefreshToken, setActivityRefreshToken] = useState(0);
  const refreshTimerRef = useRef<number | null>(null);

  const loadDashboard = useCallback(async () => {
    let cancelled = false;
    setLoading(true);
    try {
      const [ws, sum, mine, due] = await Promise.all([
        fetchWorkspace(workspaceId),
        fetchDashboardSummary(workspaceId),
        fetchMyTasks({ workspaceId, limit: 8 }),
        fetchUpcomingTasks({ workspaceId, days: 14, limit: 8 }),
      ]);
      if (cancelled) return;
      setWorkspace(ws);
      setSummary(sum);
      setMyTasks(mine.items);
      setUpcoming(due.items);
    } catch (error) {
      toastFromError(error);
    } finally {
      if (!cancelled) setLoading(false);
    }
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

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
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
      }
      refreshTimerRef.current = window.setTimeout(() => {
        void loadDashboard();
        setActivityRefreshToken((value) => value + 1);
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
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
      }
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
  }, [workspaceId, loadDashboard]);

  const theme: ThemeColors | null = workspace
    ? {
        themeColorFrom: workspace.themeColorFrom,
        themeColorTo: workspace.themeColorTo,
      }
    : null;

  return (
    <AppShell
      title="Dashboard"
      subtitle={
        workspace
          ? `${workspace.name} — overview, your tasks, and upcoming deadlines`
          : "Workspace overview"
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

      {loading && !summary ? (
        <p className="text-sm text-bb-muted">Loading dashboard…</p>
      ) : summary ? (
        <div className="space-y-8">
          <section>
            <div className="mb-3 flex items-center gap-2">
              <LayoutDashboard
                className="h-4 w-4 text-bb-blue"
                strokeWidth={2}
                aria-hidden
              />
              <h2 className="text-lg font-bold text-bb-ink">
                Workspace summary
              </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Projects"
                value={summary.workspace.projectsCount}
              />
              <StatCard label="Boards" value={summary.workspace.boardsCount} />
              <StatCard label="Members" value={summary.workspace.membersCount} />
              <StatCard label="Tasks" value={summary.tasks.total} />
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="To do" value={summary.tasks.todo} />
              <StatCard
                label="In progress"
                value={summary.tasks.inProgress}
              />
              <StatCard
                label="Done"
                value={summary.tasks.done}
                tone="ok"
              />
              <StatCard
                label="Overdue"
                value={summary.tasks.overdue}
                hint={`${summary.tasks.dueSoon} due in 7 days`}
                tone={summary.tasks.overdue > 0 ? "warn" : "default"}
              />
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-bb-ink">
              Project summary
            </h2>
            {summary.projects.length === 0 ? (
              <p className="text-sm text-bb-muted">No projects yet.</p>
            ) : (
              <div className="overflow-hidden rounded-[12px] border border-bb-border/80 bg-bb-surface shadow-bb">
                <ul className="divide-y divide-bb-border/60">
                  {summary.projects.map((p) => {
                    const pct =
                      p.tasksTotal === 0
                        ? 0
                        : Math.round((p.tasksDone / p.tasksTotal) * 100);
                    return (
                      <li key={p.id}>
                        <Link
                          href={`/projects/${p.id}`}
                          className="flex items-center justify-between gap-4 px-4 py-3 transition hover:bg-bb-sky/40"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-bb-ink">
                              {p.name}
                            </p>
                            <p className="text-xs text-bb-muted">
                              {p.boardsCount} boards · {p.tasksDone}/
                              {p.tasksTotal} tasks done
                            </p>
                          </div>
                          <div className="w-24 shrink-0">
                            <div className="h-1.5 overflow-hidden rounded-full bg-bb-sky">
                              <div
                                className="h-full rounded-full bg-bb-blue"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <p className="mt-1 text-right text-xs tabular-nums text-bb-muted">
                              {pct}%
                            </p>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-[12px] border border-bb-border/80 bg-bb-surface p-4 shadow-bb">
              <div className="mb-2 flex items-center gap-2">
                <ListTodo
                  className="h-4 w-4 text-bb-blue"
                  strokeWidth={2}
                  aria-hidden
                />
                <h2 className="font-bold text-bb-ink">My tasks</h2>
              </div>
              {myTasks.length === 0 ? (
                <p className="px-2 py-6 text-center text-sm text-bb-muted">
                  No tasks assigned to you.
                </p>
              ) : (
                <ul className="divide-y divide-bb-border/50">
                  {myTasks.map((t) => (
                    <li key={t.id}>
                      <TaskRow task={t} />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-[12px] border border-bb-border/80 bg-bb-surface p-4 shadow-bb">
              <div className="mb-2 flex items-center gap-2">
                <CalendarClock
                  className="h-4 w-4 text-bb-blue"
                  strokeWidth={2}
                  aria-hidden
                />
                <h2 className="font-bold text-bb-ink">Upcoming deadlines</h2>
              </div>
              <p className="mb-2 px-2 text-xs text-bb-muted">
                Next 14 days (includes overdue)
              </p>
              {upcoming.length === 0 ? (
                <p className="px-2 py-6 text-center text-sm text-bb-muted">
                  No upcoming deadlines.
                </p>
              ) : (
                <ul className="divide-y divide-bb-border/50">
                  {upcoming.map((t) => (
                    <li key={t.id}>
                      <TaskRow task={t} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section className="rounded-[12px] border border-bb-border/80 bg-bb-surface p-4 shadow-bb">
            <div className="mb-2 flex items-center gap-2">
              <Clock3
                className="h-4 w-4 text-bb-blue"
                strokeWidth={2}
                aria-hidden
              />
              <h2 className="font-bold text-bb-ink">Live activity stream</h2>
            </div>
            <p className="mb-2 px-2 text-xs text-bb-muted">
              Auto-refreshes when tasks and comments change in this workspace.
            </p>
            <ActivityFeed
              workspaceId={workspaceId}
              mode="timeline"
              limit={12}
              showAbsoluteTime
              refreshToken={activityRefreshToken}
            />
          </section>
        </div>
      ) : (
        <div className="rounded-[12px] border border-dashed border-bb-border bg-bb-sky/40 px-6 py-12 text-center">
          <CheckSquare
            className="mx-auto h-8 w-8 text-bb-muted"
            strokeWidth={1.5}
            aria-hidden
          />
          <p className="mt-3 text-sm text-bb-muted">
            Could not load dashboard data.
          </p>
        </div>
      )}
    </AppShell>
  );
}

export default function WorkspaceDashboardPage() {
  return <WorkspaceDashboardContent />;
}
