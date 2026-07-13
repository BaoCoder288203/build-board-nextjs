"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell, Field } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/auth-store";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const loading = useAuthStore((s) => s.loading);

  const [email, setEmail] = useState("admin@buildboard.local");
  const [password, setPassword] = useState("Password123!");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch {
      // toasted in store
    }
  }

  return (
    <AuthShell
      title="Log in to BuildBoard"
      subtitle="Continue to your workspace boards."
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
        <Field label="Password">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </Field>
        <Button type="submit" fullWidth disabled={loading}>
          {loading ? "Signing in..." : "Continue"}
        </Button>
      </form>
      <div className="mt-6 space-y-2 text-center text-sm text-bb-muted">
        <p>
          <Link
            href="/forgot-password"
            className="font-semibold text-bb-blue hover:underline"
          >
            Forgot password?
          </Link>
        </p>
        <p>
          No account?{" "}
          <Link
            href="/register"
            className="font-semibold text-bb-blue hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
