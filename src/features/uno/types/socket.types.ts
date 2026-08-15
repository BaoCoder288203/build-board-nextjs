export type UnoClientRequest<T = unknown> = {
  requestId: string;
  roomId: string;
  gameId?: string;
  payload?: T;
};

export type UnoServerEvent<T = unknown> = {
  eventId: string;
  roomId: string;
  gameId?: string;
  sequence?: number;
  type: string;
  payload: T;
  occurredAt: string;
};

export type UnoAck =
  | { ok: true; sequence?: number }
  | { ok: false; code: string; message: string; requestId?: string };
