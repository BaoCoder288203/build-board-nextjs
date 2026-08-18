import {
  CHESS_CAPTURE_ORDER,
  CHESS_PIECE_VALUE,
} from "../constants/chess.constants";
import type { ChessColor } from "../types/player.types";

type PieceLetter = "q" | "r" | "b" | "n" | "p" | "k";

const EMPTY: Record<PieceLetter, number> = {
  q: 0,
  r: 0,
  b: 0,
  n: 0,
  p: 0,
  k: 0,
};

const START: Record<PieceLetter, number> = {
  q: 1,
  r: 2,
  b: 2,
  n: 2,
  p: 8,
  k: 1,
};

function countsFromFen(fen: string) {
  const board = fen.split(" ")[0] ?? "";
  const white = { ...EMPTY };
  const black = { ...EMPTY };
  for (const ch of board) {
    if (ch === "K") white.k += 1;
    else if (ch === "Q") white.q += 1;
    else if (ch === "R") white.r += 1;
    else if (ch === "B") white.b += 1;
    else if (ch === "N") white.n += 1;
    else if (ch === "P") white.p += 1;
    else if (ch === "k") black.k += 1;
    else if (ch === "q") black.q += 1;
    else if (ch === "r") black.r += 1;
    else if (ch === "b") black.b += 1;
    else if (ch === "n") black.n += 1;
    else if (ch === "p") black.p += 1;
  }
  return { white, black };
}

function missing(start: Record<PieceLetter, number>, now: Record<PieceLetter, number>) {
  const out: Array<{ type: "Q" | "R" | "B" | "N" | "P"; count: number }> = [];
  for (const letter of CHESS_CAPTURE_ORDER) {
    const count = Math.max(0, start[letter] - now[letter]);
    if (count > 0) {
      out.push({ type: letter.toUpperCase() as "Q" | "R" | "B" | "N" | "P", count });
    }
  }
  return out;
}

function materialOf(now: Record<PieceLetter, number>) {
  return (Object.keys(CHESS_PIECE_VALUE) as PieceLetter[]).reduce(
    (sum, key) => sum + now[key] * (CHESS_PIECE_VALUE[key] ?? 0),
    0,
  );
}

export function capturedSets(fen: string) {
  const { white, black } = countsFromFen(fen);
  return {
    byWhite: missing(START, black).flatMap((p) =>
      Array.from({ length: p.count }, () => ({ type: p.type, color: "BLACK" as const })),
    ),
    byBlack: missing(START, white).flatMap((p) =>
      Array.from({ length: p.count }, () => ({ type: p.type, color: "WHITE" as const })),
    ),
    whiteMaterial: materialOf(white),
    blackMaterial: materialOf(black),
  };
}

export function materialDiffFor(fen: string, perspective: ChessColor) {
  const { whiteMaterial, blackMaterial } = capturedSets(fen);
  const whiteAhead = whiteMaterial - blackMaterial;
  return perspective === "WHITE" ? whiteAhead : -whiteAhead;
}
