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
import { toastFromError, toastSuccess } from "@/lib/toast";
import {
  deleteWorkspace,
  fetchWorkspace,
  fetchWorkspaceSettings,
  updateWorkspace,
  updateWorkspaceSettings,
  type WorkspaceDetail,
  type WorkspaceSettings,
} from "@/lib/workspaces";

export default function WorkspaceSettingsPage() {
  const params = useParams<{ workspaceId: string }>();
  const router = useRouter();
  const workspaceId = params.workspaceId;

  const [workspace, setWorkspace] = useState<WorkspaceDetail | null>(null);
  const [settings, setSettings] = useState<WorkspaceSettings | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canUpdate =
    workspace?.myMembership?.isOwner ||
    workspace?.myMembership?.permissions.includes("workspace:update");
  const canManageSettings =
    workspace?.myMembership?.isOwner ||
    workspace?.myMembership?.permissions.includes("settings:manage");
  const canDelete = workspace?.myMembership?.isOwner;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const ws = await fetchWorkspace(workspaceId);
      setWorkspace(ws);
      setName(ws.name);
      setDescription(ws.description ?? "");
      try {
        setSettings(await fetchWorkspaceSettings(workspaceId));
      } catch {
        setSettings(null);
      }
    } catch (error) {
      toastFromError(error);
      navigateWithCover(() => router.replace("/dashboard"));
    } finally {
      setLoading(false);
    }
  }, [workspaceId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSaveGeneral(e: React.FormEvent) {
    e.preventDefault();
    if (!canUpdate) return;
    setSaving(true);
    try {
      const next = await updateWorkspace(workspaceId, {
        name: name.trim(),
        description: description.trim() || null,
      });
      setWorkspace((prev) => (prev ? { ...prev, ...next } : next));
      toastSuccess("Workspace updated");
    } catch (error) {
      toastFromError(error);
    } finally {
      setSaving(false);
    }
  }

  async function onSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!settings || !canManageSettings) return;
    setSavingSettings(true);
    try {
      const next = await updateWorkspaceSettings(workspaceId, settings);
      setSettings(next);
      toastSuccess("Settings saved");
    } catch (error) {
      toastFromError(error);
    } finally {
      setSavingSettings(false);
    }
  }

  async function onDelete() {
    if (!canDelete) return;
    if (
      !window.confirm(
        `Delete workspace “${workspace?.name}”? This cannot be undone.`,
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      await deleteWorkspace(workspaceId);
      toastSuccess("Workspace deleted");
      navigateWithCover(() => router.replace("/dashboard"));
    } catch (error) {
      toastFromError(error);
    } finally {
      setDeleting(false);
    }
  }

  const theme = workspace
    ? {
        themeColorFrom: workspace.themeColorFrom,
        themeColorTo: workspace.themeColorTo,
      }
    : null;

  if (loading || !workspace) {
    return (
      <AppShell theme={theme}>
        <p className="text-sm text-bb-muted">Loading settings…</p>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Workspace settings"
      subtitle={workspace.name}
      theme={theme}
    >
      <div className="mb-6">
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

      <div className="mx-auto max-w-xl space-y-6">
        <form
          onSubmit={onSaveGeneral}
          className="space-y-4 rounded-[12px] border border-bb-border/80 bg-bb-surface p-5 shadow-bb"
        >
          <h2 className="text-base font-bold text-bb-ink">General</h2>
          <Field label="Name">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={3}
              disabled={!canUpdate}
            />
          </Field>
          <Field label="Description">
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              disabled={!canUpdate}
            />
          </Field>
          <p className="text-xs text-bb-muted">Slug: /{workspace.slug}</p>
          {canUpdate ? (
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          ) : (
            <p className="text-sm text-bb-muted">
              You don’t have permission to edit this workspace.
            </p>
          )}
        </form>

        {settings && canManageSettings ? (
          <form
            onSubmit={onSaveSettings}
            className="space-y-2 rounded-[12px] border border-bb-border/80 bg-bb-surface p-5 shadow-bb"
          >
            <h2 className="mb-2 text-base font-bold text-bb-ink">Preferences</h2>
            {(
              [
                ["allowGuest", "Allow guests"],
                ["allowPublicProject", "Allow public projects"],
                ["allowAi", "Allow AI features"],
                ["allowFileUpload", "Allow file uploads"],
              ] as const
            ).map(([key, label]) => (
              <label
                key={key}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-1 py-2 hover:bg-bb-sky/40"
              >
                <input
                  type="checkbox"
                  checked={Boolean(settings[key])}
                  onChange={() =>
                    setSettings((prev) =>
                      prev ? { ...prev, [key]: !prev[key] } : prev,
                    )
                  }
                  className="h-4 w-4 accent-bb-blue"
                />
                <span className="text-sm font-semibold text-bb-ink">
                  {label}
                </span>
              </label>
            ))}
            <Field label="Default language">
              <Input
                value={settings.defaultLanguage ?? ""}
                onChange={(e) =>
                  setSettings((prev) =>
                    prev
                      ? { ...prev, defaultLanguage: e.target.value }
                      : prev,
                  )
                }
              />
            </Field>
            <Field label="Default timezone">
              <Input
                value={settings.defaultTimezone ?? ""}
                onChange={(e) =>
                  setSettings((prev) =>
                    prev
                      ? { ...prev, defaultTimezone: e.target.value }
                      : prev,
                  )
                }
              />
            </Field>
            <Button type="submit" disabled={savingSettings}>
              {savingSettings ? "Saving…" : "Save preferences"}
            </Button>
          </form>
        ) : null}

        {canDelete ? (
          <section className="rounded-[12px] border border-bb-danger/30 bg-bb-danger-bg/40 p-5">
            <h2 className="text-base font-bold text-bb-danger">Danger zone</h2>
            <p className="mt-1 text-sm text-bb-muted">
              Permanently delete this workspace and its projects.
            </p>
            <Button
              type="button"
              variant="danger"
              className="mt-4"
              disabled={deleting}
              onClick={() => void onDelete()}
            >
              {deleting ? "Deleting…" : "Delete workspace"}
            </Button>
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}
