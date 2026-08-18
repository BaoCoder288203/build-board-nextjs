"use client";

import { useRef } from "react";
import { gsap, motionDuration, prefersReducedMotion, useGSAP } from "../motion/chessMotion";
import type { ChessColor } from "../types/player.types";
import type { ChessPromotion } from "../types/game.types";
import { ChessPiece, pieceTypeFromLetter } from "./ChessPiece";

const ORDER: ChessPromotion[] = ["q", "r", "b", "n"];

export function ChessPromotionPicker({
  square,
  color,
  flipped,
  onPick,
  onCancel,
}: {
  square: string;
  color: ChessColor;
  flipped: boolean;
  onPick: (piece: ChessPromotion) => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const file = square.charCodeAt(0) - 97;
  const rank = Number(square[1]) - 1;
  const col = flipped ? 7 - file : file;
  const row = flipped ? rank : 7 - rank;
  const towardBottom = row < 4;

  useGSAP(
    () => {
      if (!ref.current) return;
      const duration = prefersReducedMotion() ? 0.01 : motionDuration(0.15);
      gsap.fromTo(
        ref.current,
        { scale: 0.92, opacity: 0 },
        { scale: 1, opacity: 1, duration, ease: "power2.out" },
      );
    },
    { scope: ref },
  );

  return (
    <>
      <button
        type="button"
        className="absolute inset-0 z-20 cursor-default bg-black/20"
        aria-label="Cancel promotion"
        onClick={onCancel}
      />
      <div
        ref={ref}
        className="absolute z-30 flex flex-col overflow-hidden rounded-md border border-black/20 bg-[#f3efe3] shadow-xl"
        style={{
          left: `calc(${(col / 8) * 100}% )`,
          top: towardBottom ? `calc(${((row + 1) / 8) * 100}%)` : `calc(${(row / 8) * 100}%)`,
          width: "12.5%",
          transform: towardBottom ? "translateY(0)" : "translateY(-100%)",
        }}
        role="dialog"
        aria-label="Choose promotion piece"
      >
        {ORDER.map((promo) => (
          <button
            key={promo}
            type="button"
            className="aspect-square bg-[#f3efe3] p-0.5 hover:bg-[#fff8dc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bb-blue"
            onClick={() => onPick(promo)}
            aria-label={`Promote to ${promo}`}
          >
            <ChessPiece type={pieceTypeFromLetter(promo)} color={color} />
          </button>
        ))}
      </div>
    </>
  );
}
