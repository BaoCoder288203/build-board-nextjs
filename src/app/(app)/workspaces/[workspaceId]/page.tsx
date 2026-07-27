"use client";

import {
  ArrowLeft,
  ChevronDown,
  History,
  LayoutDashboard,
  LogOut,
  Plus,
  Search,
  Send,
  Settings,
  UserMinus,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ProjectAvatar } from "@/components/visual/project-avatar";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClassName } from "@/components/ui/button";
import { Field } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { navigateWithCover } from "@/lib/route-cover";
import { confirm } from "@/lib/confirm";
import { toastFromError, toastSuccess } from "@/lib/toast";
import {
  finishWorkspaceEnterReveal,
  peekWorkspaceRevealPending,
} from "@/lib/workspace-reveal";
import {
  changeMemberRole,
  inviteMember,
  leaveWorkspace,
  removeMember,
  type WorkspaceDetail,
  type WorkspaceMember,
  type WorkspaceRole,
} from "@/lib/workspaces";
import { type ProjectSummary } from "@/lib/projects";
import {
  getWorkspacePageCache,
  prefetchProjectPage,
  prefetchWorkspacePage,
  useEntityCache,
} from "@/stores/entity-cache";

function WorkspaceDetailContent() {
  const params = useParams<{ workspaceId: string }>();
  const router = useRouter();
  const workspaceId = params.workspaceId;

  const cached = useEntityCache((s) => s.workspaces[workspaceId]);
  const [workspace, setWorkspace] = useState<WorkspaceDetail | null>(
    () => getWorkspacePageCache(workspaceId)?.workspace ?? null,
  );
  const [members, setMembers] = useState<WorkspaceMember[]>(
    () => getWorkspacePageCache(workspaceId)?.members ?? [],
  );
  const [roles, setRoles] = useState<WorkspaceRole[]>(
    () => getWorkspacePageCache(workspaceId)?.roles ?? [],
  );
  const [projects, setProjects] = useState<ProjectSummary[]>(
    () => getWorkspacePageCache(workspaceId)?.projects ?? [],
  );
  const [loading, setLoading] = useState(
    () => !getWorkspacePageCache(workspaceId)?.workspace?.myMembership,
  );
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [debugToken, setDebugToken] = useState<string | null>(null);
  const [bridgeColor] = useState(() => {
    if (typeof window === "undefined") return null;
    return peekWorkspaceRevealPending()?.color ?? null;
  });
  const revealFinishedFor = useRef<string | null>(null);

  const canInvite = workspace?.myMembership?.permissions.includes("member:invite")
    || workspace?.myMembership?.isOwner;
  const canManage =
    workspace?.myMembership?.permissions.includes("member:change_role")
    || workspace?.myMembership?.isOwner;
  const canRemove =
    workspace?.myMembership?.permissions.includes("member:remove")
    || workspace?.myMembership?.isOwner;
  const canCreateProject =
    workspace?.myMembership?.permissions.includes("project:create")
    || workspace?.myMembership?.isOwner;
  const canSettings =
    workspace?.myMembership?.isOwner
    || workspace?.myMembership?.permissions.includes("workspace:update")
    || workspace?.myMembership?.permissions.includes("settings:manage");

  const applyPage = useCallback(
    (page: {
      workspace: WorkspaceDetail;
      members: WorkspaceMember[];
      roles: WorkspaceRole[];
      projects: ProjectSummary[];
    }) => {
      setWorkspace(page.workspace);
      setMembers(page.members);
      setRoles(page.roles);
      setProjects(page.projects);
      useEntityCache.getState().putWorkspacePage(workspaceId, page);
      const defaultRole =
        page.roles.find((r) => r.name === "Developer") ??
        page.roles.find((r) => r.name !== "Owner");
      if (defaultRole) setRoleId(defaultRole.id);
    },
    [workspaceId],
  );

  const load = useCallback(async () => {
    const hasShell = Boolean(
      getWorkspacePageCache(workspaceId)?.workspace?.myMembership,
    );
    if (!hasShell) setLoading(true);
    try {
      const page = await prefetchWorkspacePage(workspaceId);
      applyPage(page);
    } catch (error) {
      toastFromError(error);
      navigateWithCover(() => router.replace("/dashboard"));
    } finally {
      setLoading(false);
    }
  }, [workspaceId, router, applyPage]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!cached?.workspace) return;
    setWorkspace(cached.workspace);
    setMembers(cached.members);
    setRoles(cached.roles);
    setProjects(cached.projects);
    if (cached.workspace.myMembership) setLoading(false);
  }, [cached]);

  useEffect(() => {
    // Finish expand-out once per navigation — do not re-run when cache
    // refreshes `workspace` (that used to kill the hole animation).
    if (!workspace) return;
    if (revealFinishedFor.current === workspaceId) return;
    if (!peekWorkspaceRevealPending()) return;

    let cancelled = false;
    (async () => {
      await new Promise<void>((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => r())),
      );
      if (cancelled) return;
      if (revealFinishedFor.current === workspaceId) return;
      revealFinishedFor.current = workspaceId;
      await finishWorkspaceEnterReveal();
    })();
    return () => {
      cancelled = true;
    };
  }, [workspaceId, workspace]);

  async function onInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setDebugToken(null);
    try {
      const result = await inviteMember(workspaceId, { email, roleId });
      toastSuccess("Invitation sent", email);
      if (result.debugToken) setDebugToken(result.debugToken);
      setEmail("");
    } catch (error) {
      toastFromError(error);
    } finally {
      setInviting(false);
    }
  }

  async function onChangeRole(memberId: string, nextRoleId: string) {
    try {
      await changeMemberRole(workspaceId, memberId, nextRoleId);
      toastSuccess("Role updated");
      await load();
    } catch (error) {
      toastFromError(error);
    }
  }

  async function onRemove(memberId: string) {
    const member = members.find((m) => m.id === memberId);
    const ok = await confirm({
      title: "Remove member?",
      description: member
        ? `Remove ${member.user.fullName} from this workspace?`
        : "Remove this member from the workspace?",
      confirmLabel: "Remove",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await removeMember(workspaceId, memberId);
      toastSuccess("Member removed");
      await load();
    } catch (error) {
      toastFromError(error);
    }
  }

  async function onLeave() {
    const ok = await confirm({
      title: "Leave workspace?",
      description: "You will lose access until someone invites you again.",
      confirmLabel: "Leave",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await leaveWorkspace(workspaceId);
      toastSuccess("Left workspace");
      navigateWithCover(() => router.push("/dashboard"));
    } catch (error) {
      toastFromError(error);
    }
  }

  const workspaceTheme = workspace
    ? {
        themeColorFrom: workspace.themeColorFrom,
        themeColorTo: workspace.themeColorTo,
      }
    : bridgeColor
      ? { themeColorFrom: bridgeColor, themeColorTo: bridgeColor }
      : null;

  // Only block paint when we have nothing to show (Trello-style: keep chrome).
  if (!workspace) {
    return (
      <AppShell theme={workspaceTheme}>
        <p className="text-sm text-bb-muted">Loading workspace...</p>
      </AppShell>
    );
  }

  const inviteRoles = roles.filter((r) => r.name !== "Owner");

  return (
    <AppShell
      title={workspace.name}
      subtitle={workspace.description || `/${workspace.slug}`}
      theme={workspaceTheme}
    >
      <div className="mb-6 flex flex-wrap gap-3">
        <Link
          href="/dashboard"
          className={buttonClassName({
            variant: "secondary",
            size: "sm",
            className: "px-2.5",
          })}
          aria-label="All workspaces"
          title="All workspaces"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2} aria-hidden />
        </Link>
        <span className="inline-flex h-9 items-center rounded-lg bg-bb-sky px-3 text-sm font-semibold text-bb-blue">
          {workspace.myMembership?.roleName ?? "Member"}
        </span>
        <Link
          href={`/workspaces/${workspaceId}/dashboard`}
          className={buttonClassName({
            variant: "secondary",
            size: "sm",
          })}
        >
          <LayoutDashboard className="h-4 w-4" strokeWidth={2} aria-hidden />
          Dashboard
        </Link>
        <Link
          href={`/workspaces/${workspaceId}/search`}
          className={buttonClassName({
            variant: "secondary",
            size: "sm",
          })}
        >
          <Search className="h-4 w-4" strokeWidth={2} aria-hidden />
          Search
        </Link>
        <Link
          href={`/workspaces/${workspaceId}/activity`}
          className={buttonClassName({
            variant: "secondary",
            size: "sm",
          })}
        >
          <History className="h-4 w-4" strokeWidth={2} aria-hidden />
          Activity
        </Link>
        {!workspace.myMembership?.isOwner ? (
          <Button
            variant="danger"
            size="sm"
            onClick={onLeave}
            aria-label="Leave workspace"
            title="Leave workspace"
            className="px-2.5"
          >
            <LogOut className="h-4 w-4" strokeWidth={2} aria-hidden />
          </Button>
        ) : null}
        {canSettings ? (
          <Link
            href={`/workspaces/${workspaceId}/settings`}
            className={buttonClassName({
              variant: "secondary",
              size: "sm",
              className: "px-2.5",
            })}
            aria-label="Workspace settings"
            title="Workspace settings"
          >
            <Settings className="h-4 w-4" strokeWidth={2} aria-hidden />
          </Link>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section className="rounded-[12px] border border-bb-border/80 bg-bb-surface p-5 shadow-bb">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-bb-ink">Projects</h2>
                <p className="mt-1 text-sm text-bb-muted">
                  {projects.length} projects in this workspace
                </p>
              </div>
              {canCreateProject ? (
                <Link
                  href={`/workspaces/${workspaceId}/projects/new`}
                  className={buttonClassName({ variant: "primary", size: "sm" })}
                >
                  <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
                  New project
                </Link>
              ) : null}
            </div>
            {projects.length === 0 ? (
              <p className="mt-6 text-sm text-bb-muted">
                No projects yet. Create one to open a board.
              </p>
            ) : (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {projects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    onMouseEnter={() => {
                      useEntityCache
                        .getState()
                        .seedProjectFromSummary(project);
                      void prefetchProjectPage(project.id);
                    }}
                    className="rounded-[12px] border border-bb-border/70 p-4 transition hover:border-bb-blue hover:bg-bb-sky/40"
                  >
                    <div className="flex items-center gap-3">
                      <ProjectAvatar
                        name={project.name}
                        icon={project.icon}
                        themeColorFrom={project.themeColorFrom ?? project.color}
                        themeColorTo={project.themeColorTo ?? project.color}
                      />
                      <div>
                        <p className="font-bold text-bb-ink">{project.name}</p>
                        <p className="text-xs text-bb-muted">
                          {project.boardsCount ?? 0} boards ·{" "}
                          {project.tasksCount ?? 0} tasks
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-[12px] border border-bb-border/80 bg-bb-surface p-5 shadow-bb">
          <h2 className="text-lg font-bold text-bb-ink">Members</h2>
          <p className="mt-1 text-sm text-bb-muted">
            {members.length} people in this workspace
          </p>
          <ul className="mt-5 divide-y divide-bb-border/70">
            {members.map((member) => (
              <li
                key={member.id}
                className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-bb-ink">
                    {member.user.fullName}
                  </p>
                  <p className="text-sm text-bb-muted">{member.user.email}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {canManage && member.role.name !== "Owner" ? (
                    <select
                      className="h-9 rounded-[10px] border border-bb-border bg-white px-2 text-sm text-bb-ink"
                      value={member.role.id}
                      onChange={(e) => onChangeRole(member.id, e.target.value)}
                    >
                      {inviteRoles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="rounded-lg bg-bb-sky px-2.5 py-1 text-xs font-semibold text-bb-blue">
                      {member.role.name}
                    </span>
                  )}
                  {canRemove && member.role.name !== "Owner" ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemove(member.id)}
                    >
                      <UserMinus className="h-4 w-4" strokeWidth={2} aria-hidden />
                      Remove
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
        </div>

        <aside className="space-y-4">
          {canInvite ? (
            <div className="rounded-[12px] border border-bb-border/80 bg-bb-surface p-5 shadow-bb">
              <button
                type="button"
                onClick={() => setInviteOpen((open) => !open)}
                aria-expanded={inviteOpen}
                className="flex w-full items-center justify-between gap-2 text-left"
              >
                <span className="inline-flex items-center gap-2 font-bold text-bb-ink">
                  <UserPlus className="h-4 w-4" strokeWidth={2} aria-hidden />
                  Invite member
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-bb-muted transition-transform duration-200 ${
                    inviteOpen ? "rotate-180" : ""
                  }`}
                  strokeWidth={2}
                  aria-hidden
                />
              </button>
              <div className="bb-collapse" data-open={inviteOpen}>
                <div className="bb-collapse-inner">
                  <form onSubmit={onInvite} className="bb-collapse-content pt-4">
                    <p className="mb-4 text-sm text-bb-muted">
                      Send an email invite with a role.
                    </p>
                    <Field label="Email">
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </Field>
                    <Field label="Role">
                      <select
                        className="h-11 w-full rounded-[10px] border border-bb-border bg-white px-3 text-sm text-bb-ink"
                        value={roleId}
                        onChange={(e) => setRoleId(e.target.value)}
                        required
                      >
                        {inviteRoles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Button type="submit" fullWidth disabled={inviting}>
                      {inviting ? (
                        "Sending..."
                      ) : (
                        <>
                          <Send className="h-4 w-4" strokeWidth={2} aria-hidden />
                          Send invite
                        </>
                      )}
                    </Button>
                    {debugToken ? (
                      <Alert tone="info" className="mt-4 mb-0">
                        Dev:{" "}
                        <Link
                          className="font-semibold text-bb-blue underline"
                          href={`/workspaces/invitations?token=${debugToken}`}
                        >
                          open invite
                        </Link>
                      </Alert>
                    ) : null}
                  </form>
                </div>
              </div>
            </div>
          ) : null}

          <div className="rounded-[12px] border border-bb-border/80 bg-bb-surface p-5 shadow-bb">
            <h2 className="font-bold text-bb-ink">Overview</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-bb-muted">Owner</dt>
                <dd className="font-semibold text-bb-ink">
                  {workspace.owner?.fullName ?? "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-bb-muted">Slug</dt>
                <dd className="font-semibold text-bb-ink">{workspace.slug}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-bb-muted">Members</dt>
                <dd className="font-semibold text-bb-ink">
                  {workspace.membersCount ?? members.length}
                </dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

export default function WorkspacePage() {
  return <WorkspaceDetailContent />;
}
