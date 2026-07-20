"use client";

import { LayoutDashboard } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { UserAvatarMenu } from "@/components/user-avatar-menu";

export function AppShell({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="min-h-screen bg-bb-canvas">
      <header className="sticky top-0 z-20 border-b border-bb-border/80 bg-bb-surface/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Logo />
            <nav className="hidden items-center gap-1 sm:flex">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-lg bg-bb-sky px-3 py-1.5 text-sm font-semibold text-bb-blue"
              >
                <LayoutDashboard className="h-4 w-4" strokeWidth={2} aria-hidden />
                Workspaces
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <NotificationBell />
            <UserAvatarMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        {title ? (
          <div className="bb-animate-fade-up mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-bb-ink">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-2 max-w-2xl text-sm text-bb-muted">{subtitle}</p>
            ) : null}
          </div>
        ) : null}
        {children}
      </main>
    </div>
  );
}
