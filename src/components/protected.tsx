"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";

export function Protected({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);

  useEffect(() => {
    if (initialized && !user) {
      router.replace("/login");
    }
  }, [initialized, user, router]);

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bb-canvas text-sm text-bb-muted">
        Loading your workspace...
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
