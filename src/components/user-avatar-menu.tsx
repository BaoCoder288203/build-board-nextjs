"use client";

import { ExternalLink, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useEntityCache } from "@/stores/entity-cache";
import { UserAvatar } from "@/components/ui/user-avatar";

type Props = {
  variant?: "default" | "onDark";
};

function workspaceIdFromPath(pathname: string): string | undefined {
  const m = pathname.match(/^\/workspaces\/([^/]+)/);
  return m?.[1];
}

function boardIdFromPath(pathname: string): string | undefined {
  const m = pathname.match(/^\/boards\/([^/]+)/);
  return m?.[1];
}

const itemClass =
  "flex w-full items-center px-3 py-2 text-left text-sm text-bb-ink transition hover:bg-bb-sky";

function MenuLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Link href={href} role="menuitem" onClick={onClick} className={itemClass}>
      {children}
    </Link>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-3 pb-1 pt-2.5 text-[11px] font-bold uppercase tracking-wide text-bb-muted">
      {children}
    </p>
  );
}

export function UserAvatarMenu({ variant = "default" }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const workspaceList = useEntityCache((s) => s.workspaceList);
  const boardId = boardIdFromPath(pathname);
  const boardWorkspaceId = useEntityCache((s) =>
    boardId ? s.boards[boardId]?.board.project?.workspaceId : undefined,
  );
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const workspaceId =
    workspaceIdFromPath(pathname) ?? boardWorkspaceId ?? workspaceList?.[0]?.id;
  const activityHref = workspaceId
    ? `/workspaces/${workspaceId}/activity`
    : null;
  const cardsHref = workspaceId
    ? `/workspaces/${workspaceId}/archived`
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

  function closeMenu() {
    setOpen(false);
  }

  async function onLogout() {
    closeMenu();
    await logout();
    router.replace("/");
  }

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
        aria-label="Account"
        onFocus={openMenu}
        onBlur={scheduleClose}
        className={`inline-flex rounded-full p-0.5 transition ${
          isDark ? "hover:bg-white/15" : "hover:bg-bb-sky"
        }`}
      >
        <UserAvatar
          name={user?.fullName ?? "Account"}
          avatar={user?.avatar}
          size="lg"
          className="!h-9 !w-9 !text-sm"
          ringClassName={isDark ? "ring-2 ring-white/40" : ""}
          fallbackClassName={
            isDark ? "bg-white/25 text-white" : "bg-bb-blue text-white"
          }
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1 w-80 overflow-hidden rounded-xl border border-bb-border bg-white py-1 shadow-bb-lg"
          onMouseEnter={openMenu}
          onMouseLeave={scheduleClose}
        >
          <SectionLabel>Account</SectionLabel>
          <div className="flex items-center gap-3 px-3 pb-2.5 pt-1">
            <UserAvatar
              name={user?.fullName ?? "Account"}
              avatar={user?.avatar}
              size="xl"
              fallbackClassName="bg-bb-blue text-white"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-bb-ink">
                {user?.fullName ?? "Account"}
              </p>
              <p className="truncate text-xs text-bb-muted">{user?.email}</p>
            </div>
          </div>
          {/* Switch accounts — single-account app
          <button type="button" role="menuitem" className={itemClass} disabled>
            Switch accounts
          </button>
          */}
          <MenuLink href="/profile" onClick={closeMenu}>
            <span>Manage account</span>
            <ExternalLink
              className="ml-auto h-3.5 w-3.5 text-bb-muted"
              strokeWidth={2}
              aria-hidden
            />
          </MenuLink>

          <div className="mt-1 border-t border-bb-border">
            <SectionLabel>Build Board</SectionLabel>
            <MenuLink href="/profile" onClick={closeMenu}>
              Profile and visibility
            </MenuLink>
            {activityHref ? (
              <MenuLink href={activityHref} onClick={closeMenu}>
                Activity
              </MenuLink>
            ) : null}
            {cardsHref ? (
              <MenuLink href={cardsHref} onClick={closeMenu}>
                Cards
              </MenuLink>
            ) : null}
            <MenuLink href="/profile" onClick={closeMenu}>
              Settings
            </MenuLink>
            {/* Labs
            <button type="button" role="menuitem" className={itemClass} disabled>
              Labs
            </button>
            */}
            {/* Theme
            <button type="button" role="menuitem" className={itemClass} disabled>
              Theme
            </button>
            */}
          </div>

          <div className="mt-1 border-t border-bb-border py-1">
            <MenuLink href="/workspaces/new" onClick={closeMenu}>
              <Plus className="mr-2 h-4 w-4" strokeWidth={2} aria-hidden />
              Create Workspace
            </MenuLink>
          </div>

          {/* Help / Shortcuts
          <div className="mt-1 border-t border-bb-border py-1">
            <button type="button" role="menuitem" className={itemClass} disabled>
              Help
            </button>
            <button type="button" role="menuitem" className={itemClass} disabled>
              Shortcuts
            </button>
          </div>
          */}

          <div className="border-t border-bb-border">
            <button
              type="button"
              role="menuitem"
              onClick={() => void onLogout()}
              className={`${itemClass} text-bb-danger hover:bg-bb-danger-bg`}
            >
              Log out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
