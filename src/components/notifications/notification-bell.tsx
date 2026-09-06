"use client";

import { Bell, CheckCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from "@/lib/notifications";
import {
  SERVER_EVENT,
  type NotificationNewPayload,
} from "@/lib/realtime/events";
import { connectRealtime } from "@/lib/realtime/socket-client";
import { toastFromError } from "@/lib/toast";

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function toAppNotification(
  payload: NotificationNewPayload["notification"],
): AppNotification {
  return {
    id: payload.id,
    workspaceId: payload.workspaceId,
    title: payload.title,
    message: payload.message,
    isRead: payload.isRead,
    readAt: payload.readAt,
    notificationType: payload.notificationType,
    entityType: payload.entityType,
    entityId: payload.entityId,
    createdAt: payload.createdAt,
    metadata: (payload.metadata as Record<string, unknown> | null) ?? null,
    sender: payload.sender,
  };
}

type Props = {
  /** Light text / on dark board header */
  variant?: "default" | "onDark";
};

export function NotificationBell({ variant = "default" }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const refreshUnread = useCallback(async () => {
    try {
      const { unreadCount } = await fetchUnreadCount();
      setUnread(unreadCount);
    } catch {
      // ignore poll errors
    }
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchNotifications({ limit: 15 });
      setItems(data.items);
      setUnread(data.unreadCount);
    } catch (error) {
      toastFromError(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUnread();
    // Fallback poll — live updates come from socket notification:new
    const id = window.setInterval(() => void refreshUnread(), 60_000);
    return () => window.clearInterval(id);
  }, [refreshUnread]);

  useEffect(() => {
    if (!open) return;
    void loadList();
  }, [open, loadList]);

  useEffect(() => {
    const socket = connectRealtime();
    const onNotificationNew = (payload: NotificationNewPayload) => {
      const next = toAppNotification(payload.notification);
      setUnread((count) => count + (next.isRead ? 0 : 1));
      setItems((prev) => {
        if (prev.some((item) => item.id === next.id)) return prev;
        return [next, ...prev].slice(0, 15);
      });
    };
    socket.on(SERVER_EVENT.NOTIFICATION_NEW, onNotificationNew);
    return () => {
      socket.off(SERVER_EVENT.NOTIFICATION_NEW, onNotificationNew);
    };
  }, []);

  async function onMarkOne(n: AppNotification) {
    if (!n.isRead) {
      try {
        await markNotificationRead(n.id);
        setItems((prev) =>
          prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)),
        );
        setUnread((c) => Math.max(0, c - 1));
      } catch (error) {
        toastFromError(error);
      }
    }
    const boardIdFromMeta =
      typeof n.metadata?.boardId === "string" ? n.metadata.boardId : null;
    const boardId =
      n.entityType === "BOARD" ? boardIdFromMeta ?? n.entityId : boardIdFromMeta;
    if (boardId) {
      setOpen(false);
      router.push(`/boards/${boardId}`);
    }
  }

  async function onMarkAll() {
    try {
      await markAllNotificationsRead();
      setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
      setUnread(0);
    } catch (error) {
      toastFromError(error);
    }
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
        aria-label="Notifications"
        aria-expanded={open}
        onFocus={openMenu}
        onBlur={scheduleClose}
        className={`relative inline-flex h-9 w-9 items-center justify-center rounded-lg transition ${
          isDark
            ? "bg-white/15 text-white hover:bg-white/25"
            : "border border-bb-border bg-white text-bb-ink hover:bg-bb-sky"
        }`}
      >
        <Bell className="h-4 w-4" strokeWidth={2} aria-hidden />
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-bb-danger px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,360px)] overflow-hidden rounded-xl border border-bb-border bg-white shadow-bb-lg"
          onMouseEnter={openMenu}
          onMouseLeave={scheduleClose}
        >
          <div className="flex items-center justify-between border-b border-bb-border px-4 py-3">
            <div>
              <p className="text-sm font-bold text-bb-ink">Notifications</p>
              <p className="text-xs text-bb-muted">
                {unread > 0 ? `${unread} unread` : "You're all caught up"}
              </p>
            </div>
            {unread > 0 ? (
              <button
                type="button"
                onClick={() => void onMarkAll()}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-bb-blue hover:bg-bb-sky"
              >
                <CheckCheck className="h-3.5 w-3.5" aria-hidden />
                Mark all
              </button>
            ) : null}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <p className="px-4 py-8 text-center text-sm text-bb-muted">
                Loading...
              </p>
            ) : items.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Bell className="mx-auto h-8 w-8 text-bb-border" aria-hidden />
                <p className="mt-2 text-sm font-semibold text-bb-ink">
                  No notifications
                </p>
                <p className="mt-1 text-xs text-bb-muted">
                  Mentions, comments, and assignments show up here.
                </p>
              </div>
            ) : (
              <ul>
                {items.map((n) => (
                  <li key={n.id} className="border-b border-bb-border/70 last:border-0">
                    <button
                      type="button"
                      onClick={() => void onMarkOne(n)}
                      className={`flex w-full gap-3 px-4 py-3 text-left transition hover:bg-bb-sky/60 ${
                        n.isRead ? "bg-white" : "bg-bb-sky/35"
                      }`}
                    >
                      <span
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                          n.isRead ? "bg-transparent" : "bg-bb-blue"
                        }`}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-bb-ink">
                          {n.title}
                        </span>
                        <span className="mt-0.5 block text-xs leading-relaxed text-bb-muted">
                          {n.message}
                        </span>
                        <span className="mt-1 block text-[11px] text-bb-muted">
                          {relativeTime(n.createdAt)}
                          {n.sender ? ` · ${n.sender.fullName}` : ""}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
