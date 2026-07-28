"use client";

import { io, type Socket } from "socket.io-client";
import { getAccessToken } from "@/lib/api";
import { RT_NAMESPACE } from "@/lib/realtime/events";

let socketRef: Socket | null = null;

function resolveRealtimeBaseUrl() {
  const explicit = process.env.NEXT_PUBLIC_REALTIME_URL;
  if (explicit) return explicit;

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

  try {
    const parsed = new URL(apiUrl);
    parsed.pathname = "";
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return "http://localhost:4000";
  }
}

export function getRealtimeSocket() {
  if (socketRef) return socketRef;

  socketRef = io(`${resolveRealtimeBaseUrl()}${RT_NAMESPACE}`, {
    autoConnect: false,
    transports: ["websocket", "polling"],
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    // Exponential backoff with jitter (Socket.IO applies randomizationFactor).
    reconnectionDelay: 1_000,
    reconnectionDelayMax: 10_000,
    randomizationFactor: 0.5,
    timeout: 12_000,
    auth: (cb) => {
      cb({ token: getAccessToken() ?? undefined });
    },
  });

  return socketRef;
}

export function connectRealtime() {
  const socket = getRealtimeSocket();
  if (!socket.connected) {
    socket.connect();
  }
  return socket;
}

export function disconnectRealtime() {
  if (!socketRef) return;
  socketRef.disconnect();
}
