"use client";

import {
  Calendar,
  CheckSquare,
  Copy,
  Eye,
  EyeOff,
  Paperclip,
  Pin,
  PinOff,
  Tag,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { TaskAssigneesPanel } from "@/components/board/task-assignees-panel";
import { TaskAttachmentPanel } from "@/components/board/task-attachment-panel";
import { TaskChecklistPanel } from "@/components/board/task-checklist-panel";
import { TaskCommentPanel } from "@/components/board/task-comment-panel";
import { TaskDoneCheckbox } from "@/components/board/task-done-checkbox";
import { TaskLabelsPanel } from "@/components/board/task-labels-panel";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Input } from "@/components/ui/input";
import { createChecklist } from "@/lib/checklists";
import { toastFromError, toastSuccess } from "@/lib/toast";
import {
  duplicateTask,
  pinTask,
  unwatchTask,
  updateTask,
  watchTask,
  type TaskCard,
  type TaskPriority,
} from "@/lib/tasks";

type ActionKey =
  | "due"
  | "assignees"
  | "labels"
  | "checklist"
  | "attachments"
  | null;

type Props = {
  task: TaskCard;
  boardId?: string | null;
  workspaceId?: string | null;
  projectId?: string | null;
  onClose: () => void;
  onChange: (task: TaskCard) => void;
  onDeleted: () => void | Promise<void>;
  onDuplicated?: () => void | Promise<void>;
  onChecklistProgress?: (progress: {
    completed: number;
    total: number;
  } | null) => void;
  onAttachmentsCount?: (count: number) => void;
  onCommentsCount?: (count: number) => void;
};

function ActionBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseDown={(e) => e.stopPropagation()}
      aria-pressed={active}
      className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition ${
        active
          ? "border-bb-blue bg-bb-sky text-bb-blue"
          : "border-bb-border bg-white text-bb-ink hover:border-bb-blue/40 hover:bg-bb-sky/50"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function Popover({
  open,
  onClose,
  children,
  className = "",
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    let remove: (() => void) | undefined;
    const timer = window.setTimeout(() => {
      function onDoc(e: MouseEvent) {
        if (ref.current && !ref.current.contains(e.target as Node)) onClose();
      }
      function onKey(e: KeyboardEvent) {
        if (e.key === "Escape") onClose();
      }
      document.addEventListener("mousedown", onDoc);
      document.addEventListener("keydown", onKey);
      remove = () => {
        document.removeEventListener("mousedown", onDoc);
        document.removeEventListener("keydown", onKey);
      };
    }, 0);
    return () => {
      window.clearTimeout(timer);
      remove?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      ref={ref}
      className={`absolute left-0 top-full z-20 mt-2 w-[min(100%,320px)] rounded-xl border border-bb-border bg-white p-3 shadow-bb-lg ${className}`}
      role="dialog"
    >
      {children}
    </div>
  );
}

export function TaskDetailModal({
  task,
  boardId,
  workspaceId,
  projectId,
  onClose,
  onChange,
  onDeleted,
  onDuplicated,
  onChecklistProgress,
  onAttachmentsCount,
  onCommentsCount,
}: Props) {
  const titleId = useId();
  const [action, setAction] = useState<ActionKey>(null);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [dueDate, setDueDate] = useState(
    task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : "",
  );
  const [descOpen, setDescOpen] = useState(Boolean(task.description));
  const [checklistTitle, setChecklistTitle] = useState("");
  const [addingChecklist, setAddingChecklist] = useState(false);
  const [checklistKey, setChecklistKey] = useState(0);
  const [attachmentKey, setAttachmentKey] = useState(0);
  const [actionBusy, setActionBusy] = useState<"watch" | "pin" | "duplicate" | "done" | null>(null);

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description ?? "");
    setPriority(task.priority);
    setDueDate(
      task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : "",
    );
  }, [task.id, task.title, task.description, task.priority, task.dueDate]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !action) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [action, onClose]);

  const toggleAction = useCallback((key: ActionKey) => {
    setAction((prev) => (prev === key ? null : key));
  }, []);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await updateTask(task.id, {
        title: title.trim(),
        description: description.trim() || null,
        priority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      });
      onChange(updated);
      toastSuccess("Task updated");
    } catch (error) {
      toastFromError(error);
    } finally {
      setSaving(false);
    }
  }

  async function onCreateChecklist(e: React.FormEvent) {
    e.preventDefault();
    const next = checklistTitle.trim();
    if (next.length < 2) return;
    setAddingChecklist(true);
    try {
      await createChecklist({ taskId: task.id, title: next });
      setChecklistTitle("");
      setChecklistKey((k) => k + 1);
      setAction(null);
      toastSuccess("Checklist added");
    } catch (error) {
      toastFromError(error);
    } finally {
      setAddingChecklist(false);
    }
  }

  async function persistDue(next: string) {
    setDueDate(next);
    try {
      const updated = await updateTask(task.id, {
        dueDate: next ? new Date(next).toISOString() : null,
      });
      onChange(updated);
      setAction(null);
      toastSuccess(next ? "Due date set" : "Due date cleared");
    } catch (error) {
      toastFromError(error);
    }
  }

  async function onToggleWatch() {
    setActionBusy("watch");
    try {
      const updated = task.isWatching
        ? await unwatchTask(task.id)
        : await watchTask(task.id);
      onChange(updated);
      toastSuccess(updated.isWatching ? "Watching this task" : "Stopped watching");
    } catch (error) {
      toastFromError(error);
    } finally {
      setActionBusy(null);
    }
  }

  async function onTogglePin() {
    setActionBusy("pin");
    try {
      const updated = await pinTask(task.id, !task.isPinned);
      onChange(updated);
      toastSuccess(updated.isPinned ? "Task pinned" : "Task unpinned");
    } catch (error) {
      toastFromError(error);
    } finally {
      setActionBusy(null);
    }
  }

  async function onToggleDone() {
    setActionBusy("done");
    try {
      const next = task.status === "DONE" ? "TODO" : "DONE";
      const updated = await updateTask(task.id, { status: next });
      onChange(updated);
      toastSuccess(next === "DONE" ? "Marked as done" : "Marked as not done");
    } catch (error) {
      toastFromError(error);
    } finally {
      setActionBusy(null);
    }
  }

  async function onDuplicate() {
    setActionBusy("duplicate");
    try {
      await duplicateTask(task.id);
      toastSuccess("Task duplicated");
      await onDuplicated?.();
    } catch (error) {
      toastFromError(error);
    } finally {
      setActionBusy(null);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-6">
      <button
        type="button"
        aria-label="Close task detail"
        className="absolute inset-0 bg-black/45"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[min(92vh,880px)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-bb-lg"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-bb-border px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-bb-muted">{task.code}</p>
            <h2 id={titleId} className="mt-0.5 text-lg font-bold text-bb-ink">
              Task details
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void onToggleWatch()}
                disabled={actionBusy === "watch"}
                aria-label={task.isWatching ? "Unwatch task" : "Watch task"}
                title={task.isWatching ? "Unwatch" : "Watch"}
                className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  task.isWatching
                    ? "border-bb-blue bg-bb-sky text-bb-blue"
                    : "border-bb-border bg-white text-bb-ink hover:border-bb-blue/40 hover:bg-bb-sky"
                }`}
              >
                {task.isWatching ? (
                  <EyeOff className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <Eye className="h-3.5 w-3.5" aria-hidden />
                )}
              </button>
              <button
                type="button"
                onClick={() => void onTogglePin()}
                disabled={actionBusy === "pin"}
                aria-label={task.isPinned ? "Unpin task" : "Pin task"}
                title={task.isPinned ? "Unpin" : "Pin"}
                className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  task.isPinned
                    ? "border-amber-400 bg-amber-50 text-amber-700"
                    : "border-bb-border bg-white text-bb-ink hover:border-bb-blue/40 hover:bg-bb-sky"
                }`}
              >
                {task.isPinned ? (
                  <PinOff className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <Pin className="h-3.5 w-3.5" aria-hidden />
                )}
              </button>
              <button
                type="button"
                onClick={() => void onDuplicate()}
                disabled={actionBusy === "duplicate"}
                aria-label="Duplicate task"
                title="Duplicate"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-bb-border bg-white text-bb-ink transition hover:border-bb-blue/40 hover:bg-bb-sky disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Copy className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-bb-muted hover:bg-bb-sky"
            aria-label="Close"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* Left: main */}
          <div className="min-h-0 overflow-y-auto px-5 py-4">
            <form id="task-detail-form" onSubmit={onSave} className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-bb-ink">Title</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <TaskDoneCheckbox
                    done={task.status === "DONE"}
                    size="md"
                    disabled={actionBusy === "done"}
                    onToggle={() => void onToggleDone()}
                  />
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    minLength={3}
                    className="min-w-0 flex-1"
                    aria-label="Task title"
                  />
                </div>
              </div>

              <label className="block text-sm font-semibold text-bb-ink">
                Priority
                <select
                  value={priority}
                  onChange={(e) =>
                    setPriority(e.target.value as TaskPriority)
                  }
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
            </form>

            {/* Action buttons */}
            <div className="relative mt-4">
              <div className="flex flex-wrap gap-2">
                <ActionBtn
                  active={action === "due"}
                  onClick={() => toggleAction("due")}
                  icon={<Calendar className="h-3.5 w-3.5" aria-hidden />}
                  label="Due date"
                />
                <ActionBtn
                  active={action === "assignees"}
                  onClick={() => toggleAction("assignees")}
                  icon={<UserPlus className="h-3.5 w-3.5" aria-hidden />}
                  label="Assignees"
                />
                <ActionBtn
                  active={action === "labels"}
                  onClick={() => toggleAction("labels")}
                  icon={<Tag className="h-3.5 w-3.5" aria-hidden />}
                  label="Labels"
                />
                <ActionBtn
                  active={action === "checklist"}
                  onClick={() => toggleAction("checklist")}
                  icon={<CheckSquare className="h-3.5 w-3.5" aria-hidden />}
                  label="Checklist"
                />
                <ActionBtn
                  active={action === "attachments"}
                  onClick={() => toggleAction("attachments")}
                  icon={<Paperclip className="h-3.5 w-3.5" aria-hidden />}
                  label="Attachments"
                />
              </div>

              <Popover open={action === "due"} onClose={() => setAction(null)}>
                <p className="mb-2 text-xs font-bold text-bb-ink">Due date</p>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => void persistDue(e.target.value)}
                  className="!h-9"
                />
                {dueDate ? (
                  <button
                    type="button"
                    className="mt-2 text-xs font-semibold text-bb-danger hover:underline"
                    onClick={() => void persistDue("")}
                  >
                    Clear due date
                  </button>
                ) : null}
              </Popover>

              <Popover
                open={action === "assignees"}
                onClose={() => setAction(null)}
                className="!w-[min(100%,360px)]"
              >
                <TaskAssigneesPanel
                  taskId={task.id}
                  workspaceId={workspaceId}
                  assignees={task.assignees}
                  onChange={onChange}
                  variant="picker"
                />
              </Popover>

              <Popover
                open={action === "labels"}
                onClose={() => setAction(null)}
                className="!w-[min(100%,360px)]"
              >
                <TaskLabelsPanel
                  taskId={task.id}
                  projectId={projectId}
                  labels={task.labels}
                  task={task}
                  onChange={onChange}
                  variant="picker"
                />
              </Popover>

              <Popover
                open={action === "checklist"}
                onClose={() => setAction(null)}
              >
                <p className="mb-2 text-xs font-bold text-bb-ink">
                  Add checklist
                </p>
                <form onSubmit={onCreateChecklist} className="flex gap-2">
                  <Input
                    value={checklistTitle}
                    onChange={(e) => setChecklistTitle(e.target.value)}
                    placeholder="Checklist title"
                    className="!h-9 !text-sm"
                    minLength={2}
                    required
                    autoFocus
                  />
                  <Button type="submit" size="sm" disabled={addingChecklist}>
                    {addingChecklist ? "…" : "Add"}
                  </Button>
                </form>
              </Popover>

              <Popover
                open={action === "attachments"}
                onClose={() => setAction(null)}
                className="!w-[min(100%,380px)]"
              >
                <TaskAttachmentPanel
                  taskId={task.id}
                  variant="upload"
                  onCountChange={(count) => {
                    setAttachmentKey((k) => k + 1);
                    onAttachmentsCount?.(count);
                  }}
                />
              </Popover>
            </div>

            {/* Summary: due */}
            {dueDate ? (
              <div className="mt-4">
                <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-bb-muted">
                  Due date
                </p>
                <button
                  type="button"
                  onClick={() => toggleAction("due")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-bb-border bg-bb-sky/40 px-2.5 py-1.5 text-xs font-semibold text-bb-ink hover:border-bb-blue/40"
                >
                  <Calendar className="h-3.5 w-3.5 text-bb-muted" aria-hidden />
                  {new Date(dueDate).toLocaleDateString()}
                </button>
              </div>
            ) : null}

            {/* Summary: members */}
            {task.assignees.length > 0 ? (
              <div className="mt-4">
                <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-bb-muted">
                  Members
                </p>
                <div className="flex flex-wrap items-center gap-1.5">
                  {task.assignees.map((a) => (
                    <UserAvatar
                      key={a.workspaceMemberId}
                      name={a.user.fullName}
                      avatarUrl={a.user.avatarUrl}
                      size="lg"
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => toggleAction("assignees")}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-bb-border text-bb-muted hover:border-bb-blue hover:text-bb-blue"
                    aria-label="Add member"
                  >
                    <UserPlus className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              </div>
            ) : null}

            {/* Summary: labels */}
            {task.labels.length > 0 ? (
              <div className="mt-4">
                <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-bb-muted">
                  Labels
                </p>
                <div className="flex flex-wrap items-center gap-1.5">
                  {task.labels.map((label) => (
                    <span
                      key={label.id}
                      className="inline-flex max-w-[160px] truncate rounded px-2 py-1 text-xs font-semibold text-white"
                      style={{ background: label.color }}
                    >
                      {label.name}
                    </span>
                  ))}
                  <button
                    type="button"
                    onClick={() => toggleAction("labels")}
                    className="inline-flex h-7 w-7 items-center justify-center rounded border border-dashed border-bb-border text-bb-muted hover:border-bb-blue hover:text-bb-blue"
                    aria-label="Add label"
                  >
                    +
                  </button>
                </div>
              </div>
            ) : null}

            {/* Description */}
            <div className="mt-5">
              <button
                type="button"
                onClick={() => setDescOpen((v) => !v)}
                className="flex items-center gap-1.5 text-sm font-bold text-bb-ink"
              >
                <span
                  className={`inline-block transition ${descOpen ? "rotate-90" : ""}`}
                  aria-hidden
                >
                  ▸
                </span>
                Description
              </button>
              {descOpen ? (
                <textarea
                  form="task-detail-form"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Add a more detailed description…"
                  className="mt-2 w-full rounded-[10px] border border-bb-border bg-white px-3 py-2 text-sm text-bb-ink outline-none focus:border-bb-blue"
                />
              ) : null}
            </div>

            {/* Checklists body */}
            <div className="mt-5">
              <TaskChecklistPanel
                key={checklistKey}
                taskId={task.id}
                variant="lists"
                onProgressChange={onChecklistProgress}
              />
            </div>

            {/* Attachments body */}
            <div className="mt-5">
              <TaskAttachmentPanel
                key={attachmentKey}
                taskId={task.id}
                variant="list"
                onCountChange={onAttachmentsCount}
              />
            </div>

            <div className="mt-6 flex gap-2 border-t border-bb-border pt-4">
              <Button
                type="submit"
                form="task-detail-form"
                fullWidth
                disabled={saving}
              >
                {saving ? "Saving..." : "Save changes"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => void onDeleted()}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </div>

          {/* Right: comments */}
          <aside className="flex min-h-0 flex-col border-t border-bb-border bg-[#F8F9FB] lg:border-l lg:border-t-0">
            <div className="shrink-0 border-b border-bb-border px-4 py-3">
              <h3 className="text-sm font-bold text-bb-ink">Comments</h3>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              <TaskCommentPanel
                taskId={task.id}
                boardId={boardId ?? undefined}
                workspaceId={workspaceId}
                onCountChange={onCommentsCount}
                variant="sidebar"
              />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
