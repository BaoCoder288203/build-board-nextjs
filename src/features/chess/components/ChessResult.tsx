"use client";

import { Button } from "@/components/ui/button";
import type { PublicChessGame, PublicChessRoom } from "../types/game.types";
import { contestants } from "../utils/playerUtils";
import { endReasonLabel, resultHeadline } from "../utils/endReason";
import type { ChessColor } from "../types/player.types";

export function ChessResult({
  room,
  game,
  myColor,
  onRematch,
  onReview,
  onLeaveGame,
}: {
  room: PublicChessRoom;
  game: PublicChessGame | null;
  myColor: ChessColor | null;
  onRematch: () => void;
  onReview: () => void;
  onLeaveGame: () => void;
}) {
  const seated = contestants(room);
  const canRematch = seated.length >= 2;
  const headline = resultHeadline(game?.winnerColor, myColor);
  const winner = room.players.find(
    (p) =>
      p.playerId === game?.winnerId ||
      p.userId === game?.winnerId ||
      (game?.winnerColor && p.color === game.winnerColor),
  );

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-3 rounded-2xl border border-white/10 bg-black/35 p-6 text-center text-white shadow-xl">
      <p className="text-2xl font-semibold tracking-wide">{headline}</p>
      <p className="text-sm text-white/80">{endReasonLabel(game?.endReason)}</p>
      {winner && game?.winnerColor ? (
        <p className="text-xs text-white/60">{winner.displayName} wins as {game.winnerColor === "WHITE" ? "White" : "Black"}.</p>
      ) : null}
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        {canRematch ? (
          <Button type="button" variant="onDark" size="sm" onClick={onRematch}>
            Rematch
          </Button>
        ) : null}
        <Button type="button" variant="onDarkGhost" size="sm" onClick={onReview}>
          Review
        </Button>
        <Button type="button" variant="onDarkGhost" size="sm" onClick={onLeaveGame}>
          Leave Game
        </Button>
      </div>
    </div>
  );
}
