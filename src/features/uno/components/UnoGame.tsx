"use client";

import dynamic from "next/dynamic";
import type { MeetingParticipant } from "@/lib/realtime/events";
import { UNO_MVP, UNO_TABLE } from "../constants/uno.constants";
import type { PublicUnoRoom } from "../types/game.types";
import { contestants, isUnoHost, myUnoPlayer } from "../utils/playerUtils";
import { roomPhase, shouldShowPass } from "../utils/gameUtils";
import { GameResult } from "./GameResult";
import { UnoBoard } from "./UnoBoard";
import { unoActions } from "../hooks/useUnoActions";
import { useUnoStore } from "../store/unoStore";
import { useUnoSound } from "../sound/useUnoSound";
import { unoFont } from "../unoFont";
import { playUnoLobbyBurst } from "../scene/unoLobbyFx";

const UnoLobbyScene = dynamic(
  () => import("../scene/UnoLobbyScene").then((m) => m.UnoLobbyScene),
  { ssr: false },
);

function Lobby({
  room,
  isHost,
  meReady,
  participants,
  busy,
  onInvite,
}: {
  room: PublicUnoRoom;
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
    isHost &&
    room.status === "READY" &&
    seated.length >= UNO_MVP.minPlayers;

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <UnoLobbyScene />
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 42%, rgba(8,12,28,0.72) 100%)",
        }}
      />
      <div className="relative z-10 mx-auto flex w-full max-w-md flex-col gap-4 p-5 text-white">
      <div>
        <p className="text-lg font-black tracking-wide">UNO lobby</p>
        <p className="text-xs text-white/70">
          {seated.length}/{room.maxPlayers} players · {room.status}
        </p>
      </div>
      <ul className="space-y-2">
        {visiblePlayers.map((p) => (
          <li
            key={p.playerId}
            className="flex items-center justify-between rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm backdrop-blur-[2px]"
          >
            <span>
              {p.displayName}
              {p.isHost ? " · host" : ""}
              {p.isSpectator ? " · spectator" : ""}
            </span>
            <span className="text-xs uppercase text-white/70">
              {p.isReady ? "ready" : p.status.toLowerCase()}
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
              <button
                key={p.userId}
                type="button"
                disabled={busy}
                onClick={() => onInvite([p.userId])}
                className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold hover:bg-white/25 disabled:opacity-50"
              >
                Invite {p.fullName}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-white/60">
          {isHost
            ? "Everyone in the call is already in the lobby."
            : "Waiting for the UNO host to invite others."}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            playUnoLobbyBurst(meReady ? "#93C5FD" : "#34D399");
            void (meReady ? unoActions.unready() : unoActions.ready());
          }}
          className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-[#0F1B3C]"
        >
          {meReady ? "Unready" : "Ready"}
        </button>
        {isHost ? (
          <button
            type="button"
            disabled={!canStart || busy}
            onClick={() => {
              playUnoLobbyBurst("#FDE68A", 0, 0.05);
              void unoActions.start();
            }}
            className="rounded-md bg-[#3B82F6] px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            Start game
          </button>
        ) : (
          <p className="self-center text-xs text-white/60">Waiting for the UNO host to start.</p>
        )}
      </div>
      </div>
    </div>
  );
}

export function UnoGame({
  meId,
  participants,
  onLeaveGame,
  onInvite,
  busy,
}: {
  meId: string | null;
  participants: MeetingParticipant[];
  onLeaveGame: () => void;
  onInvite: (userIds: string[]) => void;
  busy: boolean;
}) {
  const room = useUnoStore((s) => s.room);
  const game = useUnoStore((s) => s.game);
  const lastError = useUnoStore((s) => s.lastError);
  const { muted, toggleMute } = useUnoSound();
  if (!room) return null;

  const me = myUnoPlayer(room, meId);
  const host = isUnoHost(room, meId);
  const phase = roomPhase(room, game);

  return (
    <div
      className={`${unoFont.className} flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-white/10 text-white`}
      style={{
        background: `linear-gradient(165deg, ${UNO_TABLE.from}, ${UNO_TABLE.to})`,
      }}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <p className="text-sm font-black tracking-wide">UNO</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleMute}
            className="rounded-md border border-white/20 px-2.5 py-1 text-xs font-semibold hover:bg-white/10"
            aria-label={muted ? "Unmute game sound" : "Mute game sound"}
          >
            {muted ? "SFX off" : "SFX on"}
          </button>
          <button
            type="button"
            onClick={onLeaveGame}
            className="rounded-md border border-white/20 px-2.5 py-1 text-xs font-semibold hover:bg-white/10"
          >
            Leave game
          </button>
        </div>
      </div>
      {lastError ? (
        <p className="px-3 py-1 text-xs text-amber-200">{lastError.message}</p>
      ) : null}
      <div
        className={`min-h-0 flex-1 ${
          phase === "playing" ? "overflow-hidden" : "overflow-auto"
        }`}
      >
        {phase === "result" ? (
          <div className="flex h-full items-center justify-center p-4">
            <GameResult
              room={room}
              game={game}
              isHost={host}
              myUserId={meId}
              onRematch={() => void unoActions.rematch()}
              onLeaveGame={onLeaveGame}
            />
          </div>
        ) : phase === "playing" && game ? (
          <UnoBoard
            room={room}
            game={game}
            myPlayerId={me?.playerId ?? null}
            myUserId={meId}
            showPass={shouldShowPass(game, me?.playerId ?? null)}
            onPlay={(cardId, color) => void unoActions.play(cardId, color)}
            onDraw={() => void unoActions.draw()}
            onPass={() => void unoActions.pass()}
            onChooseColor={(color) => void unoActions.chooseColor(color)}
            onDeclare={() => void unoActions.declareUno()}
            onChallenge={() => void unoActions.challengeWd4()}
          />
        ) : (
          <Lobby
            room={room}
            isHost={host}
            meReady={Boolean(me?.isReady)}
            participants={participants}
            busy={busy}
            onInvite={onInvite}
          />
        )}
      </div>
    </div>
  );
}
