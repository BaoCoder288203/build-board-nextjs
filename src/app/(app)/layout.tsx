"use client";

import type { ReactNode } from "react";
import { AppShellProvider } from "@/components/app-shell";
import { Protected } from "@/components/protected";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Protected>
      <AppShellProvider>{children}</AppShellProvider>
    </Protected>
  );
}
