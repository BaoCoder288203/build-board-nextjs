"use client";

import type { PlayerGameView, PublicUnoRoom } from "../types/game.types";

export function Scoreboard({
  room,
  game,
}: {
  room: PublicUnoRoom;
  game: PlayerGameView;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-[11px] text-white backdrop-blur-[2px]">
      <p className="mb-1 font-bold tracking-wide">
        Round {game.roundNumber} · {game.direction === "CLOCKWISE" ? "↻" : "↺"}
      </p>
      <ul className="space-y-0.5">
        {room.players
          .filter((p) => !p.isSpectator)
          .map((p) => (
            <li key={p.playerId} className="flex justify-between gap-3">
              <span className="max-w-[88px] truncate">{p.displayName}</span>
              <span className="font-bold">{game.scores[p.playerId] ?? 0}</span>
            </li>
          ))}
      </ul>
    </div>
  );
}
