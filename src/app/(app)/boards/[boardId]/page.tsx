"use client";

import {
  ArrowLeft,
  Calendar,
  CheckSquare,
  Eye,
  LogIn,
  LogOut,
  MessageSquare,
  Paperclip,
  PhoneOff,
  Pin,
  Plus,
  Share2,
  Video,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ColumnMenu,
  ColumnMenuTrigger,
} from "@/components/board/column-menu";
import {
  BoardCanvasTransition,
  type BoardCanvasHandle,
} from "@/components/board/board-canvas-transition";
import { SwitchBoardsBar } from "@/components/board/switch-boards-bar";
import { TaskDetailModal } from "@/components/board/task-detail-modal";
import { BoardActivityButton } from "@/components/activity/board-activity-button";
import { BoardShareModal } from "@/components/board/board-share-modal";
import { MeetingCallModal } from "@/components/meeting/meeting-call-modal";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { AppShell } from "@/components/app-shell";
import { buttonClassName } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRealtimeRoom } from "@/hooks/use-realtime-room";
import { useMeetingWebRtc } from "@/hooks/use-meeting-webrtc";
import { useRealtimeSnapshotResync } from "@/hooks/use-realtime-snapshot-resync";
import { connectRealtime } from "@/lib/realtime/socket-client";
import {
  type BoardChangedPayload,
  type MeetingCreatedPayload,
  type MeetingEndedPayload,
  type MeetingJoinedPayload,
  type MeetingLeftPayload,
  type MeetingParticipantsPayload,
  type MeetingItem,
  SERVER_EVENT,
  boardRoom,
  meetingRoom,
  type TaskCreatedPayload,
  type TaskDeletedPayload,
  type TaskMovedPayload,
  type TaskUpdatedPayload,
} from "@/lib/realtime/events";
import { UserAvatarMenu } from "@/components/user-avatar-menu";
import { useAuthStore } from "@/stores/auth-store";
import {
  BOARD_SHELL_BG,
  peekBoardSwitchPending,
} from "@/lib/board-transition";
import { navigateWithCover } from "@/lib/route-cover";
import { toastFromError, toastSuccess } from "@/lib/toast";
import {
  workspaceCanvasBackground,
  workspaceCanvasStyle,
  type ThemeColors,
} from "@/lib/visual-identity";
import {
  getBoardPageCache,
  prefetchBoardPage,
} from "@/stores/entity-cache";
import { confirm } from "@/lib/confirm";
import {
  archiveColumn,
  copyColumn,
  createColumn,
  moveColumn,
  moveColumnTasks,
  sortColumn,
  updateColumn,
  type BoardColumn,
  type BoardDetail,
  type BoardSummary,
} from "@/lib/projects";
import {
  createTask,
  deleteTask,
  moveTask,
  type TaskCard,
  type TaskPriority,
} from "@/lib/tasks";
import { useRealtimeStore } from "@/stores/realtime-store";
import {
  endMeeting,
  fetchActiveMeeting,
  joinMeeting,
  leaveMeeting,
  startMeeting,
} from "@/lib/meetings";

const PRIORITY_STYLE: Record<TaskPriority, string> = {
  LOW: "bg-slate-100 text-slate-700",
  MEDIUM: "bg-sky-100 text-sky-800",
  HIGH: "bg-amber-100 text-amber-900",
  URGENT: "bg-red-100 text-red-800",
};

const EMPTY_PRESENCE: Array<{
  id: string;
  fullName: string;
  avatar: string | null;
}> = [];

type DragState = {
  taskId: string;
  sourceColumnId: string;
  overColumnId: string | null;
  insertIndex: number | null;
};

function BoardViewContent() {
  const params = useParams<{ boardId: string }>();
  const router = useRouter();
  const boardId = params.boardId;
  const activeBoardRoom = boardRoom(boardId);
  useRealtimeRoom(activeBoardRoom);
  const meId = useAuthStore((s) => s.user?.id);
  const rtStatus = useRealtimeStore((s) => s.status);
  const roomPresence = useRealtimeStore(
    (s) => s.roomPresence[activeBoardRoom] ?? EMPTY_PRESENCE,
  );
  const otherPresence = useMemo(
    () => roomPresence.filter((member) => member.id !== meId),
    [roomPresence, meId],
  );

  const [board, setBoard] = useState<BoardDetail | null>(
    () => getBoardPageCache(boardId)?.board ?? null,
  );
  const [workspaceTheme, setWorkspaceTheme] = useState<ThemeColors | null>(
    () => getBoardPageCache(boardId)?.workspaceTheme ?? null,
  );
  const [projectBoards, setProjectBoards] = useState<BoardSummary[]>(
    () => getBoardPageCache(boardId)?.projectBoards ?? [],
  );
  const [loading, setLoading] = useState(
    () => !getBoardPageCache(boardId)?.board?.columns?.length,
  );
  const [columnName, setColumnName] = useState("");
  const [addingColumn, setAddingColumn] = useState(false);
  const [draftByColumn, setDraftByColumn] = useState<Record<string, string>>({});
  const [creatingFor, setCreatingFor] = useState<string | null>(null);
  const [selected, setSelected] = useState<TaskCard | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [menuColumnId, setMenuColumnId] = useState<string | null>(null);
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [focusAddCardFor, setFocusAddCardFor] = useState<string | null>(null);
  const [switchingBoard, setSwitchingBoard] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [activeMeeting, setActiveMeeting] = useState<MeetingItem | null>(null);
  const [meetingBusy, setMeetingBusy] = useState(false);
  const [callMinimized, setCallMinimized] = useState(false);
  const addCardRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const dragRef = useRef<DragState | null>(null);
  const canvasRef = useRef<BoardCanvasHandle>(null);
  const boardRef = useRef<BoardDetail | null>(null);
  const taskEventAtRef = useRef<Record<string, string>>({});
  const boardEventAtRef = useRef<string | null>(null);
  const meName = useAuthStore((s) => s.user?.fullName ?? "You");

  const isInMeeting = useMemo(() => {
    if (!meId || !activeMeeting) return false;
    return activeMeeting.participants.some((p) => p.userId === meId && p.leftAt == null);
  }, [activeMeeting, meId]);
  const activeMeetingRoom = useMemo(
    () =>
      activeMeeting?.status === "ACTIVE" && isInMeeting
        ? meetingRoom(activeMeeting.id)
        : null,
    [activeMeeting, isInMeeting],
  );
  useRealtimeRoom(activeMeetingRoom);
  const activeParticipants = useMemo(
    () => activeMeeting?.participants.filter((p) => p.leftAt == null) ?? [],
    [activeMeeting],
  );
  const webrtc = useMeetingWebRtc({
    meetingId: activeMeeting?.status === "ACTIVE" ? activeMeeting.id : null,
    enabled: Boolean(activeMeeting?.status === "ACTIVE" && isInMeeting),
    meId: meId ?? null,
    participants: activeParticipants,
  });

  const load = useCallback(async () => {
    const cached = getBoardPageCache(boardId);
    const hasColumns = Boolean(cached?.board?.columns?.length);
    if (!hasColumns) setLoading(true);
    try {
      const page = await prefetchBoardPage(boardId);
      setBoard(page.board);
      setProjectBoards(page.projectBoards);
      setWorkspaceTheme(page.workspaceTheme);
      setSelected((prev) => {
        if (!prev) return null;
        const flat = page.board.columns.flatMap((c) => c.tasks ?? []);
        return flat.find((t) => t.id === prev.id) ?? null;
      });
    } catch (error) {
      toastFromError(error);
      navigateWithCover(() => router.replace("/dashboard"));
    } finally {
      setLoading(false);
    }
  }, [boardId, router]);

  useRealtimeSnapshotResync(load);

  const loadActiveMeeting = useCallback(async () => {
    try {
      const active = await fetchActiveMeeting(boardId);
      setActiveMeeting(active);
    } catch {
      setActiveMeeting(null);
    }
  }, [boardId]);

  useEffect(() => {
    const cached = getBoardPageCache(boardId);
    if (cached?.board) {
      setBoard(cached.board);
      setProjectBoards(cached.projectBoards);
      setWorkspaceTheme(cached.workspaceTheme);
      if (cached.board.columns?.length) setLoading(false);
    } else {
      setBoard(null);
      setLoading(true);
    }
    setSelected(null);
    setDrag(null);
    dragRef.current = null;
    void load();
    void loadActiveMeeting();
  }, [load, loadActiveMeeting, boardId]);

  useEffect(() => {
    if (!focusAddCardFor) return;
    addCardRefs.current[focusAddCardFor]?.focus();
    setFocusAddCardFor(null);
  }, [focusAddCardFor]);

  const columns = useMemo(() => board?.columns ?? [], [board]);

  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  useEffect(() => {
    taskEventAtRef.current = {};
    boardEventAtRef.current = null;
  }, [boardId]);

  const shellStyle =
    workspaceCanvasStyle(workspaceTheme) ?? { background: BOARD_SHELL_BG };

  function setDragState(next: DragState | null) {
    dragRef.current = next;
    setDrag(next);
  }

  async function onAddColumn(e: React.FormEvent) {
    e.preventDefault();
    setAddingColumn(true);
    try {
      await createColumn({ boardId, name: columnName });
      toastSuccess("Column added");
      setColumnName("");
      await load();
    } catch (error) {
      toastFromError(error);
    } finally {
      setAddingColumn(false);
    }
  }

  async function onCreateTask(columnId: string) {
    const title = (draftByColumn[columnId] ?? "").trim();
    if (title.length < 3) {
      toastFromError(new Error("Task title must be at least 3 characters"));
      return;
    }
    setCreatingFor(columnId);
    try {
      const task = await createTask({ columnId, title });
      toastSuccess("Task created", task.code);
      setDraftByColumn((prev) => ({ ...prev, [columnId]: "" }));
      await load();
    } catch (error) {
      toastFromError(error);
    } finally {
      setCreatingFor(null);
    }
  }

  async function saveColumnName(columnId: string) {
    const name = editingName.trim();
    setEditingColumnId(null);
    if (name.length < 2) return;
    const current = columns.find((c) => c.id === columnId);
    if (!current || current.name === name) return;
    try {
      await updateColumn(columnId, { name });
      toastSuccess("List renamed");
      await load();
    } catch (error) {
      toastFromError(error);
    }
  }

  function onDragStart(e: React.DragEvent, task: TaskCard, columnId: string) {
    const payload = { taskId: task.id, sourceColumnId: columnId };
    const raw = JSON.stringify(payload);
    // text/plain is readable on drop across Safari/Firefox; keep json as fallback.
    e.dataTransfer.setData("text/plain", raw);
    e.dataTransfer.setData("application/json", raw);
    e.dataTransfer.effectAllowed = "move";

    const tasks = columns.find((c) => c.id === columnId)?.tasks ?? [];
    const idx = tasks.findIndex((t) => t.id === task.id);
    // Set ref sync for dragOver; defer React state so native drag is not cancelled.
    dragRef.current = {
      taskId: task.id,
      sourceColumnId: columnId,
      overColumnId: columnId,
      insertIndex: idx < 0 ? 0 : idx,
    };
    requestAnimationFrame(() => {
      if (dragRef.current?.taskId === task.id) {
        setDrag(dragRef.current);
      }
    });
  }

  function computeInsertIndex(
    e: React.DragEvent,
    column: BoardColumn,
    excludeTaskId: string,
  ) {
    const tasks = (column.tasks ?? []).filter((t) => t.id !== excludeTaskId);
    const list = e.currentTarget as HTMLElement;
    const cards = Array.from(
      list.querySelectorAll<HTMLElement>(
        "[data-task-card='true']:not([data-dragging='true'])",
      ),
    );
    for (let i = 0; i < cards.length; i += 1) {
      const rect = cards[i]!.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      if (e.clientY < mid) return i;
    }
    return tasks.length;
  }

  function onDragOverList(e: React.DragEvent, column: BoardColumn) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const current = dragRef.current;
    if (!current) return;
    const insertIndex = computeInsertIndex(e, column, current.taskId);
    if (
      current.overColumnId === column.id &&
      current.insertIndex === insertIndex
    ) {
      return;
    }
    setDragState({
      ...current,
      overColumnId: column.id,
      insertIndex,
    });
  }

  function readDragPayload(e: React.DragEvent) {
    const raw =
      e.dataTransfer.getData("text/plain") ||
      e.dataTransfer.getData("application/json");
    if (!raw) return null;
    try {
      return JSON.parse(raw) as { taskId: string; sourceColumnId: string };
    } catch {
      return null;
    }
  }

  async function onDropOnList(e: React.DragEvent, column: BoardColumn) {
    e.preventDefault();
    const current = dragRef.current;
    setDragState(null);

    const payload = readDragPayload(e) ?? (current
      ? {
          taskId: current.taskId,
          sourceColumnId: current.sourceColumnId,
        }
      : null);
    if (!payload?.taskId) return;

    const insertIndex =
      current?.overColumnId === column.id && current.insertIndex != null
        ? current.insertIndex
        : (column.tasks ?? []).filter((t) => t.id !== payload.taskId).length;

    const sourceTasks =
      columns.find((c) => c.id === payload.sourceColumnId)?.tasks ?? [];
    const fromIndex = sourceTasks.findIndex((t) => t.id === payload.taskId);
    // insertIndex is among tasks excluding the dragged card, so the only
    // no-op is inserting back into the hole left by that card (same index).
    if (payload.sourceColumnId === column.id && fromIndex === insertIndex) {
      return;
    }

    try {
      await moveTask(payload.taskId, {
        sourceColumnId: payload.sourceColumnId,
        destinationColumnId: column.id,
        newPosition: insertIndex,
      });
      await load();
    } catch (error) {
      toastFromError(error);
    }
  }

  function onDragEnd() {
    setDragState(null);
  }

  function applyTaskUpdate(updated: TaskCard) {
    setSelected(updated);
    setBoard((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        columns: prev.columns.map((col) => ({
          ...col,
          tasks: (col.tasks ?? []).map((t) =>
            t.id === updated.id ? { ...t, ...updated } : t,
          ),
        })),
      };
    });
  }

  function applyTaskCreated(task: TaskCard) {
    setBoard((prev) => {
      if (!prev) return prev;
      const exists = prev.columns.some((col) =>
        (col.tasks ?? []).some((item) => item.id === task.id),
      );
      if (exists) {
        return {
          ...prev,
          columns: prev.columns.map((col) => ({
            ...col,
            tasks: (col.tasks ?? []).map((item) =>
              item.id === task.id ? { ...item, ...task } : item,
            ),
          })),
        };
      }
      return {
        ...prev,
        tasksCount: (prev.tasksCount ?? 0) + 1,
        columns: prev.columns.map((col) => {
          if (col.id !== task.columnId) return col;
          const nextTasks = [...(col.tasks ?? []), task].sort(
            (a, b) => a.position - b.position,
          );
          return { ...col, tasks: nextTasks };
        }),
      };
    });
  }

  function applyTaskDeleted(taskId: string) {
    setSelected((prev) => (prev?.id === taskId ? null : prev));
    setBoard((prev) => {
      if (!prev) return prev;
      let removed = false;
      const nextColumns = prev.columns.map((col) => {
        const before = col.tasks ?? [];
        const after = before.filter((task) => task.id !== taskId);
        if (after.length !== before.length) removed = true;
        return { ...col, tasks: after };
      });
      if (!removed) return prev;
      return {
        ...prev,
        tasksCount: Math.max(0, (prev.tasksCount ?? 0) - 1),
        columns: nextColumns,
      };
    });
  }

  function applyTaskMoved(payload: TaskMovedPayload) {
    setBoard((prev) => {
      if (!prev) return prev;
      let movingTask: TaskCard | null = null;
      const removedColumns = prev.columns.map((col) => {
        const before = col.tasks ?? [];
        const after = before.filter((task) => {
          if (task.id !== payload.taskId) return true;
          movingTask = {
            ...task,
            columnId: payload.destinationColumnId,
            position: payload.newPosition,
          };
          return false;
        });
        return { ...col, tasks: after };
      });
      if (!movingTask) return prev;
      return {
        ...prev,
        columns: removedColumns.map((col) => {
          if (col.id !== payload.destinationColumnId) return col;
          const merged = [...(col.tasks ?? []), movingTask!].sort(
            (a, b) => a.position - b.position,
          );
          return { ...col, tasks: merged };
        }),
      };
    });
  }

  useEffect(() => {
    const socket = connectRealtime();
    const shouldAcceptTaskEvent = (taskId: string, occurredAt: string) => {
      const prev = taskEventAtRef.current[taskId];
      if (prev && occurredAt <= prev) return false;
      taskEventAtRef.current[taskId] = occurredAt;
      return true;
    };
    const onTaskMoved = (payload: TaskMovedPayload) => {
      if (payload.boardId !== boardId) return;
      if (!shouldAcceptTaskEvent(payload.taskId, payload.occurredAt)) return;
      const snapshot = boardRef.current;
      const hasTask = snapshot?.columns.some((col) =>
        (col.tasks ?? []).some((task) => task.id === payload.taskId),
      );
      if (!hasTask) {
        void load();
        return;
      }
      applyTaskMoved(payload);
    };
    const onTaskCreated = (payload: TaskCreatedPayload) => {
      if (payload.task.boardId !== boardId) return;
      if (!shouldAcceptTaskEvent(payload.task.id, payload.occurredAt)) return;
      const snapshot = boardRef.current;
      const hasColumn = snapshot?.columns.some(
        (col) => col.id === payload.task.columnId,
      );
      if (!hasColumn) {
        void load();
        return;
      }
      applyTaskCreated(payload.task as unknown as TaskCard);
    };
    const onTaskUpdated = (payload: TaskUpdatedPayload) => {
      if (payload.task.boardId !== boardId) return;
      if (!shouldAcceptTaskEvent(payload.task.id, payload.occurredAt)) return;
      const snapshot = boardRef.current;
      const hasTask = snapshot?.columns.some((col) =>
        (col.tasks ?? []).some((task) => task.id === payload.task.id),
      );
      if (!hasTask) {
        void load();
        return;
      }
      applyTaskUpdate(payload.task as unknown as TaskCard);
    };
    const onTaskDeleted = (payload: TaskDeletedPayload) => {
      if (payload.boardId !== boardId) return;
      if (!shouldAcceptTaskEvent(payload.taskId, payload.occurredAt)) return;
      const snapshot = boardRef.current;
      const hasTask = snapshot?.columns.some((col) =>
        (col.tasks ?? []).some((task) => task.id === payload.taskId),
      );
      if (!hasTask) {
        void load();
        return;
      }
      applyTaskDeleted(payload.taskId);
    };
    const onBoardChanged = (payload: BoardChangedPayload) => {
      if (payload.boardId !== boardId) return;
      if (
        boardEventAtRef.current &&
        payload.occurredAt <= boardEventAtRef.current
      ) {
        return;
      }
      boardEventAtRef.current = payload.occurredAt;
      void load();
    };
    socket.on(SERVER_EVENT.BOARD_CHANGED, onBoardChanged);
    socket.on(SERVER_EVENT.TASK_CREATED, onTaskCreated);
    socket.on(SERVER_EVENT.TASK_MOVED, onTaskMoved);
    socket.on(SERVER_EVENT.TASK_UPDATED, onTaskUpdated);
    socket.on(SERVER_EVENT.TASK_DELETED, onTaskDeleted);
    const onMeetingCreated = (payload: MeetingCreatedPayload) => {
      if (payload.meeting.boardId !== boardId) return;
      setActiveMeeting({
        ...payload.meeting,
        participants: payload.participants,
      });
    };
    const onMeetingParticipants = (payload: MeetingParticipantsPayload) => {
      if (payload.boardId !== boardId) return;
      setActiveMeeting((prev) => {
        if (!prev || prev.id !== payload.meetingId) return prev;
        return { ...prev, participants: payload.participants };
      });
    };
    const onMeetingJoined = (payload: MeetingJoinedPayload) => {
      if (payload.boardId !== boardId) return;
      if (payload.actorId !== meId) {
        toastSuccess(`${payload.participant.fullName} joined the meeting`);
      }
    };
    const onMeetingLeft = (payload: MeetingLeftPayload) => {
      if (payload.boardId !== boardId) return;
      if (payload.actorId !== meId) {
        toastSuccess(`${payload.participant.fullName} left the meeting`);
      }
    };
    const onMeetingEnded = (payload: MeetingEndedPayload) => {
      if (payload.boardId !== boardId) return;
      setCallMinimized(false);
      setActiveMeeting((prev) =>
        prev && prev.id === payload.meetingId
          ? { ...prev, status: "ENDED", endedAt: payload.occurredAt, participants: [] }
          : prev,
      );
      if (payload.endedBy !== meId) {
        toastSuccess("Meeting ended");
      }
      void loadActiveMeeting();
    };
    socket.on(SERVER_EVENT.MEETING_CREATED, onMeetingCreated);
    socket.on(SERVER_EVENT.MEETING_JOINED, onMeetingJoined);
    socket.on(SERVER_EVENT.MEETING_LEFT, onMeetingLeft);
    socket.on(SERVER_EVENT.MEETING_PARTICIPANTS, onMeetingParticipants);
    socket.on(SERVER_EVENT.MEETING_ENDED, onMeetingEnded);
    return () => {
      socket.off(SERVER_EVENT.BOARD_CHANGED, onBoardChanged);
      socket.off(SERVER_EVENT.TASK_CREATED, onTaskCreated);
      socket.off(SERVER_EVENT.TASK_MOVED, onTaskMoved);
      socket.off(SERVER_EVENT.TASK_UPDATED, onTaskUpdated);
      socket.off(SERVER_EVENT.TASK_DELETED, onTaskDeleted);
      socket.off(SERVER_EVENT.MEETING_CREATED, onMeetingCreated);
      socket.off(SERVER_EVENT.MEETING_JOINED, onMeetingJoined);
      socket.off(SERVER_EVENT.MEETING_LEFT, onMeetingLeft);
      socket.off(SERVER_EVENT.MEETING_PARTICIPANTS, onMeetingParticipants);
      socket.off(SERVER_EVENT.MEETING_ENDED, onMeetingEnded);
    };
  }, [boardId, load, loadActiveMeeting, meId]);

  async function onStartMeeting() {
    if (meetingBusy) return;
    setMeetingBusy(true);
    try {
      const created = await startMeeting(boardId);
      setActiveMeeting(created);
      setCallMinimized(false);
      toastSuccess("Meeting started");
    } catch (error) {
      toastFromError(error);
      await loadActiveMeeting();
    } finally {
      setMeetingBusy(false);
    }
  }

  async function onJoinMeeting() {
    if (!activeMeeting || meetingBusy) return;
    setMeetingBusy(true);
    try {
      const joined = await joinMeeting(activeMeeting.id);
      setActiveMeeting({
        ...joined.meeting,
        participants: joined.participants,
      });
      setCallMinimized(false);
      toastSuccess("Joined meeting");
    } catch (error) {
      toastFromError(error);
    } finally {
      setMeetingBusy(false);
    }
  }

  async function onLeaveMeeting() {
    if (!activeMeeting || meetingBusy) return;
    setMeetingBusy(true);
    try {
      await leaveMeeting(activeMeeting.id);
      await loadActiveMeeting();
      setCallMinimized(false);
      toastSuccess("Left meeting");
    } catch (error) {
      toastFromError(error);
    } finally {
      setMeetingBusy(false);
    }
  }

  async function onEndMeeting() {
    if (!activeMeeting || meetingBusy) return;
    const ok = await confirm({
      title: "End meeting?",
      description: "This will close the active board meeting for everyone.",
      confirmLabel: "End meeting",
      tone: "danger",
    });
    if (!ok) return;
    setMeetingBusy(true);
    try {
      await endMeeting(activeMeeting.id);
      setActiveMeeting(null);
      setCallMinimized(false);
      toastSuccess("Meeting ended");
    } catch (error) {
      toastFromError(error);
    } finally {
      setMeetingBusy(false);
    }
  }

  async function onDeleteTask() {
    if (!selected) return;
    const ok = await confirm({
      title: "Delete task?",
      description: `Delete task ${selected.code}? This cannot be undone.`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await deleteTask(selected.id);
      toastSuccess("Task deleted");
      setSelected(null);
      await load();
    } catch (error) {
      toastFromError(error);
    }
  }

  async function onSwitchBoard(nextBoardId: string) {
    if (nextBoardId === boardId || switchingBoard) return;
    setSwitchingBoard(true);
    try {
      router.prefetch(`/boards/${nextBoardId}`);
      await canvasRef.current?.switchTo(
        nextBoardId,
        (id) => {
          router.push(`/boards/${id}`);
        },
        workspaceCanvasBackground(workspaceTheme),
      );
    } finally {
      setTimeout(() => setSwitchingBoard(false), 600);
    }
  }

  function renderTaskList(column: BoardColumn) {
    const tasks = column.tasks ?? [];
    const isOver = drag?.overColumnId === column.id;
    const draggingId = drag?.taskId;
    let insertIndex = isOver ? drag?.insertIndex : null;

    // insertIndex is among tasks excluding the dragged card; map to full-list index for UI.
    if (
      insertIndex != null &&
      draggingId &&
      drag?.sourceColumnId === column.id
    ) {
      const fromIndex = tasks.findIndex((t) => t.id === draggingId);
      if (fromIndex >= 0 && insertIndex > fromIndex) {
        insertIndex += 1;
      }
    }

    const nodes: React.ReactNode[] = [];

    for (let i = 0; i <= tasks.length; i += 1) {
      if (isOver && insertIndex === i) {
        nodes.push(
          <div
            key={`slot-${column.id}-${i}`}
            className="h-[52px] rounded-lg border-2 border-dashed border-bb-blue/50 bg-bb-blue/10"
          />,
        );
      }
      const task = tasks[i];
      if (!task) continue;

      const isDragging = draggingId === task.id;
      nodes.push(
        <article
          key={task.id}
          data-task-card="true"
          data-dragging={isDragging ? "true" : undefined}
          draggable
          onDragStart={(e) => onDragStart(e, task, column.id)}
          onDragEnd={onDragEnd}
          onClick={() => {
            if (!dragRef.current) setSelected(task);
          }}
          className={`cursor-grab rounded-lg border border-transparent bg-white px-3 py-2.5 shadow-sm transition hover:border-bb-blue/40 active:cursor-grabbing ${
            isDragging ? "opacity-40 ring-2 ring-bb-blue/30" : ""
          }`}
        >
          {task.labels.length > 0 ? (
            <div className="mb-2 flex flex-wrap gap-1">
              {task.labels.map((label) => (
                <span
                  key={label.id}
                  className="h-2 w-10 rounded-full"
                  style={{ background: label.color }}
                  title={label.name}
                />
              ))}
            </div>
          ) : null}
          <p className="text-sm font-semibold text-bb-ink">{task.title}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-bb-muted">
              {task.code}
            </span>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${PRIORITY_STYLE[task.priority]}`}
            >
              {task.priority}
            </span>
            {task.dueDate ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-bb-muted">
                <Calendar className="h-3 w-3" aria-hidden />
                {new Date(task.dueDate).toLocaleDateString()}
              </span>
            ) : null}
            {task.checklistProgress && task.checklistProgress.total > 0 ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-bb-muted">
                <CheckSquare className="h-3 w-3" aria-hidden />
                {task.checklistProgress.completed}/{task.checklistProgress.total}
              </span>
            ) : null}
            {(task.commentsCount ?? 0) > 0 ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-bb-muted">
                <MessageSquare className="h-3 w-3" aria-hidden />
                {task.commentsCount}
              </span>
            ) : null}
            {(task.attachmentsCount ?? 0) > 0 ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-bb-muted">
                <Paperclip className="h-3 w-3" aria-hidden />
                {task.attachmentsCount}
              </span>
            ) : null}
            {task.isPinned ? (
              <span
                title="Pinned"
                className="inline-flex text-amber-700"
                aria-label="Pinned"
              >
                <Pin className="h-3.5 w-3.5" aria-hidden />
              </span>
            ) : null}
            {task.isWatching ? (
              <span
                title="Watching"
                className="inline-flex text-bb-blue"
                aria-label="Watching"
              >
                <Eye className="h-3.5 w-3.5" aria-hidden />
              </span>
            ) : null}
          </div>
          {task.assignees.length > 0 ? (
            <div className="mt-2 flex -space-x-1.5">
              {task.assignees.slice(0, 3).map((a) => (
                <span
                  key={a.workspaceMemberId}
                  title={a.user.fullName}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-bb-blue text-[10px] font-bold text-white ring-2 ring-white"
                >
                  {a.user.fullName
                    .split(" ")
                    .map((p) => p[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
              ))}
            </div>
          ) : null}
        </article>,
      );
    }

    return nodes;
  }

  if (!board) {
    const switching = peekBoardSwitchPending();
    return (
      <AppShell chrome="none" theme={workspaceTheme}>
        <div
          className="flex min-h-screen items-center justify-center text-sm text-bb-muted"
          style={shellStyle}
        >
          {switching ? null : "Loading board..."}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell chrome="none" theme={workspaceTheme}>
    <div className="flex min-h-screen flex-col" style={shellStyle}>
      <header className="flex items-center justify-between gap-4 px-4 py-3 text-bb-ink">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href={`/projects/${board.projectId}`}
            className={buttonClassName({
              variant: "secondary",
              size: "sm",
              className: "px-2.5",
            })}
            aria-label="Back to project"
            title="Back to project"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2} aria-hidden />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold">{board.name}</h1>
            <p className="truncate text-xs text-bb-muted">
              {board.project?.name ?? "Board"} · {board.columns.length} columns ·{" "}
              {board.tasksCount ?? 0} tasks
            </p>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-bb-muted">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  rtStatus === "connected"
                    ? "bg-emerald-500"
                    : rtStatus === "reconnecting" || rtStatus === "connecting"
                      ? "bg-amber-500"
                      : "bg-slate-400"
                }`}
              />
              <span>
                {rtStatus === "connected"
                  ? "Realtime connected"
                  : rtStatus === "reconnecting" || rtStatus === "connecting"
                    ? "Realtime reconnecting..."
                    : "Realtime offline"}
              </span>
              {otherPresence.length > 0 ? <span>· {otherPresence.length} online</span> : null}
              {activeMeeting?.status === "ACTIVE" ? (
                <span>· Meeting live ({activeParticipants.length})</span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeMeeting?.status === "ACTIVE" ? (
            <>
              {activeParticipants.length > 0 ? (
                <div className="hidden items-center -space-x-1.5 sm:flex">
                  {activeParticipants.slice(0, 4).map((participant) =>
                    participant.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={participant.userId}
                        src={participant.avatar}
                        alt={participant.fullName}
                        title={`${participant.fullName}${participant.isHost ? " (Host)" : ""}`}
                        className="h-7 w-7 rounded-full object-cover ring-2 ring-white"
                      />
                    ) : (
                      <span
                        key={participant.userId}
                        title={`${participant.fullName}${participant.isHost ? " (Host)" : ""}`}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white ring-2 ring-white"
                      >
                        {participant.fullName
                          .split(" ")
                          .map((p) => p[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>
                    ),
                  )}
                </div>
              ) : null}
              {isInMeeting ? (
                <button
                  type="button"
                  disabled={meetingBusy}
                  aria-label="Leave meeting"
                  title="Leave meeting"
                  onClick={() => void onLeaveMeeting()}
                  className={buttonClassName({
                    variant: "secondary",
                    size: "sm",
                    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
                  })}
                >
                  <LogOut className="h-4 w-4" strokeWidth={2} aria-hidden />
                  Leave
                </button>
              ) : (
                <button
                  type="button"
                  disabled={meetingBusy}
                  aria-label="Join meeting"
                  title="Join meeting"
                  onClick={() => void onJoinMeeting()}
                  className={buttonClassName({
                    variant: "secondary",
                    size: "sm",
                    className: "border-bb-blue/30 bg-bb-sky text-bb-blue",
                  })}
                >
                  <LogIn className="h-4 w-4" strokeWidth={2} aria-hidden />
                  Join
                </button>
              )}
              <button
                type="button"
                disabled={meetingBusy}
                aria-label="End meeting"
                title="End meeting"
                onClick={() => void onEndMeeting()}
                className={buttonClassName({
                  variant: "secondary",
                  size: "sm",
                  className: "border-red-200 bg-red-50 text-red-700",
                })}
              >
                <PhoneOff className="h-4 w-4" strokeWidth={2} aria-hidden />
                End
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={meetingBusy}
              aria-label="Start meeting"
              title="Start meeting"
              onClick={() => void onStartMeeting()}
              className={buttonClassName({
                variant: "secondary",
                size: "sm",
                className: "border-bb-blue/30 bg-bb-sky text-bb-blue",
              })}
            >
              <Video className="h-4 w-4" strokeWidth={2} aria-hidden />
              Meet
            </button>
          )}
          {otherPresence.length > 0 ? (
            <div className="hidden items-center -space-x-1.5 sm:flex">
              {otherPresence.slice(0, 4).map((member) =>
                member.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={member.id}
                    src={member.avatar}
                    alt={member.fullName}
                    title={member.fullName}
                    className="h-7 w-7 rounded-full object-cover ring-2 ring-white"
                  />
                ) : (
                  <span
                    key={member.id}
                    title={member.fullName}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-bb-blue text-[10px] font-bold text-white ring-2 ring-white"
                  >
                    {member.fullName
                      .split(" ")
                      .map((p) => p[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </span>
                ),
              )}
            </div>
          ) : null}
          {board.project?.workspaceId ? (
            <>
              <button
                type="button"
                aria-label="Share board"
                title="Share"
                onClick={() => setShareOpen(true)}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition ${
                  shareOpen
                    ? "border-bb-blue bg-bb-sky text-bb-blue"
                    : "border-bb-border bg-white text-bb-ink hover:bg-bb-sky"
                }`}
              >
                <Share2 className="h-4 w-4" strokeWidth={2} aria-hidden />
              </button>
              <BoardActivityButton
                workspaceId={board.project.workspaceId}
                boardId={boardId}
                projectId={board.projectId}
              />
            </>
          ) : null}
          <NotificationBell />
          <UserAvatarMenu />
        </div>
      </header>

      <BoardCanvasTransition
        ref={canvasRef}
        boardId={boardId}
        className="flex min-h-0 flex-1 flex-col"
        coverBackground={workspaceCanvasBackground(workspaceTheme)}
      >
      <div className="flex flex-1 gap-3 overflow-x-auto px-4 pb-2">
        {columns.map((column) => {
          const tasks = column.tasks ?? [];
          const isOver = drag?.overColumnId === column.id;
          return (
            <section
              key={column.id}
              data-board-column="true"
              className={`relative flex h-fit w-72 shrink-0 flex-col rounded-xl bg-[#F1F2F4] shadow-bb ${
                isOver ? "ring-2 ring-bb-blue/50" : ""
              }`}
            >
              <div className="relative flex items-center gap-1 px-2 py-2">
                {editingColumnId === column.id ? (
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="!h-8 !bg-white !px-2 !text-sm !font-bold"
                    autoFocus
                    onBlur={() => void saveColumnName(column.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void saveColumnName(column.id);
                      }
                      if (e.key === "Escape") setEditingColumnId(null);
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    className="min-w-0 flex-1 truncate rounded-md px-2 py-1.5 text-left text-sm font-bold text-bb-ink hover:bg-black/5"
                    onClick={() => {
                      setEditingColumnId(column.id);
                      setEditingName(column.name);
                    }}
                  >
                    {column.name}
                  </button>
                )}
                <span className="rounded-md bg-black/5 px-2 py-0.5 text-xs font-semibold text-bb-muted">
                  {tasks.length}
                </span>
                <ColumnMenuTrigger
                  onClick={() =>
                    setMenuColumnId((id) =>
                      id === column.id ? null : column.id,
                    )
                  }
                />
                {menuColumnId === column.id ? (
                  <ColumnMenu
                    column={{ ...column, boardId: boardId }}
                    columns={columns}
                    boards={projectBoards}
                    onClose={() => setMenuColumnId(null)}
                    onAddCard={() => {
                      setFocusAddCardFor(column.id);
                    }}
                    onCopy={async (name) => {
                      await copyColumn(column.id, name);
                      toastSuccess("List copied");
                      await load();
                    }}
                    onMove={async (targetBoardId, position) => {
                      await moveColumn(column.id, {
                        boardId: targetBoardId,
                        position,
                      });
                      toastSuccess("List moved");
                      if (targetBoardId !== boardId) {
                        void onSwitchBoard(targetBoardId);
                        return;
                      }
                      await load();
                    }}
                    onMoveCards={async (destinationColumnId) => {
                      const result = await moveColumnTasks(
                        column.id,
                        destinationColumnId,
                      );
                      toastSuccess(result.message);
                      await load();
                    }}
                    onSort={async (sortBy) => {
                      await sortColumn(column.id, sortBy);
                      toastSuccess("List sorted");
                      await load();
                    }}
                    onArchive={async () => {
                      const ok = await confirm({
                        title: "Archive list?",
                        description: `Archive “${column.name}”? Cards in this list will be archived with it.`,
                        confirmLabel: "Archive",
                        tone: "danger",
                      });
                      if (!ok) return;
                      await archiveColumn(column.id);
                      toastSuccess("List archived");
                      await load();
                    }}
                  />
                ) : null}
              </div>

              <div
                className="flex max-h-[calc(100vh-14rem)] flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2"
                onDragOver={(e) => onDragOverList(e, column)}
                onDrop={(e) => void onDropOnList(e, column)}
              >
                {renderTaskList(column)}
              </div>

              <div className="space-y-2 border-t border-black/5 px-2 py-2">
                <Input
                  ref={(el: HTMLInputElement | null) => {
                    addCardRefs.current[column.id] = el;
                  }}
                  value={draftByColumn[column.id] ?? ""}
                  onChange={(e) =>
                    setDraftByColumn((prev) => ({
                      ...prev,
                      [column.id]: e.target.value,
                    }))
                  }
                  placeholder="Add a card"
                  className="!bg-white !text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void onCreateTask(column.id);
                    }
                  }}
                />
                <button
                  type="button"
                  disabled={creatingFor === column.id}
                  onClick={() => void onCreateTask(column.id)}
                  className={buttonClassName({
                    variant: "ghost",
                    size: "sm",
                    fullWidth: true,
                  })}
                >
                  <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
                  {creatingFor === column.id ? "Adding..." : "Add card"}
                </button>
              </div>
            </section>
          );
        })}

        <form
          onSubmit={onAddColumn}
          className="flex h-fit w-72 shrink-0 flex-col gap-2 rounded-xl border border-bb-border/80 bg-bb-surface p-3 shadow-bb"
        >
          <Input
            value={columnName}
            onChange={(e) => setColumnName(e.target.value)}
            placeholder="Add another list"
            required
            minLength={2}
          />
          <button
            type="submit"
            disabled={addingColumn}
            className={buttonClassName({ variant: "primary", size: "sm" })}
          >
            <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
            {addingColumn ? "Adding..." : "Add list"}
          </button>
        </form>
      </div>

      <SwitchBoardsBar
        currentBoardId={boardId}
        onSwitchBoard={(id) => void onSwitchBoard(id)}
        disabled={switchingBoard}
      />
      </BoardCanvasTransition>
      {selected && board ? (
        <TaskDetailModal
          task={selected}
          boardId={boardId}
          workspaceId={board.project?.workspaceId ?? null}
          projectId={board.project?.id ?? null}
          onClose={() => setSelected(null)}
          onChange={applyTaskUpdate}
          onDeleted={() => void onDeleteTask()}
          onDuplicated={async () => {
            await load();
          }}
          onChecklistProgress={(progress) => {
            const checklistProgress = progress
              ? {
                  ...progress,
                  progress:
                    progress.total === 0
                      ? 0
                      : Math.round(
                          (progress.completed / progress.total) * 100,
                        ),
                }
              : null;
            setSelected((prev) =>
              prev ? { ...prev, checklistProgress } : prev,
            );
            setBoard((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                columns: prev.columns.map((col) => ({
                  ...col,
                  tasks: (col.tasks ?? []).map((t) =>
                    t.id === selected.id
                      ? { ...t, checklistProgress }
                      : t,
                  ),
                })),
              };
            });
          }}
          onAttachmentsCount={(count) => {
            setSelected((prev) =>
              prev ? { ...prev, attachmentsCount: count } : prev,
            );
            setBoard((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                columns: prev.columns.map((col) => ({
                  ...col,
                  tasks: (col.tasks ?? []).map((t) =>
                    t.id === selected.id
                      ? { ...t, attachmentsCount: count }
                      : t,
                  ),
                })),
              };
            });
          }}
          onCommentsCount={(count) => {
            setSelected((prev) =>
              prev ? { ...prev, commentsCount: count } : prev,
            );
            setBoard((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                columns: prev.columns.map((col) => ({
                  ...col,
                  tasks: (col.tasks ?? []).map((t) =>
                    t.id === selected.id
                      ? { ...t, commentsCount: count }
                      : t,
                  ),
                })),
              };
            });
          }}
        />
      ) : null}
      {board.project?.workspaceId ? (
        <BoardShareModal
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          boardId={boardId}
          boardName={board.name}
          workspaceId={board.project.workspaceId}
        />
      ) : null}
      {activeMeeting?.status === "ACTIVE" && isInMeeting ? (
        <MeetingCallModal
          open={activeMeeting.status === "ACTIVE" && isInMeeting}
          minimized={callMinimized}
          meName={meName}
          meeting={activeMeeting}
          localStream={webrtc.localStream}
          remotePeers={webrtc.remotePeers}
          activeScreenShare={webrtc.activeScreenShare}
          audioEnabled={webrtc.audioEnabled}
          videoEnabled={webrtc.videoEnabled}
          screenSharing={webrtc.screenSharing}
          onToggleAudio={webrtc.toggleAudio}
          onToggleVideo={webrtc.toggleVideo}
          onStartScreenShare={webrtc.startScreenShare}
          onStopScreenShare={webrtc.stopScreenShare}
          onLeave={onLeaveMeeting}
          onToggleMinimize={() => setCallMinimized((prev) => !prev)}
        />
      ) : null}
    </div>
    </AppShell>
  );
}

export default function BoardPage() {
  return <BoardViewContent />;
}
