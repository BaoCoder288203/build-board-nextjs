"use client";

import { ArrowLeft, Search } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import { AppShell } from "@/components/app-shell";
import { Button, buttonClassName } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import {
  searchTasks,
  type SearchTaskHit,
} from "@/lib/search";
import { toastFromError } from "@/lib/toast";
import type { TaskPriority, TaskStatus } from "@/lib/tasks";
import {
  fetchWorkspace,
  type WorkspaceDetail,
} from "@/lib/workspaces";
import type { ThemeColors } from "@/lib/visual-identity";

const STATUS_OPTIONS: TaskStatus[] = [
  "TODO",
  "IN_PROGRESS",
  "REVIEW",
  "DONE",
];
const PRIORITY_OPTIONS: TaskPriority[] = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
];
const SORT_OPTIONS = [
  { value: "updatedAt", label: "Updated" },
  { value: "dueDate", label: "Due date" },
  { value: "title", label: "Title" },
  { value: "createdAt", label: "Created" },
] as const;

function WorkspaceSearchContent() {
  const params = useParams<{ workspaceId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const workspaceId = params.workspaceId;

  const [workspace, setWorkspace] = useState<WorkspaceDetail | null>(null);
  const [keyword, setKeyword] = useState(searchParams.get("q") ?? "");
  const [status, setStatus] = useState<TaskStatus | "">(
    (searchParams.get("status") as TaskStatus) || "",
  );
  const [priority, setPriority] = useState<TaskPriority | "">(
    (searchParams.get("priority") as TaskPriority) || "",
  );
  const [sortBy, setSortBy] = useState<(typeof SORT_OPTIONS)[number]["value"]>(
    (searchParams.get("sortBy") as (typeof SORT_OPTIONS)[number]["value"]) ||
      "updatedAt",
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(
    searchParams.get("sortOrder") === "asc" ? "asc" : "desc",
  );
  const [items, setItems] = useState<SearchTaskHit[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const initialQ = searchParams.get("q") ?? "";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ws = await fetchWorkspace(workspaceId);
        if (!cancelled) setWorkspace(ws);
      } catch (error) {
        toastFromError(error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  async function load(nextPage = 1, overrides?: { keyword?: string }) {
    const q = overrides?.keyword ?? keyword;
    setLoading(true);
    try {
      const data = await searchTasks({
        workspaceId,
        keyword: q.trim() || undefined,
        status: status || undefined,
        priority: priority || undefined,
        sortBy,
        sortOrder,
        page: nextPage,
        limit: 20,
      });
      setItems(data.items);
      setTotal(data.total);
      setPage(data.page);
      setTotalPages(data.totalPages);
    } catch (error) {
      toastFromError(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setKeyword(initialQ);
    void load(1, { keyword: initialQ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, initialQ]);

  function syncUrl() {
    const qs = new URLSearchParams();
    if (keyword.trim()) qs.set("q", keyword.trim());
    if (status) qs.set("status", status);
    if (priority) qs.set("priority", priority);
    qs.set("sortBy", sortBy);
    qs.set("sortOrder", sortOrder);
    router.replace(
      `/workspaces/${workspaceId}/search?${qs.toString()}`,
      { scroll: false },
    );
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    syncUrl();
    void load(1);
  }

  const theme: ThemeColors | null = workspace
    ? {
        themeColorFrom: workspace.themeColorFrom,
        themeColorTo: workspace.themeColorTo,
      }
    : null;

  return (
    <AppShell
      title="Search"
      subtitle={
        workspace
          ? `Find tasks in ${workspace.name}`
          : "Filter and sort tasks"
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

      <form
        onSubmit={onSubmit}
        className="mb-6 space-y-4 rounded-[12px] border border-bb-border/80 bg-bb-surface p-4 shadow-bb"
      >
        <Field label="Keyword">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bb-muted"
              strokeWidth={2}
              aria-hidden
            />
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Title, code, or description"
              className="pl-9"
            />
          </div>
        </Field>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Status">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus | "")}
              className="h-10 w-full rounded-lg border border-bb-border bg-bb-surface px-3 text-sm text-bb-ink"
            >
              <option value="">Any</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Priority">
            <select
              value={priority}
              onChange={(e) =>
                setPriority(e.target.value as TaskPriority | "")
              }
              className="h-10 w-full rounded-lg border border-bb-border bg-bb-surface px-3 text-sm text-bb-ink"
            >
              <option value="">Any</option>
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Sort by">
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(
                  e.target.value as (typeof SORT_OPTIONS)[number]["value"],
                )
              }
              className="h-10 w-full rounded-lg border border-bb-border bg-bb-surface px-3 text-sm text-bb-ink"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Order">
            <select
              value={sortOrder}
              onChange={(e) =>
                setSortOrder(e.target.value as "asc" | "desc")
              }
              className="h-10 w-full rounded-lg border border-bb-border bg-bb-surface px-3 text-sm text-bb-ink"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </Field>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="submit" variant="primary" size="sm" disabled={loading}>
            Search
          </Button>
        </div>
      </form>

      <p className="mb-3 text-sm text-bb-muted">
        {loading ? "Searching…" : `${total} result${total === 1 ? "" : "s"}`}
      </p>

      {items.length === 0 && !loading ? (
        <div className="rounded-[12px] border border-dashed border-bb-border bg-bb-sky/40 px-6 py-12 text-center text-sm text-bb-muted">
          No tasks match your filters.
        </div>
      ) : (
        <ul className="overflow-hidden rounded-[12px] border border-bb-border/80 bg-bb-surface shadow-bb divide-y divide-bb-border/60">
          {items.map((t) => (
            <li key={t.id}>
              <Link
                href={`/boards/${t.boardId}`}
                className="flex items-start justify-between gap-3 px-4 py-3 transition hover:bg-bb-sky/40"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-bb-ink">
                    <span className="text-bb-muted">{t.code}</span> {t.title}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-bb-muted">
                    {t.projectName} · {t.boardName} · {t.status} · {t.priority}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-bb-muted">
                  {t.dueDate
                    ? new Date(t.dueDate).toLocaleDateString()
                    : "No due"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 ? (
        <div className="mt-4 flex justify-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={loading || page <= 1}
            onClick={() => void load(page - 1)}
          >
            Previous
          </Button>
          <span className="inline-flex items-center text-sm text-bb-muted">
            Page {page} / {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={loading || page >= totalPages}
            onClick={() => void load(page + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}
    </AppShell>
  );
}

export default function WorkspaceSearchPage() {
  return (
    <Suspense
      fallback={
        <AppShell title="Search" subtitle="Loading…">
          <p className="text-sm text-bb-muted">Loading search…</p>
        </AppShell>
      }
    >
      <WorkspaceSearchContent />
    </Suspense>
  );
}
