"use client";

import { useEffect } from "react";
import { connectRealtime } from "@/lib/realtime/socket-client";
import { UNO_SERVER_EVENT } from "../constants/uno.constants";
import { onUno } from "../socket/UnoSocketClient";
import { handleUnoServerEvent } from "../socket/UnoEventHandler";
import { bindUnoReconnect } from "../socket/UnoReconnectManager";
import { useUnoStore } from "../store/unoStore";

const LISTENED = Object.values(UNO_SERVER_EVENT);

export function useUnoConnection(userId: string | null) {
  const setMyUserId = useUnoStore((s) => s.setMyUserId);

  useEffect(() => {
    setMyUserId(userId);
  }, [setMyUserId, userId]);

  useEffect(() => {
    connectRealtime();
    const unbind = LISTENED.map((event) =>
      onUno(event, (raw) => handleUnoServerEvent(event, raw)),
    );
    const unbindReconnect = bindUnoReconnect();
    return () => {
      unbind.forEach((off) => off());
      unbindReconnect();
    };
  }, []);
}
