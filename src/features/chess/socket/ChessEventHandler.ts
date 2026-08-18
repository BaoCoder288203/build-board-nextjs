import { CHESS_START_FEN } from "../constants/chess.constants";
import { recordsFromPgn, turnFromFen } from "../engine/preview";
import {
  isGap,
  normalizeClocks,
  normalizeGame,
  normalizeRoom,
  useChessStore,
} from "../store/chessStore";
import type {
  ChessClockSyncPayload,
  ChessDrawOffer,
  ChessEndedPayload,
  ChessMovedPayload,
  ChessSnapshot,
  PublicChessGame,
  PublicChessRoom,
} from "../types/game.types";
import type { ChessServerEvent } from "../types/socket.types";
import { oppositeColor } from "../utils/boardUtils";
import { CHESS_SERVER_EVENT } from "./chessEvents";
import { requestChessSnapshot } from "./ChessReconnectManager";

function asEvent<T>(raw: unknown): ChessServerEvent<T> | null {
  if (!raw || typeof raw !== "object") return null;
  const event = raw as ChessServerEvent<T>;
  if (!event.type && event.payload === undefined) return null;
  return event;
}

function maybeSnapshotOnGap(sequence?: number) {
  const { room, sequence: local } = useChessStore.getState();
  if (!room) return false;
  if (!isGap(local, sequence)) return false;
  void requestChessSnapshot(room.id);
  return true;
}

function mergeMoved(game: PublicChessGame, payload: ChessMovedPayload): PublicChessGame {
  const moves = game.moves.length ? [...game.moves] : recordsFromPgn(game.pgn);
  const ply = moves.length + 1;
  moves.push({
    ply,
    from: payload.from,
    to: payload.to,
    san: payload.san,
    piece: "",
    captured: payload.captured,
    promotion: payload.promotion,
    color: payload.color,
    isCheck: payload.inCheck,
    isCheckmate: payload.isCheckmate,
    fenAfter: payload.fen,
  });
  return {
    ...game,
    fen: payload.fen,
    sequence: payload.sequence,
    turn: oppositeColor(payload.color),
    inCheck: payload.inCheck,
    lastMove: {
      from: payload.from,
      to: payload.to,
      san: payload.san,
      promotion: payload.promotion,
      captured: payload.captured,
    },
    clocks: normalizeClocks(payload.clocks, game.clocks),
    status: payload.isCheckmate || payload.isDraw ? "FINISHED" : "PLAYING",
    moves,
    pgn: game.pgn
      ? `${game.pgn} ${payload.san}`.trim()
      : payload.san,
  };
}

export function handleChessServerEvent(eventName: string, raw: unknown) {
  const store = useChessStore.getState();

  if (eventName === CHESS_SERVER_EVENT.ERROR) {
    const event = asEvent<{ code: string; message: string }>(raw);
    if (!event) return;
    const payload = event.payload ?? (raw as { code?: string; message?: string });
    const code = payload.code ?? "ERROR";
    store.setError({
      code,
      message: payload.message ?? "Chess error",
    });
    if (code === "SEQUENCE_GAP" && store.room) {
      void requestChessSnapshot(store.room.id);
    }
    if (code === "ILLEGAL_MOVE") {
      store.setOptimistic(null);
    }
    return;
  }

  if (eventName === CHESS_SERVER_EVENT.ROOM_INVITE) {
    const event = asEvent<{ room: PublicChessRoom; invitedBy: string }>(raw);
    const room = normalizeRoom(event?.payload?.room ?? event?.payload);
    if (!room) return;
    if (store.room?.id === room.id) return;
    store.setPendingInvite({
      room,
      invitedBy: String(event?.payload?.invitedBy ?? ""),
    });
    return;
  }

  if (eventName === CHESS_SERVER_EVENT.SNAPSHOT) {
    const event = asEvent<ChessSnapshot>(raw);
    const snapshot = event?.payload;
    const room = normalizeRoom(snapshot?.room ?? snapshot);
    if (!room) return;
    store.applySnapshot({
      sequence: snapshot?.sequence ?? event?.sequence ?? 0,
      serverTime: snapshot?.serverTime ?? event?.occurredAt,
      room,
      game: normalizeGame(snapshot?.game, store.game),
    });
    return;
  }

  if (
    eventName === CHESS_SERVER_EVENT.ROOM_UPDATED ||
    eventName === CHESS_SERVER_EVENT.PLAYER_JOINED ||
    eventName === CHESS_SERVER_EVENT.PLAYER_LEFT ||
    eventName === CHESS_SERVER_EVENT.PLAYER_DISCONNECTED ||
    eventName === CHESS_SERVER_EVENT.PLAYER_RECONNECTED
  ) {
    const event = asEvent<{ room?: PublicChessRoom }>(raw);
    const room = normalizeRoom(event?.payload?.room ?? event?.payload, store.room);
    if (room) store.applyRoom(room);
    return;
  }

  if (eventName === CHESS_SERVER_EVENT.GAME_STARTED) {
    const event = asEvent<Record<string, unknown>>(raw);
    if (store.room && event) {
      const gameId =
        (typeof event.payload?.gameId === "string" && event.payload.gameId) ||
        event.gameId ||
        store.room.gameId;
      store.applyRoom({
        ...store.room,
        status: "PLAYING",
        gameId: gameId ?? store.room.gameId,
      });
    }
    const game = normalizeGame(event?.payload, store.game);
    if (game) store.applyGame(game, event?.sequence ?? game.sequence);
    return;
  }

  if (eventName === CHESS_SERVER_EVENT.GAME_STATE) {
    const event = asEvent<PublicChessGame>(raw);
    if (maybeSnapshotOnGap(event?.sequence ?? event?.payload?.sequence)) return;
    const game = normalizeGame(event?.payload ?? raw, store.game);
    if (!game) return;
    store.applyGame(game, event?.sequence ?? game.sequence);
    return;
  }

  if (eventName === CHESS_SERVER_EVENT.MOVED) {
    const event = asEvent<ChessMovedPayload>(raw);
    const payload = event?.payload;
    if (!payload?.fen || !payload.from || !payload.to) return;
    if (maybeSnapshotOnGap(event?.sequence ?? payload.sequence)) return;
    const current =
      store.game ??
      normalizeGame(
        {
          gameId: event?.gameId ?? store.room?.gameId,
          fen: CHESS_START_FEN,
          turn: turnFromFen(CHESS_START_FEN),
        },
        null,
      );
    if (!current) return;
    store.applyGame(mergeMoved(current, payload), payload.sequence ?? event?.sequence);
    return;
  }

  if (eventName === CHESS_SERVER_EVENT.DRAW_OFFERED) {
    const event = asEvent<{
      byPlayerId?: string;
      playerId?: string;
      byUserId?: string;
      byColor?: "WHITE" | "BLACK";
      drawOffer?: ChessDrawOffer;
    }>(raw);
    if (!store.game) return;
    const offer: ChessDrawOffer = event?.payload?.drawOffer ?? {
      byPlayerId: String(event?.payload?.byPlayerId ?? event?.payload?.playerId ?? ""),
      byUserId: event?.payload?.byUserId,
      byColor: event?.payload?.byColor,
    };
    store.applyGame(
      {
        ...store.game,
        drawOffer: offer,
        status: store.game.status === "FINISHED" ? store.game.status : "WAITING_FOR_DRAW",
      },
      event?.sequence,
    );
    return;
  }

  if (eventName === CHESS_SERVER_EVENT.DRAW_RESOLVED) {
    const event = asEvent<{ accepted?: boolean }>(raw);
    if (!store.game) return;
    store.applyGame(
      {
        ...store.game,
        drawOffer: null,
        status: store.game.status === "WAITING_FOR_DRAW" ? "PLAYING" : store.game.status,
      },
      event?.sequence,
    );
    return;
  }

  if (eventName === CHESS_SERVER_EVENT.CLOCK_SYNC) {
    const event = asEvent<ChessClockSyncPayload>(raw);
    const payload = event?.payload;
    if (!payload || typeof payload.whiteTimeMs !== "number") return;
    store.applyClocks(
      {
        whiteTimeMs: payload.whiteTimeMs,
        blackTimeMs: payload.blackTimeMs,
        runningColor: payload.runningColor,
        lastStartedAt: payload.lastStartedAt ?? store.game?.clocks.lastStartedAt ?? null,
      },
      payload.serverTime,
    );
    return;
  }

  if (eventName === CHESS_SERVER_EVENT.GAME_ENDED) {
    const event = asEvent<ChessEndedPayload>(raw);
    const payload = event?.payload;
    if (!payload) return;
    if (store.room) {
      store.applyRoom({ ...store.room, status: "FINISHED" });
    }
    const current = store.game;
    store.applyGame(
      {
        gameId: current?.gameId ?? event.gameId ?? store.room?.gameId ?? "",
        status: "FINISHED",
        sequence: payload.sequence ?? event.sequence ?? store.sequence,
        fen: payload.fen ?? current?.fen ?? CHESS_START_FEN,
        pgn: payload.pgn ?? current?.pgn ?? "",
        moves: current?.moves ?? [],
        clocks: current?.clocks ?? {
          whiteTimeMs: 0,
          blackTimeMs: 0,
          runningColor: null,
          lastStartedAt: null,
        },
        turn: current?.turn ?? "WHITE",
        inCheck: current?.inCheck ?? false,
        lastMove: current?.lastMove ?? null,
        drawOffer: null,
        winnerColor: payload.winnerColor,
        winnerId: payload.winnerId,
        endReason: payload.reason,
      },
      payload.sequence ?? event.sequence,
    );
  }
}
