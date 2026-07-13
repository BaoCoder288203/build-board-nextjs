"use client";

import { Plus, Send, UserMinus } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Protected } from "@/components/protected";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClassName } from "@/components/ui/button";
import { Field } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toastFromError, toastSuccess } from "@/lib/toast";
import {
  changeMemberRole,
  fetchMembers,
  fetchRoles,
  fetchWorkspace,
  inviteMember,
  leaveWorkspace,
  removeMember,
  type WorkspaceDetail,
  type WorkspaceMember,
  type WorkspaceRole,
} from "@/lib/workspaces";
import {
  fetchProjects,
  type ProjectSummary,
} from "@/lib/projects";

function WorkspaceDetailContent() {
  const params = useParams<{ workspaceId: string }>();
  const router = useRouter();
  const workspaceId = params.workspaceId;

  const [workspace, setWorkspace] = useState<WorkspaceDetail | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [roles, setRoles] = useState<WorkspaceRole[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState("");
  const [inviting, setInviting] = useState(false);
  const [debugToken, setDebugToken] = useState<string | null>(null);

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

  const load = useCallback(async () => {
    try {
      const [ws, mem, roleList, projectList] = await Promise.all([
        fetchWorkspace(workspaceId),
        fetchMembers(workspaceId),
        fetchRoles(workspaceId),
        fetchProjects(workspaceId),
      ]);
      setWorkspace(ws);
      setMembers(mem.items);
      setRoles(roleList);
      setProjects(projectList.items);
      const defaultRole =
        roleList.find((r) => r.name === "Developer") ??
        roleList.find((r) => r.name !== "Owner");
      if (defaultRole) setRoleId(defaultRole.id);
    } catch (error) {
      toastFromError(error);
      router.replace("/dashboard");
    } finally {
      setLoading(false);
    }
  }, [workspaceId, router]);

  useEffect(() => {
    void load();
  }, [load]);

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
    try {
      await removeMember(workspaceId, memberId);
      toastSuccess("Member removed");
      await load();
    } catch (error) {
      toastFromError(error);
    }
  }

  async function onLeave() {
    try {
      await leaveWorkspace(workspaceId);
      toastSuccess("Left workspace");
      router.push("/dashboard");
    } catch (error) {
      toastFromError(error);
    }
  }

  if (loading || !workspace) {
    return (
      <AppShell>
        <p className="text-sm text-bb-muted">Loading workspace...</p>
      </AppShell>
    );
  }

  const inviteRoles = roles.filter((r) => r.name !== "Owner");

  return (
    <AppShell
      title={workspace.name}
      subtitle={workspace.description || `/${workspace.slug}`}
    >
      <div className="mb-6 flex flex-wrap gap-3">
        <Link
          href="/dashboard"
          className={buttonClassName({ variant: "secondary", size: "sm" })}
        >
          All workspaces
        </Link>
        <span className="inline-flex h-9 items-center rounded-lg bg-bb-sky px-3 text-sm font-semibold text-bb-blue">
          {workspace.myMembership?.roleName ?? "Member"}
        </span>
        {!workspace.myMembership?.isOwner ? (
          <Button variant="ghost" size="sm" onClick={onLeave}>
            Leave workspace
          </Button>
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
                    className="rounded-[12px] border border-bb-border/70 p-4 transition hover:border-bb-blue hover:bg-bb-sky/40"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="h-10 w-10 rounded-lg"
                        style={{ background: project.color || "#0C66E4" }}
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
            <form
              onSubmit={onInvite}
              className="rounded-[12px] border border-bb-border/80 bg-bb-surface p-5 shadow-bb"
            >
              <h2 className="font-bold text-bb-ink">Invite member</h2>
              <p className="mt-1 text-sm text-bb-muted">
                Send an email invite with a role.
              </p>
              <div className="mt-4">
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
              </div>
            </form>
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
  return (
    <Protected>
      <WorkspaceDetailContent />
    </Protected>
  );
}
