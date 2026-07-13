"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Suspense, useEffect, useRef, useState } from "react";
import { Alert, AuthShell } from "@/components/auth-shell";
import { buttonClassName } from "@/components/ui/button";
import { api, type ApiSuccess } from "@/lib/api";
import { toastFromError, toastSuccess } from "@/lib/toast";

function VerifyEmailInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const verifyPromise = useRef<Promise<ApiSuccess<null>> | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">(
    token ? "loading" : "idle",
  );

  useEffect(() => {
    if (!token) {
      toastFromError(new Error("Missing verification token."));
      return;
    }

    let cancelled = false;

    if (!verifyPromise.current) {
      verifyPromise.current = api
        .post<ApiSuccess<null>>("/auth/verify-email", { token })
        .then((res) => res.data);
    }

    verifyPromise.current
      .then((data) => {
        if (cancelled) return;
        setStatus("ok");
        toastSuccess("Email verified", data.message);
      })
      .catch((error) => {
        if (cancelled) return;
        setStatus("error");
        toastFromError(error);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (status !== "ok") return;
    const id = window.setTimeout(() => {
      router.replace("/login");
    }, 1800);
    return () => window.clearTimeout(id);
  }, [status, router]);

  return (
    <AuthShell
      title="Verify your email"
      subtitle="Confirm your address to unlock BuildBoard."
    >
      {!token ? <Alert tone="danger">Missing verification token.</Alert> : null}
      {status === "loading" ? (
        <div className="flex items-center gap-2 text-sm text-bb-muted">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Verifying your email...
        </div>
      ) : null}
      {status === "ok" ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
            <CheckCircle2
              className="mt-0.5 size-5 shrink-0 text-emerald-600"
              aria-hidden
            />
            <div>
              <p className="text-sm font-medium text-emerald-900">
                Email verified successfully
              </p>
              <p className="mt-0.5 text-sm text-emerald-800/80">
                Redirecting you to log in...
              </p>
            </div>
          </div>
          <Link href="/login" className={buttonClassName({ fullWidth: true })}>
            Continue to log in
          </Link>
        </div>
      ) : null}
      {status === "error" ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <XCircle
              className="mt-0.5 size-5 shrink-0 text-red-600"
              aria-hidden
            />
            <div>
              <p className="text-sm font-medium text-red-900">
                Verification failed
              </p>
              <p className="mt-0.5 text-sm text-red-800/80">
                This link may be invalid or expired. Try signing in or request a
                new verification email.
              </p>
            </div>
          </div>
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
      {status === "idle" ? (
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
