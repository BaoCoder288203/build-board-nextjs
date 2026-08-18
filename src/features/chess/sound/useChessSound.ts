"use client";

import { useCallback, useEffect, useState } from "react";
import {
  isChessSfxMuted,
  preloadChessSfx,
  setChessSfxMuted,
  stopChessSfx,
} from "./chessSound";

export function useChessSound() {
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    setMuted(isChessSfxMuted());
    const unlock = () => preloadChessSfx();
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      stopChessSfx();
    };
  }, []);

  const toggleMute = useCallback(() => {
    const next = !isChessSfxMuted();
    setChessSfxMuted(next);
    setMuted(next);
    if (!next) preloadChessSfx();
  }, []);

  return { muted, toggleMute };
}
