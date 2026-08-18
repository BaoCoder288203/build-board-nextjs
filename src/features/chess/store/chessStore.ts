import { CHESS_MVP, CHESS_START_FEN, CHESS_THEME_KEY } from "../constants/chess.constants";
import { recordsFromPgn, turnFromFen } from "../engine/preview";
import type {
  ChessBoardTheme,
  ChessClocks,
  ChessDrawOffer,
  ChessMoveRecord,
  ChessPromotion,
  PublicChessGame,
  PublicChessRoom,
} from "../types/game.types";
import { defaultClocks, parseServerTime } from "../utils/clockUtils";
import { create } from "zustand";
import type { ChessOptimisticMove, ChessStoreActions, ChessStoreState } from "./chessTypes";

function shouldApply(local: number, incoming?: number) {
  if (incoming == null) return true;
  return incoming >= local;
}

function isGap(local: number, incoming?: number) {
  if (incoming == null) return false;
  return incoming > local + 1;
}

function readTheme(): ChessBoardTheme {
  if (typeof window === "undefined") return "classic";
  try {
    return window.localStorage.getItem(CHESS_THEME_KEY) === "wood" ? "wood" : "classic";
  } catch {
    return "classic";
  }
}

function normalizeMoves(raw: unknown, pgn: string, fallback?: ChessMoveRecord[]): ChessMoveRecord[] {
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((item, index) => {
      const move = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
      const san = String(move.san ?? "");
      const promotion = move.promotion;
      return {
        ply: typeof move.ply === "number" ? move.ply : index + 1,
        from: String(move.from ?? ""),
        to: String(move.to ?? ""),
        san,
        piece: String(move.piece ?? ""),
        captured: typeof move.captured === "string" ? move.captured : undefined,
        promotion:
          promotion === "q" || promotion === "r" || promotion === "b" || promotion === "n"
            ? (promotion as ChessPromotion)
            : undefined,
        color: move.color === "BLACK" ? "BLACK" : "WHITE",
        isCheck: Boolean(move.isCheck ?? (san.includes("+") || san.includes("#"))),
        isCheckmate: Boolean(move.isCheckmate ?? san.includes("#")),
        fenAfter: String(move.fenAfter ?? move.fen ?? ""),
      };
    });
  }
  if (pgn.trim()) return recordsFromPgn(pgn);
  return fallback ?? [];
}

function normalizeDrawOffer(nested: Record<string, unknown>, fallback?: ChessDrawOffer): ChessDrawOffer {
  const offer = nested.drawOffer;
  if (offer && typeof offer === "object") {
    const value = offer as Record<string, unknown>;
    const byPlayerId = String(value.byPlayerId ?? value.playerId ?? "");
    if (!byPlayerId) return fallback ?? null;
    return {
      byPlayerId,
      byUserId: typeof value.byUserId === "string" ? value.byUserId : undefined,
      byColor: value.byColor === "WHITE" || value.byColor === "BLACK" ? value.byColor : undefined,
    };
  }
  if (typeof nested.drawOfferBy === "string" && nested.drawOfferBy) {
    return { byPlayerId: nested.drawOfferBy };
  }
  if (nested.drawOffer === null || nested.drawOfferBy === null) return null;
  return fallback ?? null;
}

export function normalizeClocks(raw: unknown, fallback?: ChessClocks | null): ChessClocks {
  const base = fallback ?? defaultClocks();
  if (!raw || typeof raw !== "object") return base;
  const value = raw as Record<string, unknown>;
  const nested =
    value.clocks && typeof value.clocks === "object"
      ? (value.clocks as Record<string, unknown>)
      : value;
  return {
    whiteTimeMs:
      typeof nested.whiteTimeMs === "number" ? nested.whiteTimeMs : base.whiteTimeMs,
    blackTimeMs:
      typeof nested.blackTimeMs === "number" ? nested.blackTimeMs : base.blackTimeMs,
    runningColor:
      nested.runningColor === "WHITE" || nested.runningColor === "BLACK"
        ? nested.runningColor
        : nested.runningColor === null
          ? null
          : base.runningColor,
    lastStartedAt:
      typeof nested.lastStartedAt === "number"
        ? nested.lastStartedAt
        : base.lastStartedAt,
  };
}

export function normalizeGame(
  raw: unknown,
  fallback?: PublicChessGame | null,
): PublicChessGame | null {
  if (!raw || typeof raw !== "object") return fallback ?? null;
  const value = raw as Record<string, unknown>;
  const nested =
    value.game && typeof value.game === "object" && !("fen" in value)
      ? (value.game as Record<string, unknown>)
      : value;
  const fen =
    typeof nested.fen === "string"
      ? nested.fen
      : fallback?.fen ?? CHESS_START_FEN;
  const gameId =
    (typeof nested.gameId === "string" && nested.gameId) ||
    (typeof value.gameId === "string" && value.gameId) ||
    fallback?.gameId;
  if (!gameId && !fen) return fallback ?? null;

  const lastMoveRaw = nested.lastMove;
  const lastMove =
    lastMoveRaw && typeof lastMoveRaw === "object"
      ? {
          from: String((lastMoveRaw as { from?: string }).from ?? ""),
          to: String((lastMoveRaw as { to?: string }).to ?? ""),
          san: String((lastMoveRaw as { san?: string }).san ?? ""),
          promotion: (lastMoveRaw as { promotion?: "q" | "r" | "b" | "n" }).promotion,
          captured: (lastMoveRaw as { captured?: string }).captured,
        }
      : fallback?.lastMove ?? null;

  return {
    gameId: gameId ?? fallback?.gameId ?? "",
    status: (nested.status as PublicChessGame["status"]) ?? fallback?.status ?? "PLAYING",
    sequence:
      typeof nested.sequence === "number"
        ? nested.sequence
        : typeof value.sequence === "number"
          ? value.sequence
          : fallback?.sequence ?? 0,
    fen,
    pgn: typeof nested.pgn === "string" ? nested.pgn : fallback?.pgn ?? "",
    moves: normalizeMoves(
      nested.moves,
      typeof nested.pgn === "string" ? nested.pgn : fallback?.pgn ?? "",
      fallback?.moves,
    ),
    clocks: normalizeClocks(nested.clocks ?? nested, fallback?.clocks),
    turn:
      nested.turn === "WHITE" || nested.turn === "BLACK"
        ? nested.turn
        : fallback?.turn ?? turnFromFen(fen),
    inCheck: Boolean(nested.inCheck ?? fallback?.inCheck),
    lastMove: lastMove && lastMove.from && lastMove.to ? lastMove : fallback?.lastMove ?? null,
    drawOffer: normalizeDrawOffer(nested, fallback?.drawOffer),
    winnerColor:
      nested.winnerColor === "WHITE" || nested.winnerColor === "BLACK" || nested.winnerColor === null
        ? nested.winnerColor
        : fallback?.winnerColor,
    winnerId:
      typeof nested.winnerId === "string" || nested.winnerId === null
        ? (nested.winnerId as string | null)
        : fallback?.winnerId,
    endReason:
      typeof nested.endReason === "string"
        ? nested.endReason
        : typeof nested.reason === "string"
          ? nested.reason
          : fallback?.endReason,
  };
}

export function normalizeRoom(raw: unknown, fallback?: PublicChessRoom | null): PublicChessRoom | null {
  if (!raw || typeof raw !== "object") return fallback ?? null;
  const value = raw as Record<string, unknown>;
  const nested =
    value.room && typeof value.room === "object" ? (value.room as Record<string, unknown>) : value;
  if (typeof nested.id !== "string") return fallback ?? null;
  return {
    id: nested.id,
    status: (nested.status as PublicChessRoom["status"]) ?? fallback?.status ?? "WAITING",
    hostId: String(nested.hostId ?? fallback?.hostId ?? ""),
    hostUserId: String(nested.hostUserId ?? fallback?.hostUserId ?? ""),
    contextType: (nested.contextType as PublicChessRoom["contextType"]) ?? fallback?.contextType ?? "MEETING",
    meetingId:
      typeof nested.meetingId === "string" || nested.meetingId === null
        ? (nested.meetingId as string | null)
        : fallback?.meetingId ?? null,
    boardId:
      typeof nested.boardId === "string" || nested.boardId === null
        ? (nested.boardId as string | null)
        : fallback?.boardId ?? null,
    workspaceId: String(nested.workspaceId ?? fallback?.workspaceId ?? ""),
    maxPlayers: typeof nested.maxPlayers === "number" ? nested.maxPlayers : fallback?.maxPlayers ?? 2,
    allowSpectator: Boolean(nested.allowSpectator ?? fallback?.allowSpectator ?? true),
    initialTimeMs:
      typeof nested.initialTimeMs === "number"
        ? nested.initialTimeMs
        : fallback?.initialTimeMs ?? CHESS_MVP.initialTimeMs,
    incrementMs:
      typeof nested.incrementMs === "number" ? nested.incrementMs : fallback?.incrementMs ?? 0,
    players: Array.isArray(nested.players)
      ? (nested.players as PublicChessRoom["players"])
      : fallback?.players ?? [],
    gameId:
      typeof nested.gameId === "string" || nested.gameId === null
        ? (nested.gameId as string | null)
        : fallback?.gameId ?? null,
    createdAt: String(nested.createdAt ?? fallback?.createdAt ?? new Date().toISOString()),
  };
}

const initialState: ChessStoreState = {
  overlayOpen: false,
  room: null,
  game: null,
  sequence: 0,
  myUserId: null,
  previewPly: null,
  pendingInvite: null,
  lastError: null,
  busy: false,
  optimistic: null,
  clockSync: null,
  boardTheme: "classic",
};

export const useChessStore = create<ChessStoreState & ChessStoreActions>((set) => ({
  ...initialState,
  boardTheme: readTheme(),

  setMyUserId: (id) => set({ myUserId: id }),
  setOverlayOpen: (open) => set({ overlayOpen: open }),
  setBusy: (busy) => set({ busy }),
  setPendingInvite: (invite) => set({ pendingInvite: invite }),
  setPreviewPly: (ply) => set({ previewPly: ply }),
  setBoardTheme: (theme) => {
    try {
      window.localStorage.setItem(CHESS_THEME_KEY, theme);
    } catch {
      /* ignore */
    }
    set({ boardTheme: theme });
  },
  setError: (error) => set({ lastError: error }),
  setOptimistic: (move: ChessOptimisticMove | null) => set({ optimistic: move }),

  applyRoom: (room) =>
    set((state) => {
      const backToLobby = room.status === "WAITING" || room.status === "READY";
      return {
        room,
        overlayOpen: true,
        game: backToLobby ? null : state.game,
        sequence: backToLobby ? 0 : state.sequence,
        previewPly: backToLobby ? null : state.previewPly,
        optimistic: backToLobby ? null : state.optimistic,
        pendingInvite:
          state.pendingInvite?.room.id === room.id ? null : state.pendingInvite,
      };
    }),

  applyGame: (game, sequence) =>
    set((state) => {
      const ended = game.status === "FINISHED" || game.status === "ABORTED";
      if (
        !ended &&
        (state.room?.status === "WAITING" || state.room?.status === "READY")
      ) {
        return state;
      }
      const nextSeq = sequence ?? game.sequence;
      if (!ended && isGap(state.sequence, nextSeq)) {
        return state;
      }
      const sameGame = state.game?.gameId === game.gameId;
      if (!ended && sameGame && !shouldApply(state.sequence, nextSeq)) return state;
      return {
        game,
        sequence: nextSeq,
        overlayOpen: true,
        optimistic: null,
        lastError: null,
        clockSync: {
          serverTimeMs: parseServerTime(undefined),
          receivedPerf: typeof performance !== "undefined" ? performance.now() : 0,
          hidden: typeof document !== "undefined" ? document.hidden : false,
        },
      };
    }),

  applySnapshot: (snapshot) =>
    set(() => {
      const backToLobby =
        snapshot.room.status === "WAITING" || snapshot.room.status === "READY";
      return {
        room: snapshot.room,
        game: backToLobby ? null : snapshot.game,
        sequence: backToLobby ? 0 : snapshot.sequence,
        overlayOpen: true,
        lastError: null,
        optimistic: null,
        previewPly: null,
        clockSync: snapshot.serverTime
          ? {
              serverTimeMs: parseServerTime(snapshot.serverTime),
              receivedPerf: typeof performance !== "undefined" ? performance.now() : 0,
              hidden: typeof document !== "undefined" ? document.hidden : false,
            }
          : null,
      };
    }),

  applyClocks: (clocks, serverTime) =>
    set((state) => {
      if (!state.game) return state;
      return {
        game: {
          ...state.game,
          clocks: {
            ...state.game.clocks,
            ...clocks,
          },
        },
        clockSync: {
          serverTimeMs: parseServerTime(serverTime),
          receivedPerf: typeof performance !== "undefined" ? performance.now() : 0,
          hidden: typeof document !== "undefined" ? document.hidden : false,
        },
      };
    }),

  resetSession: () =>
    set((state) => ({
      ...initialState,
      myUserId: state.myUserId,
      boardTheme: state.boardTheme,
    })),
}));

export { isGap };
