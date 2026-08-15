import type { PublicCard } from "../types/card.types";

export type UnoFxEvent =
  | {
      kind: "CARD_PLAYED";
      eventId: string;
      playerId: string;
      card: PublicCard;
      pendingDraw: number;
    }
  | {
      kind: "CARD_DRAWN";
      eventId: string;
      playerId: string;
      drawnCount: number;
      cards?: PublicCard[];
    }
  | {
      kind: "DEAL";
      eventId: string;
    }
  | {
      kind: "TURN_CHANGED";
      eventId: string;
      currentPlayerId: string | null;
    }
  | {
      kind: "UNO_CALLED";
      eventId: string;
      playerId: string;
    }
  | {
      kind: "GAME_ENDED";
      eventId: string;
      winnerId?: string;
    }
  | {
      kind: "INVALID_ACTION";
      eventId: string;
    }
  | {
      kind: "COLOR_SELECTED";
      eventId: string;
      color: string;
    };

type Listener = (event: UnoFxEvent) => void;

const listeners = new Set<Listener>();
const seen = new Set<string>();
const queued: UnoFxEvent[] = [];
const hiddenCards = new Set<string>();
const hiddenListeners = new Set<() => void>();

function remember(eventId: string) {
  if (!eventId) return true;
  if (seen.has(eventId)) return false;
  seen.add(eventId);
  if (seen.size > 240) {
    const first = seen.values().next().value;
    if (first) seen.delete(first);
  }
  return true;
}

export function emitUnoFx(event: UnoFxEvent) {
  if (!remember(event.eventId)) return;
  if (listeners.size === 0) {
    queued.push(event);
    return;
  }
  listeners.forEach((fn) => {
    try {
      fn(event);
    } catch {
      // FX must never break gameplay.
    }
  });
}

export function onUnoFx(listener: Listener) {
  listeners.add(listener);
  if (queued.length > 0) {
    const pending = queued.splice(0);
    pending.forEach((event) => {
      try {
        listener(event);
      } catch {
        /* ignore */
      }
    });
  }
  return () => {
    listeners.delete(listener);
  };
}

export function hideCardsForFx(ids: string[]) {
  ids.forEach((id) => hiddenCards.add(id));
  hiddenListeners.forEach((fn) => fn());
}

export function revealCardsForFx(ids: string[]) {
  ids.forEach((id) => hiddenCards.delete(id));
  hiddenListeners.forEach((fn) => fn());
}

export function isCardFxHidden(cardId: string) {
  return hiddenCards.has(cardId);
}

export function onHiddenCardsChange(listener: () => void) {
  hiddenListeners.add(listener);
  return () => {
    hiddenListeners.delete(listener);
  };
}

export function clearUnoFx() {
  seen.clear();
  queued.length = 0;
  hiddenCards.clear();
  hiddenListeners.forEach((fn) => fn());
}
