"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button, buttonClassName } from "@/components/ui/button";
import { Field } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { navigateWithCover } from "@/lib/route-cover";
import { confirm } from "@/lib/confirm";
import { toastFromError, toastSuccess } from "@/lib/toast";
import {
  archiveProject,
  deleteProject,
  fetchProject,
  updateProject,
  type ProjectSummary,
} from "@/lib/projects";

export default function ProjectSettingsPage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const projectId = params.projectId;

  const [project, setProject] = useState<ProjectSummary | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"PRIVATE" | "WORKSPACE">(
    "WORKSPACE",
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);

  const canManage =
    project?.canManage ||
    project?.myRole === "OWNER" ||
    project?.myRole === "PROJECT_MANAGER";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = await fetchProject(projectId);
      setProject(p);
      setName(p.name);
      setDescription(p.description ?? "");
      setVisibility(
        (p.visibility as "PRIVATE" | "WORKSPACE") || "WORKSPACE",
      );
    } catch (error) {
      toastFromError(error);
      navigateWithCover(() => router.replace("/dashboard"));
    } finally {
      setLoading(false);
    }
  }, [projectId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!canManage) return;
    setSaving(true);
    try {
      const next = await updateProject(projectId, {
        name: name.trim(),
        description: description.trim() || null,
        visibility,
      });
      setProject(next);
      toastSuccess("Project updated");
    } catch (error) {
      toastFromError(error);
    } finally {
      setSaving(false);
    }
  }

  async function onArchive() {
    if (!canManage) return;
    const ok = await confirm({
      title: "Archive project?",
      description: `Archive project “${project?.name}”? You can still manage it later from settings if needed.`,
      confirmLabel: "Archive",
      tone: "default",
    });
    if (!ok) return;
    setBusy(true);
    try {
      await archiveProject(projectId);
      toastSuccess("Project archived");
      navigateWithCover(() =>
        router.push(`/workspaces/${project?.workspaceId}`),
      );
    } catch (error) {
      toastFromError(error);
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!canManage) return;
    const ok = await confirm({
      title: "Delete project?",
      description: `Delete project “${project?.name}”? This cannot be undone.`,
      confirmLabel: "Delete project",
      tone: "danger",
    });
    if (!ok) return;
    setBusy(true);
    try {
      const workspaceId = project?.workspaceId;
      await deleteProject(projectId);
      toastSuccess("Project deleted");
      navigateWithCover(() =>
        router.push(workspaceId ? `/workspaces/${workspaceId}` : "/dashboard"),
      );
    } catch (error) {
      toastFromError(error);
    } finally {
      setBusy(false);
    }
  }

  const theme = project
    ? {
        themeColorFrom: project.themeColorFrom ?? project.color,
        themeColorTo: project.themeColorTo ?? project.color,
      }
    : null;

  if (loading || !project) {
    return (
      <AppShell theme={theme}>
        <p className="text-sm text-bb-muted">Loading settings…</p>
      </AppShell>
    );
  }

  return (
    <AppShell title="Project settings" subtitle={project.name} theme={theme}>
      <div className="mb-6">
        <Link
          href={`/projects/${projectId}`}
          className={buttonClassName({
            variant: "secondary",
            size: "sm",
            className: "px-2.5",
          })}
          aria-label="Back to project"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2} aria-hidden />
        </Link>
      </div>

      <div className="mx-auto max-w-xl space-y-6">
        <form
          onSubmit={onSave}
          className="space-y-4 rounded-[12px] border border-bb-border/80 bg-bb-surface p-5 shadow-bb"
        >
          <h2 className="text-base font-bold text-bb-ink">General</h2>
          <Field label="Name">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={3}
              disabled={!canManage}
            />
          </Field>
          <Field label="Description">
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
              disabled={!canManage}
            />
          </Field>
          <Field label="Visibility">
            <select
              className="h-11 w-full rounded-[10px] border border-bb-border bg-white px-3 text-sm"
              value={visibility}
              onChange={(e) =>
                setVisibility(e.target.value as "PRIVATE" | "WORKSPACE")
              }
              disabled={!canManage}
            >
              <option value="WORKSPACE">Workspace</option>
              <option value="PRIVATE">Private</option>
            </select>
          </Field>
          {canManage ? (
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          ) : (
            <p className="text-sm text-bb-muted">
              You don’t have permission to edit this project.
            </p>
          )}
        </form>

        {canManage ? (
          <section className="space-y-3 rounded-[12px] border border-bb-danger/30 bg-bb-danger-bg/40 p-5">
            <h2 className="text-base font-bold text-bb-danger">Danger zone</h2>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => void onArchive()}
              >
                Archive project
              </Button>
              <Button
                type="button"
                variant="danger"
                disabled={busy}
                onClick={() => void onDelete()}
              >
                Delete project
              </Button>
            </div>
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}
