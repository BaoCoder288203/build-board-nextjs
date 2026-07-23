"use client";

import { LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Logo } from "@/components/brand/logo";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { UserAvatarMenu } from "@/components/user-avatar-menu";
import { endRouteCover } from "@/lib/route-cover";
import {
  workspaceCanvasStyle,
  type ThemeColors,
} from "@/lib/visual-identity";

export type AppShellChrome = "default" | "none";

type AppShellMeta = {
  title?: string;
  subtitle?: string;
  theme?: ThemeColors | null;
};

type AppShellContextValue = {
  setMeta: (meta: AppShellMeta) => void;
};

const AppShellContext = createContext<AppShellContextValue | null>(null);

const DEFAULT_META: AppShellMeta = {
  title: undefined,
  subtitle: undefined,
  theme: null,
};

/**
 * Persistent chrome for authenticated routes. Stays mounted across navigations
 * so the canvas never unmounts (avoids body #f7f8f9 flash).
 */
export function AppShellProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [meta, setMeta] = useState<AppShellMeta>(DEFAULT_META);
  const chrome: AppShellChrome = pathname.startsWith("/boards/")
    ? "none"
    : "default";
  const canvasStyle = workspaceCanvasStyle(meta.theme);
  const value = useMemo(() => ({ setMeta }), []);

  useLayoutEffect(() => {
    const bg = canvasStyle?.background ?? "var(--bb-canvas)";
    document.body.style.background = bg;
    document.documentElement.style.background = bg;
    return () => {
      document.body.style.background = "";
      document.documentElement.style.background = "";
    };
  }, [canvasStyle]);

  // Clear any leftover generic cover after paint (covers are no longer auto-applied).
  useLayoutEffect(() => {
    void endRouteCover(true);
  }, [pathname]);

  useEffect(() => {
    return () => {
      void endRouteCover(true);
    };
  }, []);

  return (
    <AppShellContext.Provider value={value}>
      <div
        data-bb-app-shell
        className={`min-h-screen ${canvasStyle ? "" : "bg-bb-canvas"}`}
        style={canvasStyle}
      >
        {chrome === "default" ? (
          <>
            <header className="sticky top-0 z-20 border-b border-bb-border/80 bg-bb-surface/95 backdrop-blur">
              <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
                <div className="flex items-center gap-6">
                  <Logo />
                  <nav className="hidden items-center gap-1 sm:flex">
                    <Link
                      href="/dashboard"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-bb-sky px-3 py-1.5 text-sm font-semibold text-bb-blue"
                    >
                      <LayoutDashboard
                        className="h-4 w-4"
                        strokeWidth={2}
                        aria-hidden
                      />
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
              {meta.title ? (
                <div className="mb-8">
                  <h1 className="text-3xl font-bold tracking-tight text-bb-ink">
                    {meta.title}
                  </h1>
                  {meta.subtitle ? (
                    <p className="mt-2 max-w-2xl text-sm text-bb-muted">
                      {meta.subtitle}
                    </p>
                  ) : null}
                </div>
              ) : null}
              {children}
            </main>
          </>
        ) : (
          children
        )}
      </div>
    </AppShellContext.Provider>
  );
}

/**
 * Registers page title/theme with the persistent shell. Does not render its
 * own canvas — only children — so navigations keep the outer shell mounted.
 */
export function AppShell({
  children,
  title,
  subtitle,
  theme,
  chrome: _chrome,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  theme?: ThemeColors | null;
  /** @deprecated Chrome is derived from the route (`/boards/*` → none). */
  chrome?: AppShellChrome;
}) {
  const ctx = useContext(AppShellContext);

  useLayoutEffect(() => {
    if (!ctx) return;
    ctx.setMeta({ title, subtitle, theme: theme ?? null });
  }, [ctx, title, subtitle, theme]);

  if (!ctx) {
    const canvasStyle = workspaceCanvasStyle(theme);
    return (
      <div
        className={`min-h-screen ${canvasStyle ? "" : "bg-bb-canvas"}`}
        style={canvasStyle}
      >
        {children}
      </div>
    );
  }

  return <>{children}</>;
}
