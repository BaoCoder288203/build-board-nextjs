"use client";

import { useEffect } from "react";
import { connectRealtime } from "@/lib/realtime/socket-client";
import { CHESS_SERVER_EVENT } from "../socket/chessEvents";
import { onChess } from "../socket/ChessSocketClient";
import { handleChessServerEvent } from "../socket/ChessEventHandler";
import { bindChessReconnect } from "../socket/ChessReconnectManager";
import { useChessStore } from "../store/chessStore";

const LISTENED = Object.values(CHESS_SERVER_EVENT);

export function useChessConnection(userId: string | null) {
  const setMyUserId = useChessStore((s) => s.setMyUserId);

  useEffect(() => {
    setMyUserId(userId);
  }, [setMyUserId, userId]);

  useEffect(() => {
    connectRealtime();
    const unbind = LISTENED.map((event) =>
      onChess(event, (raw) => handleChessServerEvent(event, raw)),
    );
    const unbindReconnect = bindChessReconnect();
    return () => {
      unbind.forEach((off) => off());
      unbindReconnect();
    };
  }, []);
}
