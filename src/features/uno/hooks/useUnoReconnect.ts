"use client";

import { useEffect } from "react";
import { rejoinUnoRoom } from "../socket/UnoReconnectManager";
import { useUnoStore } from "../store/unoStore";

export function useUnoReconnect(enabled: boolean) {
  const roomId = useUnoStore((s) => s.room?.id ?? null);

  useEffect(() => {
    if (!enabled || !roomId) return;
    void rejoinUnoRoom();
  }, [enabled, roomId]);
}
