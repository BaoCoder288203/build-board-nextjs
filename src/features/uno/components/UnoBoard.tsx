"use client";

import { useEffect, useRef, useState } from "react";
import { UNO_TABLE } from "../constants/uno.constants";
import { UnoFxOverlay } from "../motion/UnoFxOverlay";
import { UNO_ANCHOR } from "../motion/unoAnchors";
import { useUnoAnchor } from "../motion/useUnoAnchor";
import type { UnoColor } from "../types/card.types";
import type { PlayerGameView, PublicUnoRoom } from "../types/game.types";
import { isWildCard } from "../utils/cardUtils";
import { ColorPicker } from "./ColorPicker";
import { DiscardPile } from "./DiscardPile";
import { DrawPile } from "./DrawPile";
import { OpponentArea } from "./OpponentArea";
import { PlayerHand } from "./PlayerHand";
import { Scoreboard } from "./Scoreboard";
import { UnoButton } from "./UnoButton";

function useDeadline(deadline: string | null) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!deadline) {
      setLeft(null);
      return;
    }
    const tick = () => {
      const ms = new Date(deadline).getTime() - Date.now();
      setLeft(Math.max(0, Math.ceil(ms / 1000)));
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [deadline]);
  return left;
}

export function UnoBoard({
  room,
  game,
  myPlayerId,
  myUserId,
  showPass,
  onPlay,
  onDraw,
  onPass,
  onChooseColor,
  onDeclare,
  onChallenge,
}: {
  room: PublicUnoRoom;
  game: PlayerGameView;
  myPlayerId: string | null;
  myUserId: string | null;
  showPass: boolean;
  onPlay: (cardId: string, color?: UnoColor) => void;
  onDraw: () => void;
  onPass: () => void;
  onChooseColor: (color: UnoColor) => void;
  onDeclare: () => void;
  onChallenge: () => void;
}) {
  const [pendingWild, setPendingWild] = useState<string | null>(null);
  const shakeRef = useRef<HTMLDivElement>(null);
  const setBoardAnchor = useUnoAnchor<HTMLDivElement>(UNO_ANCHOR.board);
  const myTurn = game.currentPlayerId === myPlayerId;
  const choosingColor =
    game.status === "WAITING_FOR_COLOR" &&
    game.colorChooserPlayerId === myPlayerId;
  const canChallenge =
    game.status === "WAITING_FOR_CHALLENGE" &&
    game.challenge?.accusedPlayerId !== myPlayerId;
  const showUno =
    Boolean(myPlayerId) &&
    (game.myHand.length <= 2 || game.unoWindow?.targetPlayerId === myPlayerId);
  const urgentUno =
    game.myHand.length === 1 || game.unoWindow?.targetPlayerId === myPlayerId;
  const currentName =
    room.players.find((p) => p.playerId === game.currentPlayerId)?.displayName ??
    "opponent";
  const remaining = useDeadline(game.turnDeadlineAt);
  const timerCritical = remaining != null && remaining <= 3;

  return (
    <div
      ref={setBoardAnchor}
      className="relative h-full min-h-0 overflow-hidden"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 72% 58% at 50% 46%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.48) 100%),
            repeating-radial-gradient(circle at 18% 22%, rgba(255,255,255,0.025) 0 1px, transparent 2px 5px),
            linear-gradient(165deg, ${UNO_TABLE.from} 0%, ${UNO_TABLE.to} 100%)
          `,
        }}
      />
      <div
        className="pointer-events-none absolute left-1/2 top-[44%] h-[56%] w-[76%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-white/10 bg-white/[0.04]"
        aria-hidden
      />

      <div ref={shakeRef} className="absolute inset-0 overflow-hidden">
        <div className="absolute right-2 top-2 z-10">
          <Scoreboard room={room} game={game} />
        </div>

        <OpponentArea room={room} game={game} myUserId={myUserId} />

        <div className="absolute left-1/2 top-[44%] z-[6] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2">
          <div className="flex items-center gap-8">
            <DrawPile
              count={game.drawCount}
              pendingDraw={game.pendingDraw}
              disabled={!myTurn || game.status !== "PLAYING"}
              onDraw={onDraw}
            />
            <DiscardPile card={game.topDiscard} currentColor={game.currentColor} />
          </div>
          <p
            className={`text-xs font-bold ${
              myTurn ? "text-[#FFC93C]" : "text-white/70"
            } ${timerCritical ? "animate-pulse motion-reduce:animate-none" : ""}`}
          >
            {myTurn ? "Your turn" : `Waiting for ${currentName}`}
            {game.pendingDraw > 0 ? ` · draw ${game.pendingDraw}` : ""}
            {remaining != null
              ? ` · ${remaining}s`
              : ""}
          </p>
        </div>

        <div className="absolute bottom-2 left-3 z-10 flex flex-col items-center gap-2">
          <UnoButton visible={showUno} urgent={urgentUno} onClick={onDeclare} />
          {showPass ? (
            <button
              type="button"
              onClick={onPass}
              className="rounded-full border border-white/30 px-4 py-1.5 text-xs font-semibold text-white"
            >
              Pass
            </button>
          ) : null}
          {canChallenge ? (
            <button
              type="button"
              onClick={onChallenge}
              className="rounded-full bg-[#FFC93C] px-4 py-1.5 text-xs font-black text-[#0F1B3C]"
            >
              Challenge +4
            </button>
          ) : null}
        </div>

        <div className="absolute inset-x-0 bottom-0 z-[8]">
          <PlayerHand
            game={game}
            myTurn={myTurn && game.status === "PLAYING"}
            onPlay={(cardId) => {
              const card = game.myHand.find((c) => c.cardId === cardId);
              if (card && isWildCard(card)) {
                setPendingWild(cardId);
                return;
              }
              onPlay(cardId);
            }}
          />
        </div>
      </div>

      <ColorPicker
        open={choosingColor || Boolean(pendingWild)}
        onSelect={(color) => {
          if (pendingWild) {
            onPlay(pendingWild, color);
            setPendingWild(null);
            return;
          }
          onChooseColor(color);
        }}
      />

      <UnoFxOverlay
        myPlayerId={myPlayerId}
        myUserId={myUserId}
        shakeRef={shakeRef}
      />
    </div>
  );
}
