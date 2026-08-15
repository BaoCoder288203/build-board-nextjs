import { UNO_CLIENT_EVENT } from "../constants/uno.constants";
import { emitUno, newUnoRequestId } from "../socket/UnoSocketClient";
import { useUnoStore } from "../store/unoStore";
import type { UnoColor } from "../types/card.types";
import type { UnoAck } from "../types/socket.types";

async function send<T>(event: string, payload?: T): Promise<UnoAck> {
  const { room, game, setError } = useUnoStore.getState();
  if (!room) return { ok: false, code: "ROOM_NOT_FOUND", message: "No UNO room" };
  const ack = await emitUno(event, {
    requestId: newUnoRequestId(),
    roomId: room.id,
    gameId: game?.gameId ?? room.gameId ?? undefined,
    payload,
  });
  if (!ack.ok) setError({ code: ack.code, message: ack.message });
  return ack;
}

export const unoActions = {
  joinSocket: (roomId: string) =>
    emitUno(UNO_CLIENT_EVENT.ROOM_JOIN, {
      requestId: newUnoRequestId(),
      roomId,
    }),
  leave: () => send(UNO_CLIENT_EVENT.ROOM_LEAVE),
  ready: () => send(UNO_CLIENT_EVENT.PLAYER_READY),
  unready: () => send(UNO_CLIENT_EVENT.PLAYER_UNREADY),
  start: () => send(UNO_CLIENT_EVENT.GAME_START),
  play: (cardId: string, chosenColor?: UnoColor) =>
    send(UNO_CLIENT_EVENT.CARD_PLAY, { cardId, chosenColor }),
  draw: () => send(UNO_CLIENT_EVENT.CARD_DRAW),
  pass: () => send(UNO_CLIENT_EVENT.TURN_PASS),
  chooseColor: (color: UnoColor) => send(UNO_CLIENT_EVENT.COLOR_SELECT, { color }),
  declareUno: () => send(UNO_CLIENT_EVENT.DECLARE),
  challengeWd4: () => send(UNO_CLIENT_EVENT.CHALLENGE, { kind: "WD4" }),
  rematch: () => send(UNO_CLIENT_EVENT.REMATCH_REQUEST),
};
