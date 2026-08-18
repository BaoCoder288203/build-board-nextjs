import type { ChessPieceType } from "../types/game.types";
import type { ChessColor } from "../types/player.types";

export const CHESS_PIECE_FILES: Record<ChessPieceType, string> = {
  P: "pawn",
  N: "knight",
  B: "bishop",
  R: "rook",
  Q: "queen",
  K: "king",
};

export const CHESS_PIECE_EXT = "svg";

const TYPES: ChessPieceType[] = ["P", "N", "B", "R", "Q", "K"];
const COLORS: ChessColor[] = ["WHITE", "BLACK"];

export function chessPieceSrc(color: ChessColor, type: ChessPieceType, theme = "classic") {
  const folder = color === "WHITE" ? "white" : "black";
  return `/chess/pieces/${theme}/${folder}/${CHESS_PIECE_FILES[type]}.${CHESS_PIECE_EXT}`;
}

export function preloadChessPieces(theme = "classic") {
  if (typeof window === "undefined") return Promise.resolve();
  return Promise.all(
    COLORS.flatMap((color) =>
      TYPES.map(
        (type) =>
          new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => resolve();
            img.src = chessPieceSrc(color, type, theme);
          }),
      ),
    ),
  ).then(() => undefined);
}
