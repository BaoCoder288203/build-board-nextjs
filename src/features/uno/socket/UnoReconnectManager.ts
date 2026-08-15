import { connectRealtime, getRealtimeSocket } from "@/lib/realtime/socket-client";
import { UNO_CLIENT_EVENT } from "../constants/uno.constants";
import { emitUno, newUnoRequestId } from "./UnoSocketClient";
import { useUnoStore } from "../store/unoStore";
import { fetchUnoSnapshot } from "../services/unoApi";

export async function requestUnoSnapshot(roomId: string) {
  const socket = connectRealtime();
  if (socket.connected) {
    await emitUno(UNO_CLIENT_EVENT.SNAPSHOT_REQUEST, {
      requestId: newUnoRequestId(),
      roomId,
    });
  }
  try {
    const snapshot = await fetchUnoSnapshot(roomId);
    useUnoStore.getState().applySnapshot(snapshot);
  } catch {
    // Socket snapshot may still arrive.
  }
}

export async function rejoinUnoRoom() {
  const { room } = useUnoStore.getState();
  if (!room) return;
  await emitUno(UNO_CLIENT_EVENT.ROOM_JOIN, {
    requestId: newUnoRequestId(),
    roomId: room.id,
  });
  await requestUnoSnapshot(room.id);
}

export function bindUnoReconnect() {
  const socket = getRealtimeSocket();
  const onConnect = () => {
    void rejoinUnoRoom();
  };
  socket.on("connect", onConnect);
  return () => {
    socket.off("connect", onConnect);
  };
}
