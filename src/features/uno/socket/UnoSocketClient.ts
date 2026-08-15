import { connectRealtime, getRealtimeSocket } from "@/lib/realtime/socket-client";
import type { UnoAck, UnoClientRequest } from "../types/socket.types";

export function newUnoRequestId() {
  return crypto.randomUUID();
}

export function emitUno<T>(
  event: string,
  body: UnoClientRequest<T>,
): Promise<UnoAck> {
  const socket = connectRealtime();
  return new Promise((resolve) => {
    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve({
        ok: false,
        code: "TIMEOUT",
        message: "UNO request timed out",
        requestId: body.requestId,
      });
    }, 8_000);
    socket.emit(event, body, (ack: UnoAck) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(ack ?? { ok: true });
    });
  });
}

export function onUno(event: string, handler: (...args: unknown[]) => void) {
  const socket = getRealtimeSocket();
  socket.on(event, handler);
  return () => {
    socket.off(event, handler);
  };
}
