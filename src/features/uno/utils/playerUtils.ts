import type { PublicUnoRoom } from "../types/game.types";

export function myUnoPlayer(room: PublicUnoRoom | null, userId: string | null) {
  if (!room || !userId) return null;
  return room.players.find((p) => p.userId === userId) ?? null;
}

export function isUnoHost(room: PublicUnoRoom | null, userId: string | null) {
  return Boolean(userId && room?.hostUserId === userId);
}

export function contestants(room: PublicUnoRoom | null) {
  return (
    room?.players.filter(
      (p) =>
        !p.isSpectator &&
        p.connectionStatus !== "LEFT" &&
        p.connectionStatus !== "REMOVED",
    ) ?? []
  );
}
