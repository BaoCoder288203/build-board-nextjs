"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { api, setAccessToken } from "@/lib/api";
import { toastError, toastSuccess } from "@/lib/toast";
import { useAuthStore } from "@/stores/auth-store";

function OAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fetchMe = useAuthStore((s) => s.fetchMe);

  useEffect(() => {
    let cancelled = false;

    async function finish() {
      const error = searchParams.get("error");
      if (error) {
        toastError("Google sign-in failed", error.replaceAll("_", " "));
        router.replace("/login");
        return;
      }

      try {
        const { data } = await api.post("/auth/refresh-token", {});
        if (cancelled) return;
        setAccessToken(data.data.accessToken);
        await fetchMe();
        const returnTo = searchParams.get("returnTo") ?? "/dashboard";
        if (returnTo.startsWith("/profile")) {
          toastSuccess("Google account connected");
        } else {
          toastSuccess("Signed in with Google");
        }
        router.replace(returnTo.startsWith("/") ? returnTo : "/dashboard");
      } catch {
        if (cancelled) return;
        toastError("Could not complete Google sign-in");
        router.replace("/login");
      }
    }

    void finish();
    return () => {
      cancelled = true;
    };
  }, [fetchMe, router, searchParams]);

  return (
    <AuthShell title="Signing you in" subtitle="Completing Google authentication…">
      <p className="text-center text-sm text-bb-muted">Please wait…</p>
    </AuthShell>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <AuthShell title="Signing you in" subtitle="Completing Google authentication…">
          <p className="text-center text-sm text-bb-muted">Please wait…</p>
        </AuthShell>
      }
    >
      <OAuthCallbackContent />
    </Suspense>
  );
}
