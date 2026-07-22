"use client";

import { Plus, Tag, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  addTaskLabel,
  createProjectLabel,
  deleteProjectLabel,
  fetchProjectLabels,
  removeTaskLabel,
  type TaskCard,
  type TaskLabel,
} from "@/lib/tasks";
import { toastFromError, toastSuccess } from "@/lib/toast";

const LABEL_COLORS = [
  "#EF4444",
  "#F97316",
  "#EAB308",
  "#22C55E",
  "#06B6D4",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#64748B",
] as const;

type Props = {
  taskId: string;
  projectId?: string | null;
  labels: TaskLabel[];
  onChange: (task: TaskCard) => void;
  /** Used to patch labels locally after a project label is hard-deleted. */
  task: TaskCard;
  /** full = section UI; picker = create + catalog only */
  variant?: "full" | "picker";
};

export function TaskLabelsPanel({
  taskId,
  projectId,
  labels,
  onChange,
  task,
  variant = "full",
}: Props) {
  const [catalog, setCatalog] = useState<TaskLabel[]>([]);
  const [loading, setLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(variant === "picker");
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(LABEL_COLORS[0]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    setLoading(true);
    void fetchProjectLabels(projectId)
      .then((res) => {
        if (!cancelled) setCatalog(res.items);
      })
      .catch((error) => {
        if (!cancelled) toastFromError(error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const selectedIds = useMemo(
    () => new Set(labels.map((l) => l.id)),
    [labels],
  );

  async function onRemoveFromTask(labelId: string) {
    setBusyId(labelId);
    try {
      onChange(await removeTaskLabel(taskId, labelId));
    } catch (error) {
      toastFromError(error);
    } finally {
      setBusyId(null);
    }
  }

  async function onAttach(labelId: string) {
    setBusyId(labelId);
    try {
      onChange(await addTaskLabel(taskId, labelId));
    } catch (error) {
      toastFromError(error);
    } finally {
      setBusyId(null);
    }
  }

  async function onDeleteLabel(label: TaskLabel) {
    if (
      !window.confirm(
        `Delete label “${label.name}”? It will be removed from all tasks.`,
      )
    ) {
      return;
    }
    setBusyId(label.id);
    try {
      await deleteProjectLabel(label.id);
      setCatalog((prev) => prev.filter((l) => l.id !== label.id));
      if (selectedIds.has(label.id)) {
        onChange({
          ...task,
          labels: task.labels.filter((l) => l.id !== label.id),
        });
      }
      toastSuccess("Label deleted");
    } catch (error) {
      toastFromError(error);
    } finally {
      setBusyId(null);
    }
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    setCreating(true);
    try {
      const result = await createProjectLabel({
        projectId,
        name: trimmed,
        color,
        taskId,
      });
      setCatalog((prev) =>
        [...prev, result.label].sort((a, b) => a.name.localeCompare(b.name)),
      );
      if (result.task) onChange(result.task);
      setName("");
      setColor(LABEL_COLORS[0]);
      toastSuccess("Label added");
    } catch (error) {
      toastFromError(error);
    } finally {
      setCreating(false);
    }
  }

  const pickerBody =
    projectId ? (
      <div
        className={
          variant === "picker"
            ? "space-y-3"
            : "mt-3 space-y-3 rounded-lg border border-bb-border p-3"
        }
      >
        <form onSubmit={onCreate} className="space-y-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New label name"
            maxLength={100}
            className="!h-8 !px-2 !text-sm"
            disabled={creating}
            required
          />
          <div
            className="flex flex-wrap gap-1.5"
            role="radiogroup"
            aria-label="Label color"
          >
            {LABEL_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={color === c}
                onClick={() => setColor(c)}
                className={`h-6 w-6 rounded-full ${
                  color === c ? "ring-2 ring-bb-ink ring-offset-1" : ""
                }`}
                style={{ background: c }}
                title={c}
              />
            ))}
          </div>
          <button
            type="submit"
            disabled={creating || !name.trim()}
            className="inline-flex h-8 items-center gap-1 rounded-lg bg-bb-blue px-3 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            {creating ? "Adding…" : "Create & add"}
          </button>
        </form>

        {loading && catalog.length === 0 ? (
          <p className="text-xs text-bb-muted">Loading labels…</p>
        ) : catalog.length > 0 ? (
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-bb-muted">
              Project labels
            </p>
            <ul className="max-h-36 space-y-1 overflow-y-auto">
              {catalog.map((label) => {
                const onTask = selectedIds.has(label.id);
                return (
                  <li
                    key={label.id}
                    className="flex items-center gap-1 rounded-lg hover:bg-bb-sky/60"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        void (onTask
                          ? onRemoveFromTask(label.id)
                          : onAttach(label.id))
                      }
                      disabled={busyId === label.id}
                      className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left text-sm disabled:opacity-50"
                    >
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ background: label.color }}
                        aria-hidden
                      />
                      <span className="truncate font-semibold text-bb-ink">
                        {label.name}
                      </span>
                      {onTask ? (
                        <span className="ml-auto shrink-0 text-[10px] font-bold uppercase text-bb-muted">
                          On task
                        </span>
                      ) : null}
                    </button>
                    <button
                      type="button"
                      onClick={() => void onDeleteLabel(label)}
                      disabled={busyId === label.id}
                      className="shrink-0 rounded-lg p-1.5 text-bb-muted hover:bg-white hover:text-bb-danger disabled:opacity-50"
                      aria-label={`Delete ${label.name}`}
                      title="Delete label"
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <p className="text-xs text-bb-muted">
            No project labels yet — create one above.
          </p>
        )}
      </div>
    ) : (
      <p className="text-sm text-bb-muted">Project unavailable.</p>
    );

  if (variant === "picker") {
    return (
      <div>
        <p className="mb-2 text-xs font-bold text-bb-ink">Labels</p>
        {pickerBody}
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-bb-border bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-bb-muted" strokeWidth={2} aria-hidden />
          <h3 className="text-sm font-bold text-bb-ink">Labels</h3>
        </div>
        {projectId ? (
          <button
            type="button"
            onClick={() => setPickerOpen((v) => !v)}
            className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-bb-blue hover:bg-bb-sky"
            aria-expanded={pickerOpen}
            aria-label="Add label"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            Add
          </button>
        ) : null}
      </div>

      {labels.length === 0 ? (
        <p className="text-sm text-bb-muted">No labels on this task.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {labels.map((label) => (
            <li
              key={label.id}
              className="inline-flex items-center gap-1 rounded-full py-1 pl-2.5 pr-1 text-xs font-semibold text-white"
              style={{ background: label.color }}
            >
              <span className="max-w-[140px] truncate">{label.name}</span>
              <button
                type="button"
                onClick={() => void onRemoveFromTask(label.id)}
                disabled={busyId === label.id}
                className="rounded-full p-0.5 text-white/90 hover:bg-black/15 disabled:opacity-50"
                aria-label={`Remove ${label.name}`}
                title="Remove from task"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {pickerOpen ? pickerBody : null}
    </section>
  );
}
