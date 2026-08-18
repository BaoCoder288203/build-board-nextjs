"use client";

import { useEffect, useState } from "react";
import { CHESS_MVP } from "../constants/chess.constants";
import { useChessStore } from "../store/chessStore";
import type { ChessColor } from "../types/player.types";
import { formatChessClock, remainingMs } from "../utils/clockUtils";

export function useChessClock(color: ChessColor) {
  const clocks = useChessStore((s) => s.game?.clocks);
  const sync = useChessStore((s) => s.clockSync);
  const running = clocks?.runningColor === color;
  const [ms, setMs] = useState(() => remainingMs(clocks, color, sync));

  useEffect(() => {
    const tick = () => setMs(remainingMs(clocks, color, sync));
    tick();
    if (!running) return;
    const onVis = () => tick();
    document.addEventListener("visibilitychange", onVis);
    const id = window.setInterval(tick, 100);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [clocks, color, running, sync]);

  return {
    ms,
    label: formatChessClock(ms),
    running,
    warning: ms > 0 && ms < CHESS_MVP.lowTimeMs,
    critical: ms > 0 && ms < CHESS_MVP.criticalTimeMs,
  };
}
