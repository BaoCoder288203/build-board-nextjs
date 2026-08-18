import { connectRealtime, getRealtimeSocket } from "@/lib/realtime/socket-client";
import type { ChessAck, ChessClientRequest } from "../types/socket.types";

export function newChessRequestId() {
  return crypto.randomUUID();
}

export function emitChess<T>(
  event: string,
  body: ChessClientRequest<T>,
): Promise<ChessAck> {
  const socket = connectRealtime();
  return new Promise((resolve) => {
    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve({
        ok: false,
        code: "TIMEOUT",
        message: "Chess request timed out",
        requestId: body.requestId,
      });
    }, 8_000);
    socket.emit(event, body, (ack: ChessAck) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(ack ?? { ok: true });
    });
  });
}

export function onChess(event: string, handler: (...args: unknown[]) => void) {
  const socket = getRealtimeSocket();
  socket.on(event, handler);
  return () => {
    socket.off(event, handler);
  };
}
