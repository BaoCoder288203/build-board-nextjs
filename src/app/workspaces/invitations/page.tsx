"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Protected } from "@/components/protected";
import { Button } from "@/components/ui/button";
import { toastFromError, toastSuccess } from "@/lib/toast";
import { acceptInvitation, rejectInvitation } from "@/lib/workspaces";

function InvitationInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";
  const [loading, setLoading] = useState<"accept" | "reject" | null>(null);

  async function onAccept() {
    setLoading("accept");
    try {
      const result = await acceptInvitation(token);
      toastSuccess("Joined workspace");
      router.push(`/workspaces/${result.workspaceId}`);
    } catch (error) {
      toastFromError(error);
    } finally {
      setLoading(null);
    }
  }

  async function onReject() {
    setLoading("reject");
    try {
      await rejectInvitation(token);
      toastSuccess("Invitation declined");
      router.push("/dashboard");
    } catch (error) {
      toastFromError(error);
    } finally {
      setLoading(null);
    }
  }

  return (
    <AppShell
      title="Workspace invitation"
      subtitle="Accept to join the team, or decline if this wasn’t for you."
    >
      {!token ? (
        <p className="text-sm text-bb-danger">Missing invitation token.</p>
      ) : (
        <div className="flex max-w-md flex-wrap gap-3">
          <Button onClick={onAccept} disabled={!!loading}>
            {loading === "accept" ? "Joining..." : "Accept invitation"}
          </Button>
          <Button
            variant="secondary"
            onClick={onReject}
            disabled={!!loading}
          >
            {loading === "reject" ? "Declining..." : "Decline"}
          </Button>
        </div>
      )}
    </AppShell>
  );
}

export default function InvitationPage() {
  return (
    <Protected>
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center text-sm text-bb-muted">
            Loading invitation...
          </div>
        }
      >
        <InvitationInner />
      </Suspense>
    </Protected>
  );
}
