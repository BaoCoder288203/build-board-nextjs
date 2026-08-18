import { CHESS_END_REASON_COPY } from "../constants/chess.constants";
import type { ChessColor } from "../types/player.types";

export function endReasonLabel(reason?: string | null) {
  if (!reason) return "Game over";
  return CHESS_END_REASON_COPY[reason] ?? reason;
}

export function resultHeadline(
  winnerColor: ChessColor | null | undefined,
  myColor: ChessColor | null,
) {
  if (!winnerColor) return "Draw";
  if (myColor && winnerColor === myColor) return "You Win";
  if (myColor && winnerColor !== myColor) return "You Lose";
  return winnerColor === "WHITE" ? "White wins" : "Black wins";
}
