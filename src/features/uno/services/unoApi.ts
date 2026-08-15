import { api } from "@/lib/api";
import type { PublicUnoRoom, UnoSnapshot } from "../types/game.types";

export async function createUnoRoom(input: {
  contextType: "MEETING" | "BOARD" | "WORKSPACE";
  meetingId?: string;
  boardId?: string;
  workspaceId?: string;
  maxPlayers?: number;
}) {
  const { data } = await api.post("/uno/rooms", input);
  return data.data as PublicUnoRoom;
}

export async function getUnoRoom(roomId: string) {
  const { data } = await api.get(`/uno/rooms/${roomId}`);
  return data.data as PublicUnoRoom;
}

export async function joinUnoRoom(roomId: string, asSpectator?: boolean) {
  const { data } = await api.post(`/uno/rooms/${roomId}/join`, { asSpectator });
  return data.data as {
    room: PublicUnoRoom;
    player: PublicUnoRoom["players"][number];
    reconnected: boolean;
  };
}

export async function leaveUnoRoom(roomId: string) {
  const { data } = await api.post(`/uno/rooms/${roomId}/leave`);
  return data.data as PublicUnoRoom;
}

export async function inviteUnoPlayers(roomId: string, userIds: string[]) {
  const { data } = await api.post(`/uno/rooms/${roomId}/invites`, { userIds });
  return data.data as { room: PublicUnoRoom; invitedUserIds: string[] };
}

export async function fetchUnoSnapshot(roomId: string) {
  const { data } = await api.get(`/uno/rooms/${roomId}/snapshot`);
  return data.data as UnoSnapshot;
}

export async function rematchUnoRoom(roomId: string) {
  const { data } = await api.post(`/uno/rooms/${roomId}/rematch`);
  return data.data as PublicUnoRoom;
}
