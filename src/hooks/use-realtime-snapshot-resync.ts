"use client";

import { useEffect, useRef } from "react";
import { connectRealtime } from "@/lib/realtime/socket-client";
import { useRealtimeStore } from "@/stores/realtime-store";

const HIDDEN_RESYNC_MS = 30_000;

/**
 * Reloads a page snapshot after socket reconnect or long tab sleep,
 * so missed realtime events do not leave stale UI.
 */
export function useRealtimeSnapshotResync(onResync: () => void) {
  const status = useRealtimeStore((s) => s.status);
  const prevStatusRef = useRef(status);
  const hiddenAtRef = useRef<number | null>(null);
  const onResyncRef = useRef(onResync);
  onResyncRef.current = onResync;

  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = status;
    const recovered =
      status === "connected" &&
      (prev === "disconnected" || prev === "reconnecting" || prev === "error");
    if (recovered) {
      onResyncRef.current();
    }
  }, [status]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAtRef.current = Date.now();
        return;
      }
      const hiddenAt = hiddenAtRef.current;
      hiddenAtRef.current = null;
      if (!hiddenAt) return;
      if (Date.now() - hiddenAt < HIDDEN_RESYNC_MS) return;
      const socket = connectRealtime();
      if (socket.connected) {
        onResyncRef.current();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);
}
