"use client";

import Link from "next/link";
import { useState } from "react";
import { Alert, AuthShell, Field } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { toastFromError, toastSuccess } from "@/lib/toast";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [debugToken, setDebugToken] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setDebugToken(null);
    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      toastSuccess("Check your email", data.message);
      if (data.data?.debugToken) setDebugToken(data.data.debugToken);
    } catch (err) {
      toastFromError(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Forgot password"
      subtitle="Enter your email and we’ll send a reset link if the account exists."
    >
      <form onSubmit={onSubmit}>
        <Field label="Email">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </Field>
        {debugToken ? (
          <Alert tone="info">
            Dev reset link:{" "}
            <Link
              className="font-semibold text-bb-blue underline"
              href={`/reset-password?token=${debugToken}`}
            >
              reset now
            </Link>
          </Alert>
        ) : null}
        <Button type="submit" fullWidth disabled={loading}>
          {loading ? "Sending..." : "Send reset link"}
        </Button>
      </form>
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
