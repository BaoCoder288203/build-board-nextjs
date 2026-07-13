"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Alert, AuthShell } from "@/components/auth-shell";
import { buttonClassName } from "@/components/ui/button";
import { api } from "@/lib/api";
import { toastFromError, toastSuccess } from "@/lib/toast";

function VerifyEmailInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">(
    token ? "loading" : "idle",
  );

  useEffect(() => {
    if (!token) {
      toastFromError(new Error("Missing verification token."));
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.post("/auth/verify-email", { token });
        if (!cancelled) {
          setStatus("ok");
          toastSuccess("Email verified", data.message);
        }
      } catch (error) {
        if (!cancelled) {
          setStatus("error");
          toastFromError(error);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <AuthShell
      title="Verify your email"
      subtitle="Confirm your address to unlock BuildBoard."
    >
      {!token ? <Alert tone="danger">Missing verification token.</Alert> : null}
      {status === "loading" ? (
        <p className="text-sm text-bb-muted">Verifying your email...</p>
      ) : null}
      {status === "ok" ? (
        <div className="space-y-4">
          <p className="text-sm text-bb-muted">
            Your email is confirmed. You can sign in now.
          </p>
          <Link href="/login" className={buttonClassName({ fullWidth: true })}>
            Continue to log in
          </Link>
        </div>
      ) : null}
      {status === "error" || status === "idle" ? (
        <div className="mt-2">
          <Link
            href="/login"
            className={buttonClassName({
              variant: "secondary",
              fullWidth: true,
            })}
          >
            Back to log in
          </Link>
        </div>
      ) : null}
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-bb-muted">
          Loading...
        </div>
      }
    >
      <VerifyEmailInner />
    </Suspense>
  );
}
