import type { PlayerGameView, PublicUnoRoom } from "../types/game.types";

export function shouldShowPass(game: PlayerGameView | null, myPlayerId: string | null) {
  if (!game || !myPlayerId) return false;
  if (game.currentPlayerId !== myPlayerId) return false;
  if (game.pendingDraw > 0) return false;
  if (!game.lastDrawnCardId) return false;
  return game.myHand.some((c) => c.cardId === game.lastDrawnCardId);
}

export function roomPhase(room: PublicUnoRoom | null, game: PlayerGameView | null) {
  if (!room) return "idle" as const;
  if (game && (game.status === "FINISHED" || game.status === "ABORTED")) {
    return "result" as const;
  }
  if (room.status === "FINISHED") return "result" as const;
  if (room.status === "PLAYING" || game) return "playing" as const;
  return "lobby" as const;
}
