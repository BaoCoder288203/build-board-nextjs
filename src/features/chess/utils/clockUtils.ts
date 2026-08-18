import { CHESS_MVP } from "../constants/chess.constants";
import type { ChessClocks } from "../types/game.types";
import type { ChessColor } from "../types/player.types";
import type { ChessClockSyncMeta } from "../store/chessTypes";

export function defaultClocks(): ChessClocks {
  return {
    whiteTimeMs: CHESS_MVP.initialTimeMs,
    blackTimeMs: CHESS_MVP.initialTimeMs,
    runningColor: "WHITE",
    lastStartedAt: null,
  };
}

export function parseServerTime(serverTime?: string | number | null) {
  if (typeof serverTime === "number" && Number.isFinite(serverTime)) {
    return serverTime < 1e12 ? serverTime * 1000 : serverTime;
  }
  if (typeof serverTime === "string" && serverTime) {
    const parsed = Date.parse(serverTime);
    if (Number.isFinite(parsed)) return parsed;
  }
  return Date.now();
}

export function remainingMs(
  clocks: ChessClocks | null | undefined,
  color: ChessColor,
  sync: ChessClockSyncMeta | null,
) {
  if (!clocks) return CHESS_MVP.initialTimeMs;
  const base = color === "WHITE" ? clocks.whiteTimeMs : clocks.blackTimeMs;
  if (clocks.runningColor !== color) return Math.max(0, base);
  if (typeof document !== "undefined" && document.hidden) return Math.max(0, base);
  if (sync?.hidden) return Math.max(0, base);
  const elapsed = sync ? performance.now() - sync.receivedPerf : 0;
  return Math.max(0, base - elapsed);
}

export function formatChessClock(ms: number) {
  const clamped = Math.max(0, ms);
  if (clamped < CHESS_MVP.criticalTimeMs) {
    const tenths = Math.floor(clamped / 100) / 10;
    const whole = Math.floor(tenths);
    const frac = Math.round((tenths - whole) * 10);
    const m = Math.floor(whole / 60);
    const s = whole % 60;
    return `${m}:${s.toString().padStart(2, "0")}.${frac}`;
  }
  const total = Math.ceil(clamped / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
