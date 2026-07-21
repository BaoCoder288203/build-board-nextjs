"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { navigateWithCover } from "@/lib/route-cover";
import { createWorkspace, slugify } from "@/lib/workspaces";
import { toastFromError, toastSuccess } from "@/lib/toast";

function NewWorkspaceContent() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const ws = await createWorkspace({
        name,
        slug: slug || slugify(name),
        description: description || undefined,
      });
      toastSuccess("Workspace created", ws.name);
      navigateWithCover(() =>
        router.push(`/workspaces/${ws.id ?? ws.workspaceId}`),
      );
    } catch (error) {
      toastFromError(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell
      title="Create workspace"
      subtitle="A workspace holds your projects, boards, and teammates."
    >
      <form
        onSubmit={onSubmit}
        className="bb-animate-fade-up max-w-lg rounded-[12px] border border-bb-border/80 bg-bb-surface p-6 shadow-bb"
      >
        <Field label="Name">
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
            required
            minLength={3}
            placeholder="Acme Engineering"
          />
        </Field>
        <Field label="Slug">
          <Input
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value.toLowerCase());
            }}
            required
            minLength={3}
            pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
            placeholder="acme-engineering"
          />
        </Field>
        <Field label="Description">
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            placeholder="Optional"
          />
        </Field>
        <div className="mt-2 flex gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create workspace"}
          </Button>
          <Link
            href="/dashboard"
            className="inline-flex h-11 items-center px-4 text-sm font-semibold text-bb-muted hover:text-bb-ink"
          >
            Cancel
          </Link>
        </div>
      </form>
    </AppShell>
  );
}

export default function NewWorkspacePage() {
  return <NewWorkspaceContent />;
}
