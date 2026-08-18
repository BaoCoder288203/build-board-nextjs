"use client";

import { Button } from "@/components/ui/button";
import type { MeetingParticipant } from "@/lib/realtime/events";
import { CHESS_MVP } from "../constants/chess.constants";
import { chessActions } from "../hooks/useChessActions";
import type { PublicChessRoom } from "../types/game.types";
import { contestants, humanRoomStatus } from "../utils/playerUtils";

export function ChessLobby({
  room,
  isHost,
  meReady,
  participants,
  busy,
  onInvite,
}: {
  room: PublicChessRoom;
  isHost: boolean;
  meReady: boolean;
  participants: MeetingParticipant[];
  busy: boolean;
  onInvite: (userIds: string[]) => void;
}) {
  const visiblePlayers = room.players.filter(
    (p) => p.connectionStatus !== "LEFT" && p.connectionStatus !== "REMOVED",
  );
  const seated = contestants(room);
  const inRoom = new Set(visiblePlayers.map((p) => p.userId));
  const inviteable = participants.filter(
    (p) => p.leftAt == null && !inRoom.has(p.userId),
  );
  const canStart =
    isHost && room.status === "READY" && seated.length >= CHESS_MVP.minPlayers;

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 42%, rgba(8,12,28,0.72) 100%)",
        }}
      />
      <div className="relative z-10 mx-auto flex w-full max-w-md flex-col gap-4 p-5 text-white">
        <div>
          <p className="text-lg font-semibold tracking-wide">Chess Lobby</p>
          <p className="text-xs text-white/70">
            {seated.length}/{room.maxPlayers} players · {humanRoomStatus(room.status)}
          </p>
        </div>
        <ul className="space-y-2">
          {visiblePlayers.map((p) => (
            <li
              key={p.playerId}
              className="flex items-center justify-between rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm"
            >
              <span>
                {p.displayName}
                {p.isHost ? " · host" : ""}
                {p.color === "WHITE" ? " · White" : p.color === "BLACK" ? " · Black" : ""}
                {p.isSpectator ? " · spectator" : ""}
              </span>
              <span className="text-xs font-semibold uppercase text-white/70">
                {p.isReady ? "Ready" : humanRoomStatus(p.status)}
              </span>
            </li>
          ))}
        </ul>
        {isHost && inviteable.length > 0 ? (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/60">
              In this call
            </p>
            <div className="flex flex-wrap gap-2">
              {inviteable.map((p) => (
                <Button
                  key={p.userId}
                  type="button"
                  variant="onDarkGhost"
                  size="sm"
                  disabled={busy}
                  onClick={() => onInvite([p.userId])}
                >
                  Invite {p.fullName}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-white/60">
            {isHost
              ? "Everyone in the call is already in the lobby."
              : "Waiting for the Chess host to invite others."}
          </p>
        )}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="onDark"
            size="sm"
            disabled={busy}
            onClick={() => void (meReady ? chessActions.unready() : chessActions.ready())}
          >
            {meReady ? "Unready" : "Ready"}
          </Button>
          {isHost ? (
            <Button
              type="button"
              variant="onDarkGhost"
              size="sm"
              disabled={!canStart || busy}
              onClick={() => void chessActions.start()}
            >
              Start Game
            </Button>
          ) : (
            <p className="self-center text-xs text-white/60">
              Waiting for the Chess host to start.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
