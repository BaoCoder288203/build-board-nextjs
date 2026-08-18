import type { PublicChessRoom } from "../types/game.types";
import type { ChessColor } from "../types/player.types";

export function myChessPlayer(room: PublicChessRoom | null, userId: string | null) {
  if (!room || !userId) return null;
  return room.players.find((p) => p.userId === userId) ?? null;
}

export function isChessHost(room: PublicChessRoom | null, userId: string | null) {
  return Boolean(userId && room?.hostUserId === userId);
}

export function contestants(room: PublicChessRoom | null) {
  return (
    room?.players.filter(
      (p) =>
        !p.isSpectator &&
        p.connectionStatus !== "LEFT" &&
        p.connectionStatus !== "REMOVED",
    ) ?? []
  );
}

export function playerByColor(room: PublicChessRoom | null, color: ChessColor) {
  return (
    room?.players.find(
      (p) =>
        p.color === color &&
        p.connectionStatus !== "LEFT" &&
        p.connectionStatus !== "REMOVED",
    ) ?? null
  );
}

export function myColor(
  room: PublicChessRoom | null,
  userId: string | null,
): ChessColor | null {
  return myChessPlayer(room, userId)?.color ?? null;
}

export function roomPhase(
  room: PublicChessRoom | null,
  gameStatus?: string | null,
) {
  if (!room) return "idle" as const;
  if (room.status === "WAITING" || room.status === "READY") return "lobby" as const;
  if (
    gameStatus === "FINISHED" ||
    gameStatus === "ABORTED" ||
    room.status === "FINISHED" ||
    room.status === "CLOSED"
  ) {
    return "result" as const;
  }
  if (room.status === "PLAYING") return "playing" as const;
  return "lobby" as const;
}

export function humanRoomStatus(status: string) {
  if (status === "WAITING") return "Waiting";
  if (status === "READY") return "Ready";
  if (status === "PLAYING") return "Playing";
  if (status === "FINISHED") return "Finished";
  if (status === "CLOSED") return "Closed";
  return status;
}
