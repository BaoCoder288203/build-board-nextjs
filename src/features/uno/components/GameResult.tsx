"use client";

import type { PlayerGameView, PublicUnoRoom } from "../types/game.types";

export function GameResult({
  room,
  game,
  isHost,
  myUserId,
  onRematch,
  onLeaveGame,
}: {
  room: PublicUnoRoom;
  game: PlayerGameView | null;
  isHost: boolean;
  myUserId?: string | null;
  onRematch: () => void;
  onLeaveGame: () => void;
}) {
  const winner = room.players.find(
    (p) => p.playerId === game?.winnerId || p.userId === game?.winnerId,
  );
  const iWon = Boolean(
    winner && myUserId && (winner.userId === myUserId || winner.playerId === myUserId),
  );

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-3 rounded-2xl border border-white/10 bg-black/35 p-6 text-center text-white shadow-xl">
      <p className="text-2xl font-black tracking-wide">
        {iWon ? "You Win" : "Game Over"}
      </p>
      <p className="text-sm text-white/80">
        {winner
          ? iWon
            ? "Nice one."
            : `${winner.displayName} wins`
          : "Round finished"}
      </p>
      {game ? (
        <ul className="w-full text-left text-sm">
          {room.players
            .filter((p) => !p.isSpectator)
            .map((p) => (
              <li key={p.playerId} className="flex justify-between py-1">
                <span>{p.displayName}</span>
                <span className="font-bold">{game.scores[p.playerId] ?? 0}</span>
              </li>
            ))}
        </ul>
      ) : null}
      <div className="flex gap-2">
        {isHost ? (
          <button
            type="button"
            onClick={onRematch}
            className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-[#0F1B3C]"
          >
            Rematch
          </button>
        ) : null}
        <button
          type="button"
          onClick={onLeaveGame}
          className="rounded-md border border-white/30 px-3 py-2 text-sm font-semibold text-white"
        >
          Leave game
        </button>
      </div>
    </div>
  );
}
