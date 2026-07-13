"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { Alert, AuthShell, Field } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { toastFromError, toastSuccess } from "@/lib/toast";

function ResetPasswordInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      setDone(true);
      toastSuccess("Password updated", "Redirecting to log in...");
      setTimeout(() => router.push("/login"), 1500);
    } catch (err) {
      toastFromError(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Use at least 8 characters with upper, lower, number, and symbol."
    >
      {!token ? (
        <Alert tone="danger">Missing reset token.</Alert>
      ) : done ? (
        <p className="text-sm text-bb-muted">Redirecting to log in...</p>
      ) : (
        <form onSubmit={onSubmit}>
          <Field label="New password">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </Field>
          <Button type="submit" fullWidth disabled={loading}>
            {loading ? "Saving..." : "Update password"}
          </Button>
        </form>
      )}
      <p className="mt-6 text-center text-sm text-bb-muted">
        <Link
          href="/login"
          className="font-semibold text-bb-blue hover:underline"
        >
          Back to log in
        </Link>
      </p>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-bb-muted">
          Loading...
        </div>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  );
}
