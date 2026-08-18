"use client";

import { useEffect } from "react";
import { rejoinChessRoom } from "../socket/ChessReconnectManager";
import { useChessStore } from "../store/chessStore";

export function useChessReconnect(enabled: boolean) {
  const roomId = useChessStore((s) => s.room?.id ?? null);

  useEffect(() => {
    if (!enabled || !roomId) return;
    void rejoinChessRoom();
  }, [enabled, roomId]);
}
