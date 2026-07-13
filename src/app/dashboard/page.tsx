"use client";

import { Home, Plus, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Protected } from "@/components/protected";
import { Button, buttonClassName } from "@/components/ui/button";
import {
  fetchMyWorkspaces,
  type WorkspaceSummary,
} from "@/lib/workspaces";
import { toastFromError } from "@/lib/toast";
import { useAuthStore } from "@/stores/auth-store";

const covers = [
  "from-[#0C66E4] to-[#579DFF]",
  "from-[#216E4E] to-[#4BCE97]",
  "from-[#C25100] to-[#F5CD47]",
  "from-[#172B4D] to-[#626F86]",
];

function DashboardContent() {
  const user = useAuthStore((s) => s.user);
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchMyWorkspaces();
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

      {loading ? (
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
            <Link
              key={ws.id}
              href={`/workspaces/${ws.id}`}
              className="bb-animate-card group overflow-hidden rounded-[12px] border border-bb-border/80 bg-bb-surface shadow-bb transition duration-200 hover:-translate-y-0.5 hover:shadow-bb-lg"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <div
                className={`h-28 bg-gradient-to-br ${covers[index % covers.length]} transition duration-200 group-hover:brightness-105`}
              />
              <div className="px-4 py-3">
                <h2 className="font-bold text-bb-ink">{ws.name}</h2>
                <p className="mt-1 text-xs text-bb-muted">
                  {ws.myRole ?? "Member"} · {ws.membersCount ?? 0} members ·{" "}
                  {ws.projectsCount ?? 0} projects
                </p>
              </div>
            </Link>
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
  return (
    <Protected>
      <DashboardContent />
    </Protected>
  );
}
