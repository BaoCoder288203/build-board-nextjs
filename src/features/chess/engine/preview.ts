import { Chess, type Square } from "chess.js";
import { CHESS_START_FEN } from "../constants/chess.constants";
import type {
  ChessMoveRecord,
  ChessPromotion,
  PublicChessGame,
} from "../types/game.types";
import type { ChessColor } from "../types/player.types";
import { isChessSquare } from "../utils/boardUtils";

function asSquare(square: string): Square | null {
  return isChessSquare(square) ? (square as Square) : null;
}

export function loadChess(fen?: string | null) {
  try {
    return new Chess(fen || CHESS_START_FEN);
  } catch {
    return new Chess();
  }
}

export function turnFromFen(fen?: string | null): ChessColor {
  const side = (fen || CHESS_START_FEN).split(" ")[1];
  return side === "b" ? "BLACK" : "WHITE";
}

export function kingSquare(fen: string, color: ChessColor) {
  const chess = loadChess(fen);
  const needle = color === "WHITE" ? "K" : "k";
  for (const row of chess.board()) {
    for (const cell of row) {
      if (!cell) continue;
      const letter = cell.color === "w" ? cell.type.toUpperCase() : cell.type;
      if (letter === needle) return String(cell.square);
    }
  }
  return null;
}

export function piecesFromFen(fen: string) {
  const chess = loadChess(fen);
  const pieces: Array<{
    square: string;
    type: "K" | "Q" | "R" | "B" | "N" | "P";
    color: ChessColor;
  }> = [];
  for (const row of chess.board()) {
    for (const cell of row) {
      if (!cell) continue;
      pieces.push({
        square: String(cell.square),
        type: cell.type.toUpperCase() as "K" | "Q" | "R" | "B" | "N" | "P",
        color: cell.color === "w" ? "WHITE" : "BLACK",
      });
    }
  }
  return pieces;
}

export function legalMovesFrom(fen: string, square: string): Array<{
  from: string;
  to: string;
  promotion?: ChessPromotion;
  captured: boolean;
  san: string;
}> {
  const sq = asSquare(square);
  if (!sq) return [];
  const chess = loadChess(fen);
  return chess.moves({ square: sq, verbose: true }).map((move) => ({
    from: String(move.from),
    to: String(move.to),
    promotion: (move.promotion as ChessPromotion | undefined) ?? undefined,
    captured: Boolean(move.captured),
    san: move.san,
  }));
}

export function needsPromotion(fen: string, from: string, to: string) {
  const moves = legalMovesFrom(fen, from).filter((m) => m.to === to);
  return moves.some((m) => m.promotion);
}

export function isLegalDestination(fen: string, from: string, to: string) {
  return legalMovesFrom(fen, from).some((m) => m.to === to);
}

export function previewMove(
  fen: string,
  from: string,
  to: string,
  promotion?: ChessPromotion,
) {
  const chess = loadChess(fen);
  try {
    const move = chess.move({ from, to, promotion });
    return {
      fen: chess.fen(),
      san: move.san,
      captured: move.captured,
      promotion: move.promotion as ChessPromotion | undefined,
      inCheck: chess.isCheck(),
    };
  } catch {
    return null;
  }
}

export function recordsFromPgn(pgn: string): ChessMoveRecord[] {
  if (!pgn.trim()) return [];
  const chess = new Chess();
  try {
    chess.loadPgn(pgn);
  } catch {
    return [];
  }
  const verbose = chess.history({ verbose: true });
  return verbose.map((move, index) => ({
    ply: index + 1,
    from: String(move.from),
    to: String(move.to),
    san: move.san,
    piece: move.piece,
    captured: move.captured,
    promotion: move.promotion as ChessPromotion | undefined,
    color: move.color === "w" ? "WHITE" : "BLACK",
    isCheck: move.san.includes("+") || move.san.includes("#"),
    isCheckmate: move.san.includes("#"),
    fenAfter: move.after,
  }));
}

export function fenAtPly(game: PublicChessGame, ply: number | null) {
  if (ply == null) return game.fen;
  if (ply <= 0) return CHESS_START_FEN;
  const moves = game.moves.length ? game.moves : recordsFromPgn(game.pgn);
  return moves[ply - 1]?.fenAfter ?? game.fen;
}

export function pairedMoves(records: ChessMoveRecord[]) {
  const rows: Array<{ number: number; white?: ChessMoveRecord; black?: ChessMoveRecord }> = [];
  for (const move of records) {
    const number = Math.ceil(move.ply / 2);
    let row = rows[number - 1];
    if (!row) {
      row = { number };
      rows[number - 1] = row;
    }
    if (move.color === "WHITE") row.white = move;
    else row.black = move;
  }
  return rows;
}
