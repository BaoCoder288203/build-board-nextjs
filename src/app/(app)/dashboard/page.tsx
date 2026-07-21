"use client";

import { Plus, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type MouseEvent } from "react";
import { AppShell } from "@/components/app-shell";
import { WorkspaceAvatar } from "@/components/visual/workspace-avatar";
import { Button, buttonClassName } from "@/components/ui/button";
import { runWorkspaceEnterReveal } from "@/lib/workspace-reveal";
import { type WorkspaceSummary } from "@/lib/workspaces";
import { toastFromError } from "@/lib/toast";
import { useAuthStore } from "@/stores/auth-store";
import {
  prefetchWorkspaceList,
  prefetchWorkspacePage,
  useEntityCache,
} from "@/stores/entity-cache";

function DashboardContent() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const cachedList = useEntityCache((s) => s.workspaceList);
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>(
    () => useEntityCache.getState().workspaceList ?? [],
  );
  const [loading, setLoading] = useState(
    () => !useEntityCache.getState().workspaceList,
  );
  const [revealing, setRevealing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const hasCache = Boolean(useEntityCache.getState().workspaceList);
      if (!hasCache) setLoading(true);
      try {
        const data = await prefetchWorkspaceList();
        if (!cancelled) setWorkspaces(data.items);
      } catch (error) {
        toastFromError(error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (cachedList) setWorkspaces(cachedList);
  }, [cachedList]);

  async function openWorkspace(
    ws: WorkspaceSummary,
    event: MouseEvent<HTMLElement>,
  ) {
    if (revealing) return;
    setRevealing(true);
    const href = `/workspaces/${ws.id}`;
    const color = ws.themeColorFrom || ws.themeColorTo || "#0C66E4";
    useEntityCache.getState().seedWorkspaceFromSummary(ws);
    void prefetchWorkspacePage(ws.id);
    router.prefetch(href);
    try {
      await runWorkspaceEnterReveal({
        event: { clientX: event.clientX, clientY: event.clientY },
        originEl: event.currentTarget,
        color,
        navigate: () => router.push(href),
      });
    } catch {
      router.push(href);
    } finally {
      setTimeout(() => setRevealing(false), 800);
    }
  }

  return (
    <AppShell
      title="Your workspaces"
      subtitle={`Welcome back, ${user?.fullName?.split(" ")[0] ?? "there"}. Open a workspace or create a new one.`}
    >
      <div className="mb-6 flex justify-end">
        <Link
          href="/workspaces/new"
          className={buttonClassName({ variant: "primary", size: "sm" })}
        >
          <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
          Create workspace
        </Link>
      </div>

      {loading && workspaces.length === 0 ? (
        <p className="text-sm text-bb-muted">Loading workspaces...</p>
      ) : workspaces.length === 0 ? (
        <div className="rounded-[12px] border border-dashed border-bb-border bg-bb-sky/40 px-6 py-16 text-center">
          <h2 className="text-lg font-bold text-bb-ink">No workspaces yet</h2>
          <p className="mt-2 text-sm text-bb-muted">
            Create your first workspace to invite teammates and manage boards.
          </p>
          <Link
            href="/workspaces/new"
            className={`${buttonClassName({ variant: "primary" })} mt-6 inline-flex`}
          >
            <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
            Create workspace
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((ws, index) => (
            <button
              key={ws.id}
              type="button"
              disabled={revealing}
              onMouseEnter={() => {
                useEntityCache.getState().seedWorkspaceFromSummary(ws);
                void prefetchWorkspacePage(ws.id);
                router.prefetch(`/workspaces/${ws.id}`);
              }}
              onClick={(e) => void openWorkspace(ws, e)}
              className="bb-animate-card group overflow-hidden rounded-[12px] border border-bb-border/80 bg-bb-surface text-left shadow-bb transition duration-200 hover:-translate-y-0.5 hover:shadow-bb-lg disabled:pointer-events-none"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <WorkspaceAvatar
                themeColorFrom={ws.themeColorFrom}
                themeColorTo={ws.themeColorTo}
              />
              <div className="px-4 py-3">
                <h2 className="font-bold text-bb-ink">{ws.name}</h2>
                <p className="mt-1 text-xs text-bb-muted">
                  {ws.myRole ?? "Member"} · {ws.membersCount ?? 0} members ·{" "}
                  {ws.projectsCount ?? 0} projects
                </p>
              </div>
            </button>
          ))}

          <Link
            href="/workspaces/new"
            className="flex min-h-[168px] flex-col items-center justify-center gap-2 rounded-[12px] border border-dashed border-bb-border bg-bb-sky/40 text-sm font-semibold text-bb-muted transition hover:border-bb-blue hover:text-bb-blue"
          >
            <Plus className="h-5 w-5" strokeWidth={2} aria-hidden />
            Create new workspace
          </Link>
        </div>
      )}

      <div className="mt-10 flex gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.location.reload()}
        >
          <RefreshCw className="h-4 w-4" strokeWidth={2} aria-hidden />
          Refresh
        </Button>
      </div>
    </AppShell>
  );
}

export default function DashboardPage() {
  return <DashboardContent />;
}
