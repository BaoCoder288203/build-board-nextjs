import { api } from "@/lib/api";
import type { ChessSnapshot, PublicChessRoom } from "../types/game.types";

export async function createChessRoom(input: {
  contextType: "MEETING" | "BOARD" | "WORKSPACE";
  meetingId?: string;
  boardId?: string;
  workspaceId?: string;
  maxPlayers?: number;
}) {
  const { data } = await api.post("/chess/rooms", input);
  return data.data as PublicChessRoom;
}

export async function getChessRoom(roomId: string) {
  const { data } = await api.get(`/chess/rooms/${roomId}`);
  return data.data as PublicChessRoom;
}

export async function joinChessRoom(roomId: string, asSpectator?: boolean) {
  const { data } = await api.post(`/chess/rooms/${roomId}/join`, { asSpectator });
  return data.data as {
    room: PublicChessRoom;
    player: PublicChessRoom["players"][number];
    reconnected: boolean;
  };
}

export async function leaveChessRoom(roomId: string) {
  const { data } = await api.post(`/chess/rooms/${roomId}/leave`);
  return data.data as PublicChessRoom;
}

export async function inviteChessPlayers(roomId: string, userIds: string[]) {
  const { data } = await api.post(`/chess/rooms/${roomId}/invites`, { userIds });
  return data.data as { room: PublicChessRoom; invitedUserIds: string[] };
}

export async function fetchChessSnapshot(roomId: string) {
  const { data } = await api.get(`/chess/rooms/${roomId}/snapshot`);
  return data.data as ChessSnapshot;
}

export async function rematchChessRoom(roomId: string) {
  const { data } = await api.post(`/chess/rooms/${roomId}/rematch`);
  return data.data as PublicChessRoom;
}
