"use client";

import { CheckSquare, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createChecklist,
  createChecklistItem,
  deleteChecklist,
  deleteChecklistItem,
  fetchChecklists,
  updateChecklist,
  updateChecklistItem,
  type Checklist,
} from "@/lib/checklists";
import { toastFromError, toastSuccess } from "@/lib/toast";

type Props = {
  taskId: string;
  onProgressChange?: (progress: {
    completed: number;
    total: number;
  } | null) => void;
  /** full = lists + create form; lists = body only; create unused (modal has own) */
  variant?: "full" | "lists";
  onEmpty?: () => void;
};

function sumProgress(lists: Checklist[]) {
  const total = lists.reduce((n, c) => n + c.total, 0);
  const completed = lists.reduce((n, c) => n + c.completed, 0);
  return total > 0 ? { completed, total } : null;
}

export function TaskChecklistPanel({
  taskId,
  onProgressChange,
  variant = "full",
  onEmpty,
}: Props) {
  const [lists, setLists] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [newListTitle, setNewListTitle] = useState("");
  const [addingList, setAddingList] = useState(false);
  const [itemDraft, setItemDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const onProgressChangeRef = useRef(onProgressChange);
  onProgressChangeRef.current = onProgressChange;
  const onEmptyRef = useRef(onEmpty);
  onEmptyRef.current = onEmpty;

  const load = useCallback(async () => {
    try {
      const { items } = await fetchChecklists(taskId);
      setLists(items);
      onProgressChangeRef.current?.(sumProgress(items));
      if (items.length === 0) onEmptyRef.current?.();
    } catch (error) {
      toastFromError(error);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  async function onAddList(e: React.FormEvent) {
    e.preventDefault();
    const title = newListTitle.trim();
    if (title.length < 2) return;
    setAddingList(true);
    try {
      await createChecklist({ taskId, title });
      setNewListTitle("");
      toastSuccess("Checklist added");
      await load();
    } catch (error) {
      toastFromError(error);
    } finally {
      setAddingList(false);
    }
  }

  async function onRenameList(checklistId: string, title: string) {
    const next = title.trim();
    if (next.length < 2) return;
    setBusy(checklistId);
    try {
      await updateChecklist(checklistId, { title: next });
      await load();
    } catch (error) {
      toastFromError(error);
    } finally {
      setBusy(null);
    }
  }

  async function onDeleteList(checklistId: string) {
    if (!window.confirm("Delete this checklist and all its items?")) return;
    setBusy(checklistId);
    try {
      await deleteChecklist(checklistId);
      toastSuccess("Checklist deleted");
      await load();
    } catch (error) {
      toastFromError(error);
    } finally {
      setBusy(null);
    }
  }

  async function onAddItem(checklistId: string) {
    const title = (itemDraft[checklistId] ?? "").trim();
    if (!title) return;
    setBusy(`item-${checklistId}`);
    try {
      await createChecklistItem(checklistId, { title });
      setItemDraft((prev) => ({ ...prev, [checklistId]: "" }));
      await load();
    } catch (error) {
      toastFromError(error);
    } finally {
      setBusy(null);
    }
  }

  async function onToggleItem(itemId: string, completed: boolean) {
    setBusy(itemId);
    try {
      await updateChecklistItem(itemId, { completed });
      await load();
    } catch (error) {
      toastFromError(error);
    } finally {
      setBusy(null);
    }
  }

  async function onDeleteItem(itemId: string) {
    setBusy(itemId);
    try {
      await deleteChecklistItem(itemId);
      await load();
    } catch (error) {
      toastFromError(error);
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    if (variant === "lists") return null;
    return (
      <div className="rounded-xl border border-bb-border bg-bb-sky/40 px-3 py-4 text-sm text-bb-muted">
        Loading checklists...
      </div>
    );
  }

  if (variant === "lists" && lists.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CheckSquare className="h-4 w-4 text-bb-muted" aria-hidden />
        <h3 className="text-sm font-bold text-bb-ink">Checklists</h3>
      </div>

      {lists.map((list) => (
        <section
          key={list.id}
          className="rounded-xl border border-bb-border bg-white p-3"
        >
          <div className="mb-2 flex items-start gap-2">
            <Input
              key={`${list.id}-${list.title}`}
              defaultValue={list.title}
              className="!h-8 !px-2 !text-sm !font-bold"
              disabled={busy === list.id}
              onBlur={(e) => {
                if (e.target.value.trim() !== list.title) {
                  void onRenameList(list.id, e.target.value);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  (e.target as HTMLInputElement).blur();
                }
              }}
            />
            <button
              type="button"
              disabled={busy === list.id}
              onClick={() => void onDeleteList(list.id)}
              className="rounded-lg p-1.5 text-bb-muted hover:bg-bb-danger-bg hover:text-bb-danger"
              aria-label="Delete checklist"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </div>

          {list.total > 0 ? (
            <div className="mb-3">
              <div className="mb-1 flex justify-between text-[11px] font-semibold text-bb-muted">
                <span>
                  {list.completed}/{list.total}
                </span>
                <span>{list.progress}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-bb-sky">
                <div
                  className="h-full rounded-full bg-bb-success transition-all"
                  style={{ width: `${list.progress}%` }}
                />
              </div>
            </div>
          ) : null}

          <ul className="space-y-1.5">
            {list.items.map((item) => {
              const done = item.completed || item.isCompleted;
              return (
                <li
                  key={item.id}
                  className="group flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-bb-sky/50"
                >
                  <input
                    type="checkbox"
                    checked={!!done}
                    disabled={busy === item.id}
                    onChange={(e) =>
                      void onToggleItem(item.id, e.target.checked)
                    }
                    className="h-4 w-4 accent-bb-blue"
                  />
                  <span
                    className={`min-w-0 flex-1 text-sm ${
                      done
                        ? "text-bb-muted line-through"
                        : "text-bb-ink"
                    }`}
                  >
                    {item.title}
                  </span>
                  <button
                    type="button"
                    disabled={busy === item.id}
                    onClick={() => void onDeleteItem(item.id)}
                    className="rounded p-1 text-bb-muted opacity-0 transition group-hover:opacity-100 hover:text-bb-danger"
                    aria-label="Delete item"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-2 flex gap-2">
            <Input
              value={itemDraft[list.id] ?? ""}
              onChange={(e) =>
                setItemDraft((prev) => ({
                  ...prev,
                  [list.id]: e.target.value,
                }))
              }
              placeholder="Add an item"
              className="!h-8 !text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void onAddItem(list.id);
                }
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={busy === `item-${list.id}`}
              onClick={() => void onAddItem(list.id)}
            >
              <Plus className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </section>
      ))}

      {variant === "full" ? (
        <form onSubmit={onAddList} className="flex gap-2">
          <Input
            value={newListTitle}
            onChange={(e) => setNewListTitle(e.target.value)}
            placeholder="Add a checklist"
            className="!text-sm"
            minLength={2}
            required
          />
          <Button type="submit" size="sm" disabled={addingList}>
            {addingList ? "..." : "Add"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
