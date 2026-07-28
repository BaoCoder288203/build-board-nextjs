"use client";

import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { buttonClassName } from "@/components/ui/button";
import { useRealtimeRoom } from "@/hooks/use-realtime-room";
import { fetchProjects } from "@/lib/projects";
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
  fetchCalendarTasks,
  type TaskCard,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/tasks";
import { toastFromError } from "@/lib/toast";
import { fetchWorkspace } from "@/lib/workspaces";
import type { ProjectSummary } from "@/lib/projects";
import type { WorkspaceDetail } from "@/lib/workspaces";

type CalendarView = "month" | "week" | "day";

function startOfDay(input: Date) {
  const d = new Date(input);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(input: Date) {
  const d = new Date(input);
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfWeek(input: Date) {
  const d = startOfDay(input);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  d.setDate(d.getDate() + diff);
  return d;
}

function endOfWeek(input: Date) {
  const start = startOfWeek(input);
  const d = new Date(start);
  d.setDate(start.getDate() + 6);
  return endOfDay(d);
}

function startOfMonth(input: Date) {
  return startOfDay(new Date(input.getFullYear(), input.getMonth(), 1));
}

function endOfMonth(input: Date) {
  return endOfDay(new Date(input.getFullYear(), input.getMonth() + 1, 0));
}

function formatHeaderDate(view: CalendarView, anchor: Date) {
  if (view === "day") {
    return anchor.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }
  if (view === "week") {
    const start = startOfWeek(anchor);
    const end = endOfWeek(anchor);
    return `${start.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    })} - ${end.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`;
  }
  return anchor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function getRange(view: CalendarView, anchor: Date) {
  if (view === "day") {
    return {
      rangeStart: startOfDay(anchor),
      rangeEnd: endOfDay(anchor),
    };
  }
  if (view === "week") {
    return {
      rangeStart: startOfWeek(anchor),
      rangeEnd: endOfWeek(anchor),
    };
  }
  return {
    rangeStart: startOfMonth(anchor),
    rangeEnd: endOfMonth(anchor),
  };
}

function shiftAnchor(view: CalendarView, anchor: Date, delta: number) {
  const next = new Date(anchor);
  if (view === "day") next.setDate(next.getDate() + delta);
  else if (view === "week") next.setDate(next.getDate() + delta * 7);
  else next.setMonth(next.getMonth() + delta);
  return next;
}

function taskBadge(priority: TaskPriority) {
  if (priority === "URGENT") return "bg-red-100 text-red-700";
  if (priority === "HIGH") return "bg-amber-100 text-amber-800";
  if (priority === "MEDIUM") return "bg-sky-100 text-sky-800";
  return "bg-slate-100 text-slate-700";
}

export default function WorkspaceCalendarPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  useRealtimeRoom(workspaceRoom(workspaceId));

  const [workspace, setWorkspace] = useState<WorkspaceDetail | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [tasks, setTasks] = useState<TaskCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<CalendarView>("month");
  const [anchor, setAnchor] = useState(() => new Date());
  const [projectId, setProjectId] = useState("");
  const [status, setStatus] = useState<TaskStatus | "">("");
  const [priority, setPriority] = useState<TaskPriority | "">("");
  const debounceRef = useRef<number | null>(null);

  const range = useMemo(() => getRange(view, anchor), [view, anchor]);
  const title = useMemo(() => formatHeaderDate(view, anchor), [view, anchor]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ws, projectResult, calendar] = await Promise.all([
        fetchWorkspace(workspaceId),
        fetchProjects(workspaceId),
        fetchCalendarTasks({
          workspaceId,
          rangeStart: range.rangeStart.toISOString(),
          rangeEnd: range.rangeEnd.toISOString(),
          ...(projectId ? { projectId } : {}),
          ...(status ? { status } : {}),
          ...(priority ? { priority } : {}),
        }),
      ]);
      setWorkspace(ws);
      setProjects(projectResult.items);
      setTasks(calendar.items);
    } catch (error) {
      toastFromError(error);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, range.rangeStart, range.rangeEnd, projectId, status, priority]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const socket = connectRealtime();
    const triggerReload = () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        void load();
      }, 300);
    };
    const onTaskChanged = (
      payload: TaskCreatedPayload | TaskUpdatedPayload | TaskMovedPayload | TaskDeletedPayload,
    ) => {
      const payloadWorkspaceId =
        "workspaceId" in payload ? payload.workspaceId : payload.task.workspaceId;
      if (payloadWorkspaceId !== workspaceId) return;
      triggerReload();
    };
    const onCommentChanged = (
      payload: CommentRealtimePayload | CommentDeletedPayload,
    ) => {
      if (payload.workspaceId !== workspaceId) return;
      triggerReload();
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
  }, [workspaceId, load]);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, TaskCard[]>();
    for (const task of tasks) {
      if (!task.dueDate) continue;
      const key = new Date(task.dueDate).toISOString().slice(0, 10);
      const current = map.get(key) ?? [];
      current.push(task);
      map.set(key, current);
    }
    for (const entry of map.values()) {
      entry.sort(
        (a, b) => new Date(a.dueDate ?? 0).getTime() - new Date(b.dueDate ?? 0).getTime(),
      );
    }
    return map;
  }, [tasks]);

  const days = useMemo(() => {
    const result: Date[] = [];
    if (view === "day") return [startOfDay(anchor)];
    if (view === "week") {
      const start = startOfWeek(anchor);
      for (let i = 0; i < 7; i += 1) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        result.push(d);
      }
      return result;
    }
    const start = startOfWeek(startOfMonth(anchor));
    for (let i = 0; i < 42; i += 1) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      result.push(d);
    }
    return result;
  }, [view, anchor]);

  return (
    <AppShell
      title="Calendar"
      subtitle={workspace ? `${workspace.name} task schedule` : "Task schedule"}
      theme={
        workspace
          ? {
              themeColorFrom: workspace.themeColorFrom,
              themeColorTo: workspace.themeColorTo,
            }
          : null
      }
    >
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Link
          href={`/workspaces/${workspaceId}`}
          className={buttonClassName({ variant: "secondary", size: "sm" })}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back
        </Link>
        <Link
          href={`/workspaces/${workspaceId}/timeline`}
          className={buttonClassName({ variant: "ghost", size: "sm" })}
        >
          <CalendarDays className="h-4 w-4" aria-hidden />
          Timeline
        </Link>
      </div>

      <div className="mb-4 rounded-[12px] border border-bb-border bg-bb-surface p-4 shadow-bb">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAnchor((prev) => shiftAnchor(view, prev, -1))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-bb-border bg-white"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => setAnchor(new Date())}
              className="rounded-lg border border-bb-border bg-white px-3 py-2 text-sm font-semibold text-bb-ink"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setAnchor((prev) => shiftAnchor(view, prev, 1))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-bb-border bg-white"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
            <p className="ml-2 text-sm font-semibold text-bb-ink">{title}</p>
          </div>
          <div className="flex items-center gap-2">
            {(["month", "week", "day"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setView(value)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                  value === view
                    ? "bg-bb-blue text-white"
                    : "bg-white text-bb-ink border border-bb-border"
                }`}
              >
                {value[0]!.toUpperCase() + value.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <select
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
            className="h-10 rounded-lg border border-bb-border bg-white px-3 text-sm"
          >
            <option value="">All projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as TaskStatus | "")}
            className="h-10 rounded-lg border border-bb-border bg-white px-3 text-sm"
          >
            <option value="">All status</option>
            <option value="TODO">TODO</option>
            <option value="IN_PROGRESS">IN PROGRESS</option>
            <option value="REVIEW">REVIEW</option>
            <option value="DONE">DONE</option>
          </select>
          <select
            value={priority}
            onChange={(event) => setPriority(event.target.value as TaskPriority | "")}
            className="h-10 rounded-lg border border-bb-border bg-white px-3 text-sm"
          >
            <option value="">All priority</option>
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
            <option value="URGENT">URGENT</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-bb-muted">Loading calendar...</p>
      ) : (
        <div
          className={`grid gap-3 ${view === "month" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-7" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"}`}
        >
          {days.map((day) => {
            const key = day.toISOString().slice(0, 10);
            const dayTasks = tasksByDay.get(key) ?? [];
            const outOfMonth =
              view === "month" && day.getMonth() !== anchor.getMonth();
            return (
              <div
                key={key}
                className={`min-h-36 rounded-[10px] border border-bb-border bg-white p-3 ${
                  outOfMonth ? "opacity-55" : ""
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold text-bb-muted">
                    {day.toLocaleDateString(undefined, {
                      weekday: view === "day" ? "long" : "short",
                    })}
                  </p>
                  <p className="text-sm font-bold text-bb-ink">
                    {day.toLocaleDateString(undefined, { day: "numeric" })}
                  </p>
                </div>
                <div className="space-y-1.5">
                  {dayTasks.slice(0, view === "month" ? 3 : 8).map((task) => (
                    <Link
                      key={task.id}
                      href={task.boardId ? `/boards/${task.boardId}` : "#"}
                      className="block rounded-lg border border-bb-border/80 px-2 py-1.5 hover:bg-bb-sky/50"
                    >
                      <p className="truncate text-xs font-semibold text-bb-ink">
                        {task.code} {task.title}
                      </p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${taskBadge(task.priority)}`}
                        >
                          {task.priority}
                        </span>
                        <span className="text-[10px] text-bb-muted">{task.status}</span>
                      </div>
                    </Link>
                  ))}
                  {dayTasks.length > (view === "month" ? 3 : 8) ? (
                    <p className="text-[11px] text-bb-muted">
                      +{dayTasks.length - (view === "month" ? 3 : 8)} more
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

