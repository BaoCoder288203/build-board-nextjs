"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Protected } from "@/components/protected";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { createProject } from "@/lib/projects";
import { slugify } from "@/lib/workspaces";
import { toastFromError, toastSuccess } from "@/lib/toast";

function NewProjectContent() {
  const params = useParams<{ workspaceId: string }>();
  const router = useRouter();
  const workspaceId = params.workspaceId;

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const project = await createProject({
        workspaceId,
        name,
        slug: slug || slugify(name),
        description: description || undefined,
        visibility: "WORKSPACE",
      });
      toastSuccess("Project created", project.name);
      router.push(`/projects/${project.id ?? project.projectId}`);
    } catch (error) {
      toastFromError(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell
      title="Create project"
      subtitle="Projects hold boards, columns, and upcoming tasks."
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
            placeholder="Website Redesign"
          />
        </Field>
        <Field label="Slug">
          <Input
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value.toLowerCase());
            }}
            minLength={3}
            placeholder="website-redesign"
          />
        </Field>
        <Field label="Description">
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            placeholder="Optional"
          />
        </Field>
        <div className="mt-2 flex gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create project"}
          </Button>
          <Link
            href={`/workspaces/${workspaceId}`}
            className="inline-flex h-11 items-center px-4 text-sm font-semibold text-bb-muted hover:text-bb-ink"
          >
            Cancel
          </Link>
        </div>
      </form>
    </AppShell>
  );
}

export default function NewProjectPage() {
  return (
    <Protected>
      <NewProjectContent />
    </Protected>
  );
}
