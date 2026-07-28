"use client";

import { create } from "zustand";
import type {
  RealtimeSocketErrorPayload,
  RoomKey,
  RoomPresencePayload,
} from "@/lib/realtime/events";

type RealtimeStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "error";

type RealtimeState = {
  status: RealtimeStatus;
  error: RealtimeSocketErrorPayload | null;
  desiredRooms: RoomKey[];
  roomPresence: Record<string, RoomPresencePayload["users"]>;
  setStatus: (status: RealtimeStatus) => void;
  setError: (error: RealtimeSocketErrorPayload | null) => void;
  setRoomPresence: (room: RoomKey, users: RoomPresencePayload["users"]) => void;
  clearRoomPresence: (room: RoomKey) => void;
  trackRoom: (room: RoomKey) => void;
  untrackRoom: (room: RoomKey) => void;
  clearRooms: () => void;
};

export const useRealtimeStore = create<RealtimeState>((set) => ({
  status: "idle",
  error: null,
  desiredRooms: [],
  roomPresence: {},
  setStatus: (status) => set({ status }),
  setError: (error) => set({ error, status: error ? "error" : "connected" }),
  setRoomPresence: (room, users) =>
    set((state) => ({
      roomPresence: {
        ...state.roomPresence,
        [room]: users,
      },
    })),
  clearRoomPresence: (room) =>
    set((state) => {
      const next = { ...state.roomPresence };
      delete next[room];
      return { roomPresence: next };
    }),
  trackRoom: (room) =>
    set((state) => {
      if (state.desiredRooms.includes(room)) return state;
      return { desiredRooms: [...state.desiredRooms, room] };
    }),
  untrackRoom: (room) =>
    set((state) => ({
      desiredRooms: state.desiredRooms.filter((key) => key !== room),
    })),
  clearRooms: () => set({ desiredRooms: [], roomPresence: {} }),
}));
