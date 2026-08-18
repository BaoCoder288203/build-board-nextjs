import type { ChessColor, PublicChessPlayer } from "./player.types";

export type RoomStatus =
  | "WAITING"
  | "READY"
  | "PLAYING"
  | "FINISHED"
  | "CLOSED";

export type ChessGameStatus =
  | "INITIALIZING"
  | "PLAYING"
  | "WAITING_FOR_PROMOTION"
  | "WAITING_FOR_DRAW"
  | "PAUSED"
  | "FINISHED"
  | "ABORTED";

export type ChessPieceType = "K" | "Q" | "R" | "B" | "N" | "P";

export type ChessPromotion = "q" | "r" | "b" | "n";

export type ChessEndReason =
  | "CHECKMATE"
  | "STALEMATE"
  | "INSUFFICIENT_MATERIAL"
  | "THREEFOLD"
  | "FIFTY_MOVE"
  | "AGREED_DRAW"
  | "RESIGN"
  | "TIMEOUT"
  | "TIMEOUT_VS_INSUFFICIENT"
  | "OPPONENT_LEFT"
  | "HOST_CLOSED"
  | "ABANDONED";

export type ChessContextType = "MEETING" | "BOARD" | "WORKSPACE";

export type ChessClocks = {
  whiteTimeMs: number;
  blackTimeMs: number;
  runningColor: ChessColor | null;
  lastStartedAt: number | null;
};

export type ChessLastMove = {
  from: string;
  to: string;
  san: string;
  promotion?: ChessPromotion;
  captured?: string;
};

export type ChessMoveRecord = {
  ply: number;
  from: string;
  to: string;
  san: string;
  piece: string;
  captured?: string;
  promotion?: ChessPromotion;
  color: ChessColor;
  isCheck: boolean;
  isCheckmate: boolean;
  fenAfter: string;
};

export type ChessDrawOffer = {
  byPlayerId: string;
  byUserId?: string;
  byColor?: ChessColor;
} | null;

export type PublicChessRoom = {
  id: string;
  status: RoomStatus;
  hostId: string;
  hostUserId: string;
  contextType: ChessContextType;
  meetingId: string | null;
  boardId: string | null;
  workspaceId: string;
  maxPlayers: number;
  allowSpectator: boolean;
  initialTimeMs: number;
  incrementMs: number;
  players: PublicChessPlayer[];
  gameId: string | null;
  createdAt: string;
};

export type PublicChessGame = {
  gameId: string;
  status: ChessGameStatus;
  sequence: number;
  fen: string;
  pgn: string;
  moves: ChessMoveRecord[];
  clocks: ChessClocks;
  turn: ChessColor;
  inCheck: boolean;
  lastMove: ChessLastMove | null;
  drawOffer: ChessDrawOffer;
  winnerColor?: ChessColor | null;
  winnerId?: string | null;
  endReason?: ChessEndReason | string;
};

export type ChessSnapshot = {
  sequence: number;
  serverTime: string;
  room: PublicChessRoom;
  game: PublicChessGame | null;
};

export type ChessMovedPayload = {
  playerId: string;
  color: ChessColor;
  from: string;
  to: string;
  san: string;
  promotion?: ChessPromotion;
  captured?: string;
  fen: string;
  inCheck: boolean;
  isCheckmate: boolean;
  isDraw: boolean;
  clocks: {
    whiteTimeMs: number;
    blackTimeMs: number;
    runningColor: ChessColor | null;
    lastStartedAt?: number | null;
  };
  sequence: number;
};

export type ChessEndedPayload = {
  winnerColor: ChessColor | null;
  winnerId: string | null;
  reason: ChessEndReason | string;
  fen: string;
  pgn: string;
  sequence: number;
};

export type ChessClockSyncPayload = {
  whiteTimeMs: number;
  blackTimeMs: number;
  runningColor: ChessColor | null;
  serverTime: string | number;
  turn?: ChessColor;
  sequence?: number;
  lastStartedAt?: number | null;
};

export type ChessBoardTheme = "classic" | "wood";
