import { UNO_SERVER_EVENT } from "../constants/uno.constants";
import { emitUnoFx, clearUnoFx } from "../motion/unoFxBus";
import { useUnoStore } from "../store/unoStore";
import type { PublicCard } from "../types/card.types";
import type { PlayerGameView, PublicUnoRoom, UnoSnapshot } from "../types/game.types";
import type { UnoServerEvent } from "../types/socket.types";

function asEvent<T>(raw: unknown): UnoServerEvent<T> | null {
  if (!raw || typeof raw !== "object") return null;
  const event = raw as UnoServerEvent<T>;
  if (!event.type || event.payload === undefined) return null;
  return event;
}

export function handleUnoServerEvent(eventName: string, raw: unknown) {
  const store = useUnoStore.getState();

  if (eventName === UNO_SERVER_EVENT.ERROR) {
    const event = asEvent<{ code: string; message: string }>(raw);
    if (!event) return;
    store.setError({
      code: event.payload.code,
      message: event.payload.message,
    });
    emitUnoFx({ kind: "INVALID_ACTION", eventId: event.eventId });
    return;
  }

  if (eventName === UNO_SERVER_EVENT.ROOM_INVITE) {
    const event = asEvent<{ room: PublicUnoRoom; invitedBy: string }>(raw);
    if (!event?.payload.room) return;
    if (store.room?.id === event.payload.room.id) return;
    store.setPendingInvite({
      room: event.payload.room,
      invitedBy: event.payload.invitedBy,
    });
    return;
  }

  if (eventName === UNO_SERVER_EVENT.SNAPSHOT) {
    const event = asEvent<UnoSnapshot>(raw);
    const snapshot = event?.payload;
    if (!snapshot?.room) return;
    clearUnoFx();
    store.applySnapshot(snapshot);
    return;
  }

  if (
    eventName === UNO_SERVER_EVENT.ROOM_UPDATED ||
    eventName === UNO_SERVER_EVENT.PLAYER_JOINED ||
    eventName === UNO_SERVER_EVENT.PLAYER_LEFT
  ) {
    const event = asEvent<{ room: PublicUnoRoom }>(raw);
    if (event?.payload.room) store.applyRoom(event.payload.room);
    return;
  }

  if (eventName === UNO_SERVER_EVENT.GAME_STATE) {
    const event = asEvent<PlayerGameView>(raw);
    if (!event?.payload?.gameId) return;
    const hadGame = store.game;
    store.applyGame(event.payload, event.sequence ?? event.payload.sequence);
    const next = event.payload;
    const shouldDeal =
      next.status !== "FINISHED" &&
      next.status !== "ABORTED" &&
      (!hadGame ||
        hadGame.gameId !== next.gameId ||
        hadGame.roundNumber !== next.roundNumber);
    if (shouldDeal) {
      emitUnoFx({ kind: "DEAL", eventId: `${event.eventId}:deal` });
    }
    return;
  }

  if (eventName === UNO_SERVER_EVENT.GAME_STARTED) {
    const event = asEvent<{ gameId?: string }>(raw);
    if (store.room && event) {
      store.applyRoom({
        ...store.room,
        status: "PLAYING",
        gameId: event.payload.gameId ?? event.gameId ?? store.room.gameId,
      });
    }
    return;
  }

  if (eventName === UNO_SERVER_EVENT.CARD_PLAYED) {
    const event = asEvent<{
      playerId: string;
      card: PublicCard;
      pendingDraw: number;
    }>(raw);
    if (!event?.payload?.card) return;
    emitUnoFx({
      kind: "CARD_PLAYED",
      eventId: event.eventId,
      playerId: event.payload.playerId,
      card: event.payload.card,
      pendingDraw: event.payload.pendingDraw ?? 0,
    });
    return;
  }

  if (eventName === UNO_SERVER_EVENT.CARD_DRAWN) {
    const event = asEvent<{
      playerId: string;
      drawnCount: number;
      cards?: PublicCard[];
    }>(raw);
    if (!event?.payload?.playerId) return;
    const mePlayer = store.game?.players.find((p) => p.userId === store.myUserId);
    const isMe = event.payload.playerId === mePlayer?.playerId;
    if (isMe && !event.payload.cards) return;
    emitUnoFx({
      kind: "CARD_DRAWN",
      eventId: `draw:${event.payload.playerId}:${event.sequence ?? "x"}`,
      playerId: event.payload.playerId,
      drawnCount: event.payload.drawnCount ?? 1,
      cards: event.payload.cards,
    });
    return;
  }

  if (eventName === UNO_SERVER_EVENT.TURN_CHANGED) {
    const event = asEvent<{ currentPlayerId: string | null }>(raw);
    if (!event) return;
    emitUnoFx({
      kind: "TURN_CHANGED",
      eventId: event.eventId,
      currentPlayerId: event.payload.currentPlayerId ?? null,
    });
    return;
  }

  if (eventName === UNO_SERVER_EVENT.DECLARED) {
    const event = asEvent<{ playerId: string }>(raw);
    if (!event?.payload?.playerId) return;
    emitUnoFx({
      kind: "UNO_CALLED",
      eventId: event.eventId,
      playerId: event.payload.playerId,
    });
    return;
  }

  if (eventName === UNO_SERVER_EVENT.GAME_ENDED) {
    const event = asEvent<{ winnerId?: string }>(raw);
    if (!event) return;
    emitUnoFx({
      kind: "GAME_ENDED",
      eventId: event.eventId,
      winnerId: event.payload.winnerId,
    });
  }
}
