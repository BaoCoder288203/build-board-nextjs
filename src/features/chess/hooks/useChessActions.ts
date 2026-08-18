import { CHESS_CLIENT_EVENT } from "../socket/chessEvents";
import { emitChess, newChessRequestId } from "../socket/ChessSocketClient";
import { requestChessSnapshot } from "../socket/ChessReconnectManager";
import { useChessStore } from "../store/chessStore";
import type { ChessPromotion } from "../types/game.types";
import type { ChessAck } from "../types/socket.types";

async function send<T>(event: string, payload?: T): Promise<ChessAck> {
  const { room, game, setError } = useChessStore.getState();
  if (!room) return { ok: false, code: "ROOM_NOT_FOUND", message: "No chess room" };
  const ack = await emitChess(event, {
    requestId: newChessRequestId(),
    roomId: room.id,
    gameId: game?.gameId ?? room.gameId ?? undefined,
    payload,
  });
  if (!ack.ok) {
    setError({ code: ack.code, message: ack.message });
    if (ack.code === "SEQUENCE_GAP") {
      void requestChessSnapshot(room.id);
    }
    if (event === CHESS_CLIENT_EVENT.MOVE) {
      useChessStore.getState().setOptimistic(null);
    }
  }
  return ack;
}

export const chessActions = {
  joinSocket: (roomId: string) =>
    emitChess(CHESS_CLIENT_EVENT.ROOM_JOIN, {
      requestId: newChessRequestId(),
      roomId,
    }),
  leave: () => send(CHESS_CLIENT_EVENT.ROOM_LEAVE),
  ready: () => send(CHESS_CLIENT_EVENT.PLAYER_READY),
  unready: () => send(CHESS_CLIENT_EVENT.PLAYER_UNREADY),
  start: () => send(CHESS_CLIENT_EVENT.GAME_START),
  move: (from: string, to: string, promotion?: ChessPromotion) =>
    send(CHESS_CLIENT_EVENT.MOVE, { from, to, promotion }),
  resign: () => send(CHESS_CLIENT_EVENT.RESIGN),
  offerDraw: () => send(CHESS_CLIENT_EVENT.DRAW_OFFER),
  respondDraw: (accept: boolean) => send(CHESS_CLIENT_EVENT.DRAW_RESPOND, { accept }),
  rematch: () => send(CHESS_CLIENT_EVENT.REMATCH_REQUEST),
  snapshot: () => {
    const room = useChessStore.getState().room;
    if (!room) return Promise.resolve();
    return requestChessSnapshot(room.id);
  },
};
