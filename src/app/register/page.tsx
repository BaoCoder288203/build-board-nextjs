"use client";

import Link from "next/link";
import { useState } from "react";
import { Alert, AuthShell, Field } from "@/components/auth-shell";
import { GuestOnly } from "@/components/guest-only";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { useAuthStore } from "@/stores/auth-store";

export default function RegisterPage() {
  const register = useAuthStore((s) => s.register);
  const loading = useAuthStore((s) => s.loading);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [debugToken, setDebugToken] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setDebugToken(null);
    try {
      const result = await register(fullName, email, password);
      if (result.debugToken) setDebugToken(result.debugToken);
    } catch {
      // toasted in store
    }
  }

  return (
    <GuestOnly>
    <AuthShell
      title="Sign up for BuildBoard"
      subtitle="Create an account — verify your email before your first login."
    >
      <form onSubmit={onSubmit}>
        <Field label="Full name">
          <Input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            minLength={2}
            autoComplete="name"
          />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </Field>
        <Field label="Password">
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            placeholder="8+ chars with upper, lower, number, symbol"
            autoComplete="new-password"
          />
        </Field>
        {debugToken ? (
          <Alert tone="info">
            Dev verify link:{" "}
            <Link
              className="font-semibold text-bb-blue underline"
              href={`/verify-email?token=${debugToken}`}
            >
              verify now
            </Link>
          </Alert>
        ) : null}
        <Button type="submit" fullWidth disabled={loading}>
          {loading ? "Creating..." : "Create account"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-bb-muted">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-bb-blue hover:underline"
        >
          Log in
        </Link>
      </p>
    </AuthShell>
    </GuestOnly>
  );
}
