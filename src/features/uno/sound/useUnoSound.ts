"use client";

import { useCallback, useEffect, useState } from "react";
import {
  isUnoSfxMuted,
  preloadUnoSfx,
  setUnoSfxMuted,
  stopUnoSfx,
} from "./unoSound";

export function useUnoSound() {
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    setMuted(isUnoSfxMuted());
    const unlock = () => preloadUnoSfx();
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      stopUnoSfx();
    };
  }, []);

  const toggleMute = useCallback(() => {
    const next = !isUnoSfxMuted();
    setUnoSfxMuted(next);
    setMuted(next);
    if (!next) preloadUnoSfx();
  }, []);

  return { muted, toggleMute };
}
