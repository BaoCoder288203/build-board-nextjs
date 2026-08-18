export type ChessClientRequest<T = unknown> = {
  requestId: string;
  roomId: string;
  gameId?: string;
  payload?: T;
};

export type ChessServerEvent<T = unknown> = {
  eventId: string;
  roomId: string;
  gameId?: string;
  sequence?: number;
  type: string;
  payload: T;
  occurredAt: string;
};

export type ChessAck =
  | { ok: true; sequence?: number }
  | { ok: false; code: string; message: string; requestId?: string; sequence?: number };
