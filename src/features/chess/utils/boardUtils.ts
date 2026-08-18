import { CHESS_FILES, CHESS_RANKS } from "../constants/chess.constants";

export function isChessSquare(value: string): boolean {
  return /^[a-h][1-8]$/.test(value);
}

export function fileIndex(square: string) {
  return square.charCodeAt(0) - 97;
}

export function rankIndex(square: string) {
  return Number(square[1]) - 1;
}

export function makeSquare(file: number, rank: number) {
  if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
  return `${CHESS_FILES[file]}${CHESS_RANKS[rank]}`;
}

export function isLightSquare(square: string) {
  return (fileIndex(square) + rankIndex(square)) % 2 === 1;
}

export function displaySquares(flipped: boolean) {
  const ranks = flipped ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
  const files = flipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const squares: string[] = [];
  for (const rank of ranks) {
    for (const file of files) {
      squares.push(makeSquare(file, rank)!);
    }
  }
  return squares;
}

export function pointToSquare(
  clientX: number,
  clientY: number,
  board: DOMRect,
  flipped: boolean,
) {
  if (board.width <= 0 || board.height <= 0) return null;
  const col = Math.floor(((clientX - board.left) / board.width) * 8);
  const row = Math.floor(((clientY - board.top) / board.height) * 8);
  if (col < 0 || col > 7 || row < 0 || row > 7) return null;
  const file = flipped ? 7 - col : col;
  const rank = flipped ? row : 7 - row;
  return makeSquare(file, rank);
}

export function squareDeltaPx(
  from: string,
  to: string,
  squareSize: number,
  flipped: boolean,
) {
  const fileDelta = fileIndex(to) - fileIndex(from);
  const rankDelta = rankIndex(to) - rankIndex(from);
  const x = (flipped ? -fileDelta : fileDelta) * squareSize;
  const y = (flipped ? rankDelta : -rankDelta) * squareSize;
  return { x, y };
}

export function castleRookMove(from: string, to: string) {
  if (from === "e1" && to === "g1") return { from: "h1", to: "f1" };
  if (from === "e1" && to === "c1") return { from: "a1", to: "d1" };
  if (from === "e8" && to === "g8") return { from: "h8", to: "f8" };
  if (from === "e8" && to === "c8") return { from: "a8", to: "d8" };
  return null;
}

export function enPassantCaptureSquare(from: string, to: string, captured?: string) {
  if (!captured) return null;
  if (from[0] === to[0]) return null;
  if (from[1] === to[1]) return null;
  const ep = `${to[0]}${from[1]}`;
  return isChessSquare(ep) && ep !== to ? ep : null;
}

export function oppositeColor<T extends "WHITE" | "BLACK">(color: T): T extends "WHITE" ? "BLACK" : "WHITE" {
  return (color === "WHITE" ? "BLACK" : "WHITE") as T extends "WHITE" ? "BLACK" : "WHITE";
}
