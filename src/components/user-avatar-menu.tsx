"use client";

import { Archive, Bell, KeyRound, LogOut, User } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useEntityCache } from "@/stores/entity-cache";

type Props = {
  variant?: "default" | "onDark";
};

function workspaceIdFromPath(pathname: string): string | undefined {
  const m = pathname.match(/^\/workspaces\/([^/]+)/);
  return m?.[1];
}

export function UserAvatarMenu({ variant = "default" }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const workspaceList = useEntityCache((s) => s.workspaceList);
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pathWorkspaceId = workspaceIdFromPath(pathname);
  const archivedHref = pathWorkspaceId
    ? `/workspaces/${pathWorkspaceId}/archived`
    : workspaceList?.[0]
      ? `/workspaces/${workspaceList[0].id}/archived`
      : null;

  function clearCloseTimer() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function openMenu() {
    clearCloseTimer();
    setOpen(true);
  }

  function scheduleClose() {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  }

  async function onLogout() {
    setOpen(false);
    await logout();
    router.replace("/");
  }

  const initial = (user?.fullName?.[0] ?? "U").toUpperCase();
  const isDark = variant === "onDark";

  return (
    <div
      className="relative"
      onMouseEnter={openMenu}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onFocus={openMenu}
        onBlur={scheduleClose}
        className={`inline-flex items-center gap-2 rounded-full p-0.5 transition ${
          isDark ? "hover:bg-white/15" : "hover:bg-bb-sky"
        }`}
      >
        {user?.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatar}
            alt=""
            className={`h-9 w-9 rounded-full object-cover ${
              isDark ? "ring-2 ring-white/40" : ""
            }`}
          />
        ) : (
          <span
            className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white ${
              isDark ? "bg-white/25 ring-2 ring-white/40" : "bg-bb-blue"
            }`}
          >
            {initial}
          </span>
        )}
        <span className="hidden min-w-0 text-left sm:block">
          <span
            className={`block max-w-[10rem] truncate text-sm font-semibold ${
              isDark ? "text-white" : "text-bb-ink"
            }`}
          >
            {user?.fullName ?? "Account"}
          </span>
          <span
            className={`block max-w-[10rem] truncate text-xs ${
              isDark ? "text-white/70" : "text-bb-muted"
            }`}
          >
            {user?.email}
          </span>
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1 w-56 overflow-hidden rounded-xl border border-bb-border bg-white py-1 shadow-bb-lg"
          onMouseEnter={openMenu}
          onMouseLeave={scheduleClose}
        >
          <div className="border-b border-bb-border px-3 py-2.5 sm:hidden">
            <p className="truncate text-sm font-semibold text-bb-ink">
              {user?.fullName}
            </p>
            <p className="truncate text-xs text-bb-muted">{user?.email}</p>
          </div>
          <Link
            href="/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-bb-ink transition hover:bg-bb-sky"
          >
            <User className="h-4 w-4" strokeWidth={2} aria-hidden />
            Manage account
          </Link>
          <Link
            href="/profile?tab=security"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-bb-ink transition hover:bg-bb-sky"
          >
            <KeyRound className="h-4 w-4" strokeWidth={2} aria-hidden />
            Security
          </Link>
          <Link
            href="/profile?tab=notifications"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-bb-ink transition hover:bg-bb-sky"
          >
            <Bell className="h-4 w-4" strokeWidth={2} aria-hidden />
            Notifications
          </Link>
          {archivedHref ? (
            <Link
              href={archivedHref}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-bb-ink transition hover:bg-bb-sky"
            >
              <Archive className="h-4 w-4" strokeWidth={2} aria-hidden />
              Archived items
            </Link>
          ) : null}
          <button
            type="button"
            role="menuitem"
            onClick={() => void onLogout()}
            className="flex w-full items-center gap-2 border-t border-bb-border px-3 py-2.5 text-left text-sm font-semibold text-bb-danger transition hover:bg-bb-danger-bg"
          >
            <LogOut className="h-4 w-4" strokeWidth={2} aria-hidden />
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
