"use client";

import { ChessPiece } from "./ChessPiece";
import type { ChessColor } from "../types/player.types";
import type { ChessPieceType } from "../types/game.types";

export function ChessCaptured({
  pieces,
  material,
}: {
  pieces: Array<{ type: ChessPieceType; color: ChessColor }>;
  material: number;
}) {
  return (
    <div className="flex min-h-[24px] items-center gap-1 overflow-x-auto">
      {pieces.map((piece, index) => (
        <span key={`${piece.color}-${piece.type}-${index}`} className="h-6 w-5 shrink-0">
          <ChessPiece type={piece.type} color={piece.color} />
        </span>
      ))}
      {material !== 0 ? (
        <span className="ml-1 text-xs font-bold text-white/80">
          {material > 0 ? `+${material}` : `${material}`}
        </span>
      ) : null}
    </div>
  );
}
