"use client";

import { UserPlus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  assignTask,
  unassignTask,
  type TaskAssignee,
  type TaskCard,
} from "@/lib/tasks";
import { toastFromError } from "@/lib/toast";
import { fetchMembers, type WorkspaceMember } from "@/lib/workspaces";

type Props = {
  taskId: string;
  workspaceId?: string | null;
  assignees: TaskAssignee[];
  onChange: (task: TaskCard) => void;
  /** full = section UI; picker = member list only (for popover) */
  variant?: "full" | "picker";
};

export function TaskAssigneesPanel({
  taskId,
  workspaceId,
  assignees,
  onChange,
  variant = "full",
}: Props) {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(variant === "picker");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;
    setLoadingMembers(true);
    void fetchMembers(workspaceId)
      .then((res) => {
        if (!cancelled) setMembers(res.items);
      })
      .catch(() => {
        /* picker still usable after retry */
      })
      .finally(() => {
        if (!cancelled) setLoadingMembers(false);
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  const assignedUserIds = useMemo(
    () => new Set(assignees.map((a) => a.user.id)),
    [assignees],
  );

  const available = useMemo(
    () => members.filter((m) => !assignedUserIds.has(m.user.id)),
    [members, assignedUserIds],
  );

  async function onAssign(userId: string) {
    setBusyId(userId);
    try {
      const task = await assignTask(taskId, userId);
      onChange(task);
    } catch (error) {
      toastFromError(error);
    } finally {
      setBusyId(null);
    }
  }

  async function onUnassign(userId: string) {
    setBusyId(userId);
    try {
      const task = await unassignTask(taskId, userId);
      onChange(task);
    } catch (error) {
      toastFromError(error);
    } finally {
      setBusyId(null);
    }
  }

  const picker = (
    <div
      className={
        variant === "picker"
          ? "max-h-52 overflow-y-auto"
          : "mt-3 max-h-40 overflow-y-auto rounded-lg border border-bb-border"
      }
    >
      {loadingMembers ? (
        <p className="px-3 py-2 text-xs text-bb-muted">Loading members…</p>
      ) : available.length === 0 ? (
        <p className="px-3 py-2 text-xs text-bb-muted">
          {assignees.length > 0
            ? "Everyone is already assigned."
            : "No members available."}
        </p>
      ) : (
        <ul className="divide-y divide-bb-border/70">
          {available.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => void onAssign(m.user.id)}
                disabled={busyId === m.user.id}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-bb-sky disabled:opacity-50"
              >
                <UserAvatar
                  name={m.user.fullName}
                  avatar={m.user.avatar}
                  size="md"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-bb-ink">
                    {m.user.fullName}
                  </span>
                  <span className="block truncate text-xs text-bb-muted">
                    @{m.user.username} · {m.role.name}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  if (variant === "picker") {
    return (
      <div>
        <p className="mb-2 text-xs font-bold text-bb-ink">Add members</p>
        {assignees.length > 0 ? (
          <ul className="mb-3 flex flex-wrap gap-1.5">
            {assignees.map((a) => (
              <li
                key={a.workspaceMemberId}
                className="inline-flex items-center gap-1 rounded-full border border-bb-border bg-bb-sky/50 py-0.5 pl-1 pr-1"
              >
                <UserAvatar
                  name={a.user.fullName}
                  avatarUrl={a.user.avatarUrl}
                  size="xs"
                />
                <button
                  type="button"
                  onClick={() => void onUnassign(a.user.id)}
                  disabled={busyId === a.user.id}
                  className="rounded-full p-0.5 text-bb-muted hover:text-bb-danger disabled:opacity-50"
                  aria-label={`Remove ${a.user.fullName}`}
                >
                  <X className="h-3 w-3" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {picker}
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-bb-border bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-bb-ink">Assignees</h3>
        {workspaceId ? (
          <button
            type="button"
            onClick={() => setPickerOpen((v) => !v)}
            disabled={loadingMembers || available.length === 0}
            className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-bb-blue hover:bg-bb-sky disabled:cursor-not-allowed disabled:opacity-50"
            aria-expanded={pickerOpen}
            aria-label="Add assignee"
          >
            <UserPlus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            Add
          </button>
        ) : null}
      </div>

      {assignees.length === 0 ? (
        <p className="text-sm text-bb-muted">No one assigned yet.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {assignees.map((a) => (
            <li
              key={a.workspaceMemberId}
              className="inline-flex items-center gap-1.5 rounded-full border border-bb-border bg-bb-sky/50 py-1 pl-1 pr-1.5"
            >
              <UserAvatar
                name={a.user.fullName}
                avatarUrl={a.user.avatarUrl}
                size="sm"
              />
              <span className="max-w-[120px] truncate text-xs font-semibold text-bb-ink">
                {a.user.fullName}
              </span>
              <button
                type="button"
                onClick={() => void onUnassign(a.user.id)}
                disabled={busyId === a.user.id}
                className="rounded-full p-0.5 text-bb-muted hover:bg-white hover:text-bb-danger disabled:opacity-50"
                aria-label={`Remove ${a.user.fullName}`}
              >
                <X className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {pickerOpen ? picker : null}
    </section>
  );
}
