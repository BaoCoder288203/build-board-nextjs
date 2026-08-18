"use client";

import { UserAvatar } from "@/components/ui/user-avatar";
import { capturedSets, materialDiffFor } from "../utils/captured";
import { ChessCaptured } from "./ChessCaptured";
import { ChessClock } from "./ChessClock";
import type { ChessColor, PublicChessPlayer } from "../types/player.types";

export function ChessPlayerBar({
  player,
  color,
  fen,
  you,
}: {
  player: PublicChessPlayer | null;
  color: ChessColor;
  fen: string;
  you?: boolean;
}) {
  const captured = capturedSets(fen);
  const pieces = color === "WHITE" ? captured.byWhite : captured.byBlack;
  const material = materialDiffFor(fen, color);
  const disconnected = player?.connectionStatus === "DISCONNECTED";

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border border-white/10 bg-white/8 px-3 py-2 ${
        disconnected ? "opacity-70" : ""
      }`}
    >
      <UserAvatar
        name={player?.displayName || (color === "WHITE" ? "White" : "Black")}
        avatarUrl={player?.avatarUrl}
        size="lg"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">
          {player?.displayName || (color === "WHITE" ? "White" : "Black")}
          {you ? " · You" : ""}
          {player?.isSpectator ? " · Spectator" : ""}
          {disconnected ? " · Reconnecting" : ""}
        </p>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-white/55">
          {color === "WHITE" ? "White" : "Black"}
        </p>
        <div data-chess-captured-tray={color}>
          <ChessCaptured pieces={pieces} material={material} />
        </div>
      </div>
      <ChessClock color={color} />
    </div>
  );
}
