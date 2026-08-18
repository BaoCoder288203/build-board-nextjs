import { connectRealtime, getRealtimeSocket } from "@/lib/realtime/socket-client";
import { fetchChessSnapshot } from "../services/chessApi";
import { useChessStore } from "../store/chessStore";
import { CHESS_CLIENT_EVENT } from "./chessEvents";
import { emitChess, newChessRequestId } from "./ChessSocketClient";

export async function requestChessSnapshot(roomId: string) {
  const socket = connectRealtime();
  if (socket.connected) {
    await emitChess(CHESS_CLIENT_EVENT.SNAPSHOT_REQUEST, {
      requestId: newChessRequestId(),
      roomId,
    });
  }
  try {
    const snapshot = await fetchChessSnapshot(roomId);
    useChessStore.getState().applySnapshot(snapshot);
  } catch {
    // Socket snapshot may still arrive.
  }
}

export async function rejoinChessRoom() {
  const { room } = useChessStore.getState();
  if (!room) return;
  await emitChess(CHESS_CLIENT_EVENT.ROOM_JOIN, {
    requestId: newChessRequestId(),
    roomId: room.id,
  });
  await requestChessSnapshot(room.id);
}

export function bindChessReconnect() {
  const socket = getRealtimeSocket();
  const onConnect = () => {
    void rejoinChessRoom();
  };
  socket.on("connect", onConnect);
  return () => {
    socket.off("connect", onConnect);
  };
}
