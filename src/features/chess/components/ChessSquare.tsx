"use client";

import type { PointerEvent, ReactNode } from "react";

type ChessSquareProps = {
  square: string;
  isLight: boolean;
  selected?: boolean;
  lastMove?: boolean;
  legalEmpty?: boolean;
  legalCapture?: boolean;
  inCheck?: boolean;
  showFile?: boolean;
  showRank?: boolean;
  children?: ReactNode;
  onPointerDown?: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerEnter?: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerUp?: (event: PointerEvent<HTMLButtonElement>) => void;
};

export function ChessSquare({
  square,
  isLight,
  selected = false,
  lastMove = false,
  legalEmpty = false,
  legalCapture = false,
  inCheck = false,
  showFile = false,
  showRank = false,
  children,
  onPointerDown,
  onPointerEnter,
  onPointerUp,
}: ChessSquareProps) {
  return (
    <button
      type="button"
      data-square={square}
      aria-label={square}
      onPointerDown={onPointerDown}
      onPointerEnter={onPointerEnter}
      onPointerUp={onPointerUp}
      className="relative min-h-0 min-w-0 overflow-visible focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
      style={{
        background: isLight ? "var(--chess-light)" : "var(--chess-dark)",
        boxShadow: inCheck
          ? "inset 0 0 0 3px var(--chess-check), 0 0 14px 2px color-mix(in srgb, var(--chess-check) 70%, transparent)"
          : undefined,
      }}
    >
      {lastMove ? (
        <span
          className="pointer-events-none absolute inset-0"
          style={{ background: "var(--chess-last-move)" }}
        />
      ) : null}
      {selected ? (
        <span
          className="pointer-events-none absolute inset-0"
          style={{ background: "var(--chess-selected)" }}
        />
      ) : null}
      {legalEmpty ? (
        <span
          className="pointer-events-none absolute left-1/2 top-1/2 z-[1] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            width: "28%",
            height: "28%",
            background: "var(--chess-dot)",
          }}
        />
      ) : null}
      {legalCapture ? (
        <span
          className="pointer-events-none absolute inset-[10%] z-[1] rounded-full"
          style={{
            boxShadow: "inset 0 0 0 3.5px var(--chess-dot)",
          }}
        />
      ) : null}
      {showFile ? (
        <span
          className="pointer-events-none absolute bottom-0.5 right-1 z-[1] text-[10px] font-bold leading-none"
          style={{ color: isLight ? "var(--chess-dark)" : "var(--chess-light)" }}
        >
          {square[0]}
        </span>
      ) : null}
      {showRank ? (
        <span
          className="pointer-events-none absolute left-0.5 top-0.5 z-[1] text-[10px] font-bold leading-none"
          style={{ color: isLight ? "var(--chess-dark)" : "var(--chess-light)" }}
        >
          {square[1]}
        </span>
      ) : null}
      <span className="relative z-[2] flex h-full w-full items-center justify-center p-[7%]">
        {children}
      </span>
    </button>
  );
}
