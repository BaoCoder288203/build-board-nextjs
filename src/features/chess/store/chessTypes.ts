import type {
  ChessBoardTheme,
  ChessClocks,
  PublicChessGame,
  PublicChessRoom,
} from "../types/game.types";

export type ChessPendingInvite = {
  room: PublicChessRoom;
  invitedBy: string;
};

export type ChessOptimisticMove = {
  fen: string;
  from: string;
  to: string;
  captured?: string;
};

export type ChessClockSyncMeta = {
  serverTimeMs: number;
  receivedPerf: number;
  hidden: boolean;
};

export type ChessStoreState = {
  overlayOpen: boolean;
  room: PublicChessRoom | null;
  game: PublicChessGame | null;
  sequence: number;
  myUserId: string | null;
  previewPly: number | null;
  pendingInvite: ChessPendingInvite | null;
  lastError: { code: string; message: string } | null;
  busy: boolean;
  optimistic: ChessOptimisticMove | null;
  clockSync: ChessClockSyncMeta | null;
  boardTheme: ChessBoardTheme;
};

export type ChessStoreActions = {
  setMyUserId: (id: string | null) => void;
  setOverlayOpen: (open: boolean) => void;
  setBusy: (busy: boolean) => void;
  setPendingInvite: (invite: ChessPendingInvite | null) => void;
  setPreviewPly: (ply: number | null) => void;
  setBoardTheme: (theme: ChessBoardTheme) => void;
  applyRoom: (room: PublicChessRoom) => void;
  applyGame: (game: PublicChessGame, sequence?: number) => void;
  applySnapshot: (snapshot: {
    sequence: number;
    serverTime?: string;
    room: PublicChessRoom;
    game: PublicChessGame | null;
  }) => void;
  applyClocks: (clocks: Partial<ChessClocks> & Pick<ChessClocks, "whiteTimeMs" | "blackTimeMs">, serverTime?: string | number) => void;
  setOptimistic: (move: ChessOptimisticMove | null) => void;
  setError: (error: { code: string; message: string } | null) => void;
  resetSession: () => void;
};
