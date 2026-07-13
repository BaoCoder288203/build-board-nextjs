"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";

/** Redirects authenticated users away from guest-only pages (home, login, register). */
export function GuestOnly({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);

  useEffect(() => {
    if (initialized && user) {
      router.replace("/dashboard");
    }
  }, [initialized, user, router]);

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bb-canvas text-sm text-bb-muted">
        Loading...
      </div>
    );
  }

  if (user) return null;

  return <>{children}</>;
}
