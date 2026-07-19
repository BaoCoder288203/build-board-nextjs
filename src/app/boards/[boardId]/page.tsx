"use client";

import {
  ArrowLeft,
  Calendar,
  LogOut,
  Plus,
  Trash2,
  X,
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
import { Protected } from "@/components/protected";
import { Button, buttonClassName } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BOARD_SHELL_BG,
  peekBoardSwitchPending,
} from "@/lib/board-transition";
import { toastFromError, toastSuccess } from "@/lib/toast";
import {
  archiveColumn,
  copyColumn,
  createColumn,
  fetchBoard,
  fetchBoards,
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
  updateTask,
  type TaskCard,
  type TaskPriority,
} from "@/lib/tasks";
import { useAuthStore } from "@/stores/auth-store";

const PRIORITY_STYLE: Record<TaskPriority, string> = {
  LOW: "bg-slate-100 text-slate-700",
  MEDIUM: "bg-sky-100 text-sky-800",
  HIGH: "bg-amber-100 text-amber-900",
  URGENT: "bg-red-100 text-red-800",
};

type DragState = {
  taskId: string;
  sourceColumnId: string;
  overColumnId: string | null;
  insertIndex: number | null;
};

function BoardViewContent() {
  const params = useParams<{ boardId: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const boardId = params.boardId;

  const [board, setBoard] = useState<BoardDetail | null>(null);
  const [projectBoards, setProjectBoards] = useState<BoardSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [columnName, setColumnName] = useState("");
  const [addingColumn, setAddingColumn] = useState(false);
  const [draftByColumn, setDraftByColumn] = useState<Record<string, string>>({});
  const [creatingFor, setCreatingFor] = useState<string | null>(null);
  const [selected, setSelected] = useState<TaskCard | null>(null);
  const [savingDetail, setSavingDetail] = useState(false);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [menuColumnId, setMenuColumnId] = useState<string | null>(null);
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [focusAddCardFor, setFocusAddCardFor] = useState<string | null>(null);
  const [switchingBoard, setSwitchingBoard] = useState(false);
  const addCardRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const dragRef = useRef<DragState | null>(null);
  const canvasRef = useRef<BoardCanvasHandle>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchBoard(boardId);
      setBoard(data);
      setSelected((prev) => {
        if (!prev) return null;
        const flat = data.columns.flatMap((c) => c.tasks ?? []);
        return flat.find((t) => t.id === prev.id) ?? null;
      });
      if (data.projectId) {
        const boards = await fetchBoards(data.projectId);
        setProjectBoards(boards.items);
      }
    } catch (error) {
      toastFromError(error);
      router.replace("/dashboard");
    } finally {
      setLoading(false);
    }
  }, [boardId, router]);

  useEffect(() => {
    setLoading(true);
    setBoard(null);
    setSelected(null);
    setDrag(null);
    dragRef.current = null;
    void load();
  }, [load]);

  useEffect(() => {
    if (!focusAddCardFor) return;
    addCardRefs.current[focusAddCardFor]?.focus();
    setFocusAddCardFor(null);
  }, [focusAddCardFor]);

  const columns = useMemo(() => board?.columns ?? [], [board]);

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

  async function onSaveDetail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;
    const form = new FormData(e.currentTarget);
    setSavingDetail(true);
    try {
      const dueRaw = String(form.get("dueDate") ?? "");
      const updated = await updateTask(selected.id, {
        title: String(form.get("title") ?? selected.title),
        description: String(form.get("description") ?? "") || null,
        priority: String(form.get("priority") ?? selected.priority) as TaskPriority,
        dueDate: dueRaw ? new Date(dueRaw).toISOString() : null,
      });
      setSelected(updated);
      toastSuccess("Task updated");
      await load();
    } catch (error) {
      toastFromError(error);
    } finally {
      setSavingDetail(false);
    }
  }

  async function onDeleteTask() {
    if (!selected) return;
    if (!window.confirm(`Delete task ${selected.code}?`)) return;
    try {
      await deleteTask(selected.id);
      toastSuccess("Task deleted");
      setSelected(null);
      await load();
    } catch (error) {
      toastFromError(error);
    }
  }

  async function onLogout() {
    await logout();
    router.replace("/");
  }

  async function onSwitchBoard(nextBoardId: string) {
    if (nextBoardId === boardId || switchingBoard) return;
    setSwitchingBoard(true);
    try {
      router.prefetch(`/boards/${nextBoardId}`);
      await canvasRef.current?.switchTo(nextBoardId, (id) => {
        router.push(`/boards/${id}`);
      });
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

  if (loading || !board) {
    const switching = peekBoardSwitchPending();
    return (
      <div
        className={`flex min-h-screen items-center justify-center text-sm ${
          switching
            ? "bg-[#0079BF] text-white/80"
            : "bg-bb-canvas text-bb-muted"
        }`}
        style={switching ? { background: BOARD_SHELL_BG } : undefined}
      >
        {switching ? null : "Loading board..."}
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ background: BOARD_SHELL_BG }}
    >
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
              {board.project?.name ?? "Board"} · {board.columns.length} columns ·{" "}
              {board.tasksCount ?? 0} tasks
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="onDark"
            size="sm"
            onClick={onLogout}
            className="!text-bb-blue"
            title={user?.fullName}
          >
            <LogOut className="h-4 w-4" strokeWidth={2} aria-hidden />
            Sign out
          </Button>
        </div>
      </header>

      <BoardCanvasTransition
        ref={canvasRef}
        boardId={boardId}
        className="flex min-h-0 flex-1 flex-col"
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
                isOver ? "ring-2 ring-white/80" : ""
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
            disabled={addingColumn}
            className={buttonClassName({ variant: "onDark", size: "sm" })}
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
      {selected ? (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/40">
          <button
            type="button"
            aria-label="Close task detail"
            className="flex-1"
            onClick={() => setSelected(null)}
          />
          <aside className="flex h-full w-full max-w-md flex-col bg-white shadow-bb-lg">
            <div className="flex items-start justify-between gap-3 border-b border-bb-border px-5 py-4">
              <div>
                <p className="text-xs font-semibold text-bb-muted">{selected.code}</p>
                <h2 className="mt-1 text-lg font-bold text-bb-ink">Task details</h2>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg p-1.5 text-bb-muted hover:bg-bb-sky"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <form
              onSubmit={onSaveDetail}
              className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-4"
            >
              <label className="block text-sm font-semibold text-bb-ink">
                Title
                <Input
                  name="title"
                  defaultValue={selected.title}
                  required
                  minLength={3}
                  className="mt-1.5"
                />
              </label>
              <label className="block text-sm font-semibold text-bb-ink">
                Description
                <textarea
                  name="description"
                  defaultValue={selected.description ?? ""}
                  rows={5}
                  className="mt-1.5 w-full rounded-[10px] border border-bb-border bg-white px-3 py-2 text-sm text-bb-ink outline-none focus:border-bb-blue"
                />
              </label>
              <label className="block text-sm font-semibold text-bb-ink">
                Priority
                <select
                  name="priority"
                  defaultValue={selected.priority}
                  className="mt-1.5 h-10 w-full rounded-[10px] border border-bb-border bg-white px-3 text-sm"
                >
                  {(["LOW", "MEDIUM", "HIGH", "URGENT"] as TaskPriority[]).map(
                    (p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <label className="block text-sm font-semibold text-bb-ink">
                Due date
                <Input
                  name="dueDate"
                  type="date"
                  className="mt-1.5"
                  defaultValue={
                    selected.dueDate
                      ? new Date(selected.dueDate).toISOString().slice(0, 10)
                      : ""
                  }
                />
              </label>
              <div className="mt-auto flex gap-2 pt-2">
                <Button type="submit" fullWidth disabled={savingDetail}>
                  {savingDetail ? "Saving..." : "Save changes"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void onDeleteTask()}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}
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
