"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useRealtimeStore } from "@/stores/realtime-store";
import { connectRealtime, disconnectRealtime } from "@/lib/realtime/socket-client";
import {
  CLIENT_EVENT,
  SERVER_EVENT,
  type RealtimeSocketErrorPayload,
  type RoomPresencePayload,
  type RoomKey,
} from "@/lib/realtime/events";

export function useRealtimeConnection() {
  const user = useAuthStore((s) => s.user);
  const status = useRealtimeStore((s) => s.status);
  const desiredRooms = useRealtimeStore((s) => s.desiredRooms);
  const setStatus = useRealtimeStore((s) => s.setStatus);
  const setError = useRealtimeStore((s) => s.setError);
  const setRoomPresence = useRealtimeStore((s) => s.setRoomPresence);
  const clearRooms = useRealtimeStore((s) => s.clearRooms);
  const joinedRoomsRef = useRef<Set<RoomKey>>(new Set());
  const desiredRoomsRef = useRef(desiredRooms);
  desiredRoomsRef.current = desiredRooms;

  useEffect(() => {
    if (!user) {
      disconnectRealtime();
      joinedRoomsRef.current.clear();
      clearRooms();
      setError(null);
      setStatus("idle");
      return;
    }

    const socket = connectRealtime();

    const onConnect = () => {
      setStatus("connected");
      setError(null);
      joinedRoomsRef.current.clear();
      for (const room of desiredRoomsRef.current) {
        socket.emit(CLIENT_EVENT.ROOM_JOIN, { room });
        joinedRoomsRef.current.add(room);
      }
    };

    const onDisconnect = () => {
      joinedRoomsRef.current.clear();
      setStatus("disconnected");
    };

    const onConnectError = (err: Error) => {
      setStatus("error");
      setError({
        code: "UNAUTHORIZED",
        message: err.message || "Realtime connection failed",
      });
    };

    const onReconnectAttempt = () => {
      setStatus("reconnecting");
    };

    const onSocketError = (payload: RealtimeSocketErrorPayload) => {
      setError(payload);
    };

    const onRoomPresence = (payload: RoomPresencePayload) => {
      setRoomPresence(payload.room, payload.users);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.io.on("reconnect_attempt", onReconnectAttempt);
    socket.on(SERVER_EVENT.SOCKET_ERROR, onSocketError);
    socket.on(SERVER_EVENT.ROOM_PRESENCE, onRoomPresence);

    if (socket.connected) {
      setStatus("connected");
      for (const room of desiredRoomsRef.current) {
        if (joinedRoomsRef.current.has(room)) continue;
        socket.emit(CLIENT_EVENT.ROOM_JOIN, { room });
        joinedRoomsRef.current.add(room);
      }
    } else {
      setStatus("connecting");
      socket.connect();
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.io.off("reconnect_attempt", onReconnectAttempt);
      socket.off(SERVER_EVENT.SOCKET_ERROR, onSocketError);
      socket.off(SERVER_EVENT.ROOM_PRESENCE, onRoomPresence);
    };
  }, [user, setError, setStatus, setRoomPresence, clearRooms]);

  useEffect(() => {
    if (!user) return;
    const socket = connectRealtime();
    if (!socket.connected) return;
    for (const room of desiredRooms as RoomKey[]) {
      if (joinedRoomsRef.current.has(room)) continue;
      socket.emit(CLIENT_EVENT.ROOM_JOIN, { room });
      joinedRoomsRef.current.add(room);
    }
    const current = new Set(desiredRooms);
    for (const room of joinedRoomsRef.current) {
      if (current.has(room)) continue;
      socket.emit(CLIENT_EVENT.ROOM_LEAVE, { room });
      joinedRoomsRef.current.delete(room);
    }
  }, [desiredRooms, user]);

  return { status };
}
