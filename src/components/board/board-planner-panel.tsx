"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { CalendarDays, ChevronLeft, ChevronRight, Flag, Users } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type PointerEvent,
} from "react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { prefersReducedMotion } from "@/lib/board-transition";
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
import { fetchCalendarTasks, updateTask, type TaskCard, type TaskPriority } from "@/lib/tasks";
import { toastFromError, toastSuccess } from "@/lib/toast";

gsap.registerPlugin(useGSAP);

const HOUR_START = 0;
const HOUR_END = 23;
const SLOT_PX = 64;
const SUB_SLOTS = 4;
const SLOT_MINUTES = 60 / SUB_SLOTS;
const SLOT_HEIGHT = SLOT_PX / SUB_SLOTS;
const TOTAL_SLOTS = (HOUR_END - HOUR_START + 1) * SUB_SLOTS;

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

function startOfMonth(input: Date) {
  return startOfDay(new Date(input.getFullYear(), input.getMonth(), 1));
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dayKey(input: Date) {
  const y = input.getFullYear();
  const m = String(input.getMonth() + 1).padStart(2, "0");
  const d = String(input.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function gmtLabel() {
  const offset = -new Date().getTimezoneOffset() / 60;
  const sign = offset >= 0 ? "+" : "";
  return `GMT${sign}${offset}`;
}

function formatHour(hour: number) {
  const suffix = hour >= 12 ? "pm" : "am";
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h} ${suffix}`;
}

function monthGrid(anchor: Date) {
  const first = startOfMonth(anchor);
  const start = new Date(first);
  const weekday = start.getDay();
  const diff = weekday === 0 ? -6 : 1 - weekday;
  start.setDate(start.getDate() + diff);
  const days: Date[] = [];
  for (let i = 0; i < 42; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function isMidnight(input: Date) {
  return input.getHours() === 0 && input.getMinutes() === 0 && input.getSeconds() === 0;
}

function slotIndexFromY(y: number) {
  return clamp(Math.floor(y / SLOT_HEIGHT), 0, TOTAL_SLOTS - 1);
}

function dateFromSlot(anchor: Date, slot: number) {
  const next = startOfDay(anchor);
  next.setMinutes(slot * SLOT_MINUTES);
  return next;
}

function slotFromDate(input: Date, anchor: Date) {
  if (dayKey(input) < dayKey(anchor)) return 0;
  if (dayKey(input) > dayKey(anchor)) return TOTAL_SLOTS;
  return clamp(
    (input.getHours() - HOUR_START) * SUB_SLOTS +
      Math.floor(input.getMinutes() / SLOT_MINUTES),
    0,
    TOTAL_SLOTS,
  );
}

function formatClock(input: Date) {
  return `${String(input.getHours()).padStart(2, "0")}:${String(
    input.getMinutes(),
  ).padStart(2, "0")}`;
}

function formatSlotRange(anchor: Date, startSlot: number, endSlot: number) {
  return `${formatClock(dateFromSlot(anchor, startSlot))} – ${formatClock(
    dateFromSlot(anchor, endSlot),
  )}`;
}

function endSlotFromHeight(startSlot: number, heightPx: number) {
  const slots = Math.max(1, Math.round(heightPx / SLOT_HEIGHT));
  return Math.min(TOTAL_SLOTS, startSlot + slots);
}

function applyLiveRange(
  el: HTMLElement,
  anchor: Date,
  startSlot: number,
  endSlot: number,
) {
  const rangeNode = el.querySelector("[data-planner-range]");
  if (rangeNode) {
    rangeNode.textContent = formatSlotRange(anchor, startSlot, endSlot);
  }
  const meta = el.querySelector("[data-planner-meta]");
  if (meta instanceof HTMLElement) {
    const rich = endSlot - startSlot >= 2;
    meta.classList.toggle("hidden", !rich);
    meta.classList.toggle("flex", rich);
  }
}

const PRIORITY_STYLE: Record<TaskPriority, string> = {
  LOW: "bg-slate-100 text-slate-700",
  MEDIUM: "bg-sky-100 text-sky-800",
  HIGH: "bg-amber-100 text-amber-900",
  URGENT: "bg-red-100 text-red-800",
};

function TaskPriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <span
      className={`rounded px-1 py-px text-[9px] font-bold leading-none ${PRIORITY_STYLE[priority]}`}
    >
      {priority}
    </span>
  );
}

function TaskMemberStack({ task }: { task: TaskCard }) {
  if (task.assignees.length === 0) {
    return <span className="text-[9px] font-medium opacity-60">None</span>;
  }
  return (
    <span className="flex -space-x-1">
      {task.assignees.slice(0, 3).map((a) => (
        <UserAvatar
          key={a.workspaceMemberId}
          name={a.user.fullName}
          avatarUrl={a.user.avatarUrl}
          size="xs"
          ringClassName="ring-1 ring-white"
        />
      ))}
    </span>
  );
}

function TaskMetaFields({ task }: { task: TaskCard }) {
  return (
    <span className="flex min-w-0 flex-col gap-1.5">
      <span className="inline-flex min-w-0 items-center gap-1" title="Priority">
        <Flag className="h-3 w-3 shrink-0 opacity-70" strokeWidth={2.25} aria-hidden />
        <span className="sr-only">Priority</span>
        <TaskPriorityBadge priority={task.priority} />
      </span>
      <span className="inline-flex min-w-0 items-center gap-1" title="Members">
        <Users className="h-3 w-3 shrink-0 opacity-70" strokeWidth={2.25} aria-hidden />
        <span className="sr-only">Members</span>
        <TaskMemberStack task={task} />
      </span>
    </span>
  );
}

function readDragPayload(e: DragEvent) {
  const raw =
    e.dataTransfer.getData("text/plain") ||
    e.dataTransfer.getData("application/json");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { taskId: string; sourceColumnId?: string };
  } catch {
    return null;
  }
}

type TimedBlock = {
  task: TaskCard;
  startSlot: number;
  endSlot: number;
};

export function BoardPlannerPanel({
  workspaceId,
  boardId,
  onOpenTask,
  onTaskScheduled,
}: {
  workspaceId: string;
  boardId: string;
  onOpenTask?: (task: TaskCard) => void;
  onTaskScheduled?: (task: TaskCard) => void;
}) {
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(() => startOfMonth(new Date()));
  const [tasks, setTasks] = useState<TaskCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => new Date());
  const pickerRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);
  const resizeRef = useRef<{
    taskId: string;
    startSlot: number;
    el: HTMLElement;
  } | null>(null);
  const [draggingOver, setDraggingOver] = useState(false);
  const [allDayOver, setAllDayOver] = useState(false);

  const rangeStart = useMemo(() => startOfDay(anchor).toISOString(), [anchor]);
  const rangeEnd = useMemo(() => endOfDay(anchor).toISOString(), [anchor]);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const calendar = await fetchCalendarTasks({
        workspaceId,
        boardId,
        rangeStart,
        rangeEnd,
      });
      setTasks(calendar.items);
    } catch (error) {
      toastFromError(error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [workspaceId, boardId, rangeStart, rangeEnd]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const hour = Math.max(HOUR_START, Math.min(HOUR_END, now.getHours()));
    const node = scrollerRef.current;
    if (!node) return;
    node.scrollTop = Math.max(0, (hour - HOUR_START) * SLOT_PX - SLOT_PX);
  }, [anchor]);

  useGSAP(
    () => {
      if (ghostRef.current) gsap.set(ghostRef.current, { opacity: 0, y: 0 });
      return () => {
        if (ghostRef.current) gsap.killTweensOf(ghostRef.current);
      };
    },
    { scope: gridRef },
  );

  useEffect(() => {
    if (!pickerOpen) return;
    function onDoc(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [pickerOpen]);

  useEffect(() => {
    const socket = connectRealtime();
    const triggerReload = () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        void load(true);
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

  const { timed, allDay } = useMemo(() => {
    const timedTasks: TimedBlock[] = [];
    const allDayTasks: TaskCard[] = [];
    for (const task of tasks) {
      if (!task.dueDate) continue;
      const due = new Date(task.dueDate);
      if (!task.startDate && isMidnight(due) && dayKey(due) === dayKey(anchor)) {
        allDayTasks.push(task);
        continue;
      }
      if (!task.startDate && isMidnight(due)) continue;
      const start = task.startDate ? new Date(task.startDate) : due;
      const startSlot = slotFromDate(start, anchor);
      let endSlot = slotFromDate(due, anchor);
      if (endSlot <= startSlot) endSlot = Math.min(TOTAL_SLOTS, startSlot + 1);
      if (endSlot <= 0 || startSlot >= TOTAL_SLOTS) continue;
      timedTasks.push({
        task,
        startSlot: clamp(startSlot, 0, TOTAL_SLOTS - 1),
        endSlot: clamp(endSlot, 1, TOTAL_SLOTS),
      });
    }
    return { timed: timedTasks, allDay: allDayTasks };
  }, [tasks, anchor]);

  const hours = useMemo(
    () => Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i),
    [],
  );

  const showNow = sameDay(anchor, now);
  const nowTop =
    (now.getHours() - HOUR_START) * SLOT_PX + (now.getMinutes() / 60) * SLOT_PX;

  function goToday() {
    const today = startOfDay(new Date());
    setAnchor(today);
    setPickerMonth(startOfMonth(today));
    setPickerOpen(false);
  }

  function shiftDay(delta: number) {
    setAnchor((prev) => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + delta);
      return startOfDay(next);
    });
  }

  function yFromPointer(clientY: number) {
    const grid = gridRef.current;
    if (!grid) return 0;
    return clientY - grid.getBoundingClientRect().top;
  }

  function moveGhost(slot: number) {
    const node = ghostRef.current;
    if (!node) return;
    const y = slot * SLOT_HEIGHT;
    if (prefersReducedMotion()) {
      gsap.set(node, { y, opacity: 1 });
      return;
    }
    gsap.to(node, {
      y,
      opacity: 1,
      duration: 0.12,
      ease: "power2.out",
      overwrite: true,
    });
  }

  function hideGhost() {
    const node = ghostRef.current;
    if (!node) return;
    gsap.set(node, { opacity: 0 });
  }

  function playEnter(el: HTMLElement | null) {
    if (!el) return;
    if (prefersReducedMotion()) {
      gsap.set(el, { opacity: 1, scale: 1 });
      return;
    }
    gsap.fromTo(
      el,
      { opacity: 0.55, scale: 0.96 },
      { opacity: 1, scale: 1, duration: 0.18, ease: "power2.out" },
    );
  }

  async function persistSchedule(
    taskId: string,
    startDate: string | null | undefined,
    dueDate: string,
  ) {
    const updated = await updateTask(taskId, {
      ...(startDate !== undefined ? { startDate } : {}),
      dueDate,
    });
    setTasks((prev) => {
      const exists = prev.some((item) => item.id === updated.id);
      return exists
        ? prev.map((item) => (item.id === updated.id ? updated : item))
        : [...prev, updated];
    });
    onTaskScheduled?.(updated);
    return updated;
  }

  function onGridDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    if (!draggingOver) setDraggingOver(true);
    moveGhost(slotIndexFromY(yFromPointer(e.clientY)));
  }

  function onGridDragLeave(e: DragEvent<HTMLDivElement>) {
    const next = e.relatedTarget as Node | null;
    if (next && e.currentTarget.contains(next)) return;
    setDraggingOver(false);
    hideGhost();
  }

  async function onGridDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDraggingOver(false);
    hideGhost();
    const payload = readDragPayload(e);
    if (!payload?.taskId) return;
    const slot = slotIndexFromY(yFromPointer(e.clientY));
    const start = dateFromSlot(anchor, slot);
    const due = dateFromSlot(anchor, slot + 1);
    try {
      const updated = await persistSchedule(
        payload.taskId,
        start.toISOString(),
        due.toISOString(),
      );
      toastSuccess("Scheduled");
      requestAnimationFrame(() => {
        playEnter(
          gridRef.current?.querySelector(
            `[data-planner-block="${updated.id}"]`,
          ) as HTMLElement | null,
        );
      });
    } catch (error) {
      toastFromError(error);
    }
  }

  function onAllDayDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    if (!allDayOver) setAllDayOver(true);
  }

  function onAllDayDragLeave(e: DragEvent<HTMLDivElement>) {
    const next = e.relatedTarget as Node | null;
    if (next && e.currentTarget.contains(next)) return;
    setAllDayOver(false);
  }

  async function onAllDayDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setAllDayOver(false);
    const payload = readDragPayload(e);
    if (!payload?.taskId) return;
    try {
      await persistSchedule(
        payload.taskId,
        null,
        startOfDay(anchor).toISOString(),
      );
      toastSuccess("All day");
    } catch (error) {
      toastFromError(error);
    }
  }

  function onResizePointerDown(
    e: PointerEvent<HTMLButtonElement>,
    block: TimedBlock,
  ) {
    e.preventDefault();
    e.stopPropagation();
    const el = e.currentTarget.parentElement;
    if (!el) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    resizeRef.current = {
      taskId: block.task.id,
      startSlot: block.startSlot,
      el,
    };
  }

  function onResizePointerMove(e: PointerEvent<HTMLButtonElement>) {
    const active = resizeRef.current;
    if (!active) return;
    const heightPx = Math.max(
      SLOT_HEIGHT,
      yFromPointer(e.clientY) - active.startSlot * SLOT_HEIGHT,
    );
    gsap.set(active.el, { height: heightPx });
    applyLiveRange(
      active.el,
      anchor,
      active.startSlot,
      endSlotFromHeight(active.startSlot, heightPx),
    );
  }

  async function onResizePointerUp(e: PointerEvent<HTMLButtonElement>) {
    const active = resizeRef.current;
    if (!active) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    const blockEl = active.el;
    const rawHeight = blockEl.getBoundingClientRect().height;
    const slots = Math.max(1, Math.round(rawHeight / SLOT_HEIGHT));
    const endSlot = Math.min(TOTAL_SLOTS, active.startSlot + slots);
    const snappedHeight = (endSlot - active.startSlot) * SLOT_HEIGHT;
    const due = dateFromSlot(anchor, endSlot);
    applyLiveRange(blockEl, anchor, active.startSlot, endSlot);
    resizeRef.current = null;
    suppressClickRef.current = true;
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 200);
    if (!prefersReducedMotion()) {
      gsap.to(blockEl, {
        height: snappedHeight,
        duration: 0.14,
        ease: "power2.out",
      });
    } else {
      gsap.set(blockEl, { height: snappedHeight });
    }
    try {
      await persistSchedule(active.taskId, undefined, due.toISOString());
    } catch (error) {
      toastFromError(error);
      void load(true);
    }
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-bb-border/80 bg-white shadow-bb">
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-bb-border/70 px-3 py-2">
        <div className="relative flex items-center gap-1" ref={pickerRef}>
          <button
            type="button"
            onClick={() => {
              setPickerMonth(startOfMonth(anchor));
              setPickerOpen((open) => !open);
            }}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-semibold text-bb-ink hover:bg-bb-sky"
            aria-expanded={pickerOpen}
            aria-haspopup="dialog"
          >
            <CalendarDays className="h-4 w-4 text-bb-blue" aria-hidden />
            {anchor.toLocaleDateString(undefined, { month: "short" })}
          </button>
          <button
            type="button"
            onClick={() => shiftDay(-1)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-bb-muted hover:bg-bb-sky"
            aria-label="Previous day"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => shiftDay(1)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-bb-muted hover:bg-bb-sky"
            aria-label="Next day"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={goToday}
            className="rounded-lg px-2.5 py-1.5 text-sm font-semibold text-bb-blue hover:bg-bb-sky"
          >
            Today
          </button>
          {pickerOpen ? (
            <div
              role="dialog"
              aria-label="Select date"
              className="absolute left-0 top-11 z-20 w-72 rounded-xl border border-bb-border bg-white p-3 shadow-bb-lg"
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-bold text-bb-ink">
                  {pickerMonth.toLocaleDateString(undefined, {
                    month: "long",
                    year: "numeric",
                  })}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-bb-sky"
                    onClick={() =>
                      setPickerMonth((prev) => {
                        const next = new Date(prev);
                        next.setMonth(prev.getMonth() - 1);
                        return startOfMonth(next);
                      })
                    }
                    aria-label="Previous month"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-bb-sky"
                    onClick={() =>
                      setPickerMonth((prev) => {
                        const next = new Date(prev);
                        next.setMonth(prev.getMonth() + 1);
                        return startOfMonth(next);
                      })
                    }
                    aria-label="Next month"
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>
              <div className="mb-1 grid grid-cols-7 text-center text-[10px] font-semibold uppercase text-bb-muted">
                {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-y-1">
                {monthGrid(pickerMonth).map((day) => {
                  const selected = sameDay(day, anchor);
                  const today = sameDay(day, now);
                  const out = day.getMonth() !== pickerMonth.getMonth();
                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      onClick={() => {
                        setAnchor(startOfDay(day));
                        setPickerOpen(false);
                      }}
                      className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                        selected
                          ? "bg-bb-blue text-white"
                          : today
                            ? "bg-bb-sky text-bb-blue"
                            : out
                              ? "text-bb-muted/50"
                              : "text-bb-ink hover:bg-bb-sky"
                      }`}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </header>

      <div className="shrink-0 border-b border-bb-border/70 px-4 py-2">
        <p className="text-sm font-bold text-bb-blue">
          {anchor.toLocaleDateString(undefined, { weekday: "long", day: "numeric" })}
        </p>
      </div>

      <div
        onDragOver={onAllDayDragOver}
        onDragLeave={onAllDayDragLeave}
        onDrop={(e) => void onAllDayDrop(e)}
        className={`shrink-0 space-y-1 border-b px-3 py-2 ${
          allDayOver
            ? "border-bb-blue bg-bb-sky/70"
            : "border-bb-border/70 bg-white"
        }`}
      >
        {allDay.length > 0 ? (
          allDay.map((task) => (
            <button
              key={task.id}
              type="button"
              onClick={() => onOpenTask?.(task)}
              className="flex w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-md bg-bb-sky px-2 py-1 text-left text-xs font-semibold text-bb-blue"
            >
              <span className="min-w-0 flex-1 truncate">{task.title}</span>
              <TaskMetaFields task={task} />
              <span className="shrink-0 text-[10px] font-medium opacity-80">
                All day
              </span>
            </button>
          ))
        ) : (
          <p className="text-[11px] font-medium text-bb-muted">
            Drop here for all day
          </p>
        )}
      </div>

      <div ref={scrollerRef} className="relative min-h-0 flex-1 overflow-y-auto">
        {loading && tasks.length === 0 ? (
          <p className="pointer-events-none absolute inset-x-0 top-4 z-10 px-4 text-sm text-bb-muted">
            Loading planner...
          </p>
        ) : null}
          <div
            ref={gridRef}
            className="relative"
            style={{ height: hours.length * SLOT_PX }}
            onDragOver={onGridDragOver}
            onDragLeave={onGridDragLeave}
            onDrop={(e) => void onGridDrop(e)}
          >
            <div className="pointer-events-none absolute left-0 top-0 w-14 pt-1 text-[10px] font-semibold text-bb-muted">
              <span className="block px-2">{gmtLabel()}</span>
            </div>
            {hours.map((hour) => (
              <div
                key={hour}
                className="pointer-events-none absolute right-0 left-0"
                style={{ top: (hour - HOUR_START) * SLOT_PX, height: SLOT_PX }}
              >
                <span className="absolute -top-2 left-2 z-[1] w-10 text-right text-[11px] font-semibold text-bb-muted">
                  {formatHour(hour)}
                </span>
                <span className="absolute inset-x-0 top-0 border-t border-bb-border/60" />
                {Array.from({ length: SUB_SLOTS - 1 }, (_, i) => (
                  <span
                    key={i}
                    className="absolute inset-x-14 border-t border-bb-border/30"
                    style={{ top: (i + 1) * SLOT_HEIGHT }}
                  />
                ))}
              </div>
            ))}
            <div
              ref={ghostRef}
              className="pointer-events-none absolute left-16 right-3 z-[1] rounded-md bg-bb-blue/15 opacity-0"
              style={{
                top: 0,
                height: SLOT_HEIGHT,
              }}
            />
            {timed.map((block) => {
              const span = block.endSlot - block.startSlot;
              return (
                <div
                  key={block.task.id}
                  data-planner-block={block.task.id}
                  className={`absolute left-16 right-3 z-[2] overflow-hidden rounded-md bg-bb-sky text-left text-xs font-semibold text-bb-blue shadow-sm ${
                    draggingOver ? "pointer-events-none" : ""
                  }`}
                  style={{
                    top: block.startSlot * SLOT_HEIGHT,
                    height: Math.max(SLOT_HEIGHT, span * SLOT_HEIGHT),
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (suppressClickRef.current) return;
                      onOpenTask?.(block.task);
                    }}
                    className="flex h-full w-full flex-col items-stretch gap-1.5 overflow-hidden px-2 pb-1.5 pt-1.5 text-left"
                  >
                    <span className="mt-0.5 flex min-w-0 items-center gap-1">
                      <span className="min-w-0 flex-1 truncate text-[11px] font-semibold">
                        {block.task.title}
                      </span>
                      <span
                        data-planner-range
                        className="shrink-0 text-[10px] font-medium tabular-nums opacity-80"
                      >
                        {formatSlotRange(anchor, block.startSlot, block.endSlot)}
                      </span>
                    </span>
                    <span
                      data-planner-meta
                      className={`mt-0.5 min-w-0 flex-col gap-1.5 ${
                        span >= 2 ? "flex" : "hidden"
                      }`}
                    >
                      <TaskMetaFields task={block.task} />
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label="Resize duration"
                    className="absolute inset-x-0 bottom-0 z-[3] h-2 cursor-s-resize touch-none"
                    onPointerDown={(e) => onResizePointerDown(e, block)}
                    onPointerMove={onResizePointerMove}
                    onPointerUp={(e) => void onResizePointerUp(e)}
                    onPointerCancel={(e) => void onResizePointerUp(e)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              );
            })}
            {showNow ? (
              <div
                className="pointer-events-none absolute left-12 right-2 z-[4] flex items-center"
                style={{ top: nowTop }}
              >
                <span className="h-2.5 w-2.5 rounded-full bg-bb-blue" />
                <span className="h-px flex-1 bg-bb-blue" />
              </div>
            ) : null}
            {draggingOver ? (
              <div className="pointer-events-none absolute inset-0 z-0" />
            ) : null}
          </div>
      </div>
    </section>
  );
}
