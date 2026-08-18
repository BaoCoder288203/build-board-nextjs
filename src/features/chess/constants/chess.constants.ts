export const CHESS_MVP = {
  minPlayers: 2,
  maxPlayers: 2,
  allowSpectator: true,
  initialTimeMs: 10 * 60 * 1000,
  incrementMs: 0,
  clockEnabled: true,
  lowTimeMs: 30_000,
  criticalTimeMs: 10_000,
  disconnectGraceMs: 8_000,
  hostColor: "WHITE",
} as const;

export const CHESS_START_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export const CHESS_TABLE = {
  from: "#0F1B3C",
  to: "#1B2744",
} as const;

export const CHESS_THEME = {
  classic: {
    light: "#EBECD0",
    dark: "#779556",
  },
  wood: {
    light: "#F0D9B5",
    dark: "#B58863",
  },
} as const;

export const CHESS_TOKEN = {
  selected: "rgba(255, 255, 0, 0.35)",
  lastMove: "rgba(255, 255, 0, 0.28)",
  dot: "rgba(0, 0, 0, 0.28)",
  check: "#e8394b",
} as const;

export const CHESS_FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
export const CHESS_RANKS = ["1", "2", "3", "4", "5", "6", "7", "8"] as const;

export const CHESS_PROMOTIONS = ["q", "r", "b", "n"] as const;

export const CHESS_PIECE_VALUE: Record<string, number> = {
  q: 9,
  r: 5,
  b: 3,
  n: 3,
  p: 1,
  k: 0,
};

export const CHESS_CAPTURE_ORDER = ["q", "r", "b", "n", "p"] as const;

export const CHESS_SFX_MUTE_KEY = "bb.chess.sfxMuted";
export const CHESS_THEME_KEY = "bb.chess.boardTheme";

export const CHESS_END_REASON_COPY: Record<string, string> = {
  CHECKMATE: "Checkmate",
  STALEMATE: "Stalemate",
  INSUFFICIENT_MATERIAL: "Draw by insufficient material",
  THREEFOLD: "Draw by threefold repetition",
  FIFTY_MOVE: "Draw by the fifty-move rule",
  AGREED_DRAW: "Draw by agreement",
  RESIGN: "Resignation",
  TIMEOUT: "Time expired",
  TIMEOUT_VS_INSUFFICIENT: "Draw — timeout vs insufficient material",
  OPPONENT_LEFT: "Opponent left the game",
  HOST_CLOSED: "The call ended",
  ABANDONED: "Game abandoned",
};
