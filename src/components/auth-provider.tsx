"use client";

import { useEffect } from "react";
import { useRealtimeConnection } from "@/hooks/use-realtime-connection";
import { useAuthStore } from "@/stores/auth-store";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const initialized = useAuthStore((s) => s.initialized);
  useRealtimeConnection();

  useEffect(() => {
    if (!initialized) {
      void fetchMe();
    }
  }, [fetchMe, initialized]);

  return <>{children}</>;
}
