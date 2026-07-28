"use client";

import { useEffect } from "react";
import { CLIENT_EVENT, type RoomKey } from "@/lib/realtime/events";
import { connectRealtime } from "@/lib/realtime/socket-client";
import { useRealtimeStore } from "@/stores/realtime-store";

export function useRealtimeRoom(room: RoomKey | null) {
  const trackRoom = useRealtimeStore((s) => s.trackRoom);
  const untrackRoom = useRealtimeStore((s) => s.untrackRoom);
  const clearRoomPresence = useRealtimeStore((s) => s.clearRoomPresence);

  useEffect(() => {
    if (!room) return;
    trackRoom(room);

    return () => {
      const socket = connectRealtime();
      socket.emit(CLIENT_EVENT.ROOM_LEAVE, { room });
      untrackRoom(room);
      clearRoomPresence(room);
    };
  }, [room, trackRoom, untrackRoom, clearRoomPresence]);
}
