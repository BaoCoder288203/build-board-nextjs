"use client";

import { CHESS_MVP } from "../constants/chess.constants";
import { useChessClock } from "../hooks/useChessClock";
import { prefersReducedMotion } from "../motion/chessMotion";
import type { ChessColor } from "../types/player.types";

export function ChessClock({
  color,
  active,
}: {
  color: ChessColor;
  active?: boolean;
}) {
  const clock = useChessClock(color);
  const reduced = prefersReducedMotion();
  const lit = active ?? clock.running;

  return (
    <div
      className={`min-w-[4.75rem] rounded-md px-2 py-1 text-right ${
        clock.critical
          ? "bg-red-600/90 text-white"
          : clock.warning
            ? "bg-amber-400 text-[#1A1204]"
            : lit
              ? "bg-white text-[#0F1B3C]"
              : "bg-black/35 text-white/70"
      }`}
      style={{
        fontVariantNumeric: "tabular-nums",
        animation:
          clock.critical && !reduced
            ? "chess-clock-pulse 1s ease-in-out infinite"
            : undefined,
      }}
      aria-label={`${color === "WHITE" ? "White" : "Black"} clock ${clock.label}`}
    >
      <p className="text-lg font-black leading-none tracking-tight">{clock.label}</p>
      {clock.ms < CHESS_MVP.lowTimeMs && clock.ms > 0 ? (
        <p className="text-[9px] font-semibold uppercase tracking-wide opacity-80">
          {clock.critical ? "Low" : "Hurry"}
        </p>
      ) : (
        <p className="text-[9px] font-semibold uppercase tracking-wide opacity-60">
          10+0
        </p>
      )}
    </div>
  );
}
