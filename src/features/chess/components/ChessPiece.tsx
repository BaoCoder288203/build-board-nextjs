"use client";

import { chessPieceSrc } from "../utils/pieceAssets";
import type { ChessColor } from "../types/player.types";
import type { ChessPieceType } from "../types/game.types";

type ChessPieceProps = {
  type: ChessPieceType;
  color: ChessColor;
  selected?: boolean;
  dragging?: boolean;
  muted?: boolean;
  className?: string;
};

const PIECE_LABEL: Record<ChessPieceType, string> = {
  K: "king",
  Q: "queen",
  R: "rook",
  B: "bishop",
  N: "knight",
  P: "pawn",
};

export function ChessPiece({
  type,
  color,
  selected = false,
  dragging = false,
  muted = false,
  className = "",
}: ChessPieceProps) {
  const label = `${color === "WHITE" ? "White" : "Black"} ${PIECE_LABEL[type]}`;
  const lifted = selected || dragging;

  return (
    <div
      data-chess-piece={`${color}-${type}`}
      role="img"
      aria-label={label}
      className={`pointer-events-none h-full w-full select-none ${className}`}
      style={{ opacity: muted ? 0.35 : 1 }}
    >
      <img
        src={chessPieceSrc(color, type)}
        alt=""
        draggable={false}
        className="h-full w-full object-contain"
        style={{
          transform: lifted ? "translateY(-4px) scale(1.06)" : undefined,
          filter: dragging
            ? "drop-shadow(0 12px 14px rgba(0,0,0,0.45))"
            : "drop-shadow(0 3px 4px rgba(0,0,0,0.32))",
          transition: "filter 150ms ease, transform 120ms ease",
        }}
      />
    </div>
  );
}

export function pieceTypeFromLetter(letter: string): ChessPieceType {
  const upper = letter.toUpperCase();
  if (upper === "K" || upper === "Q" || upper === "R" || upper === "B" || upper === "N" || upper === "P") {
    return upper;
  }
  return "P";
}
