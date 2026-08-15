"use client";

import { useState } from "react";
import type { PublicCard } from "../types/card.types";
import { isPlayableCard } from "../utils/cardUtils";
import type { PlayerGameView } from "../types/game.types";
import { fanTransform } from "../utils/seatLayout";
import { handAnchorId, UNO_ANCHOR } from "../motion/unoAnchors";
import { useFxHiddenCards } from "../motion/useFxHiddenCards";
import { useUnoAnchor } from "../motion/useUnoAnchor";
import { UnoCard } from "./UnoCard";

export function PlayerHand({
  game,
  myTurn,
  onPlay,
}: {
  game: PlayerGameView;
  myTurn: boolean;
  onPlay: (cardId: string) => void;
}) {
  const onlyDrawn =
    Boolean(game.lastDrawnCardId) &&
    game.currentPlayerId &&
    myTurn &&
    game.pendingDraw === 0;
  const [pendingId, setPendingId] = useState<string | null>(null);
  const isHidden = useFxHiddenCards();
  const setHandAnchor = useUnoAnchor<HTMLDivElement>(UNO_ANCHOR.hand);
  const count = game.myHand.length;

  return (
    <div
      ref={setHandAnchor}
      data-uno-hand
      className="relative flex h-[8.75rem] w-full items-end justify-center px-2 pb-1"
    >
      {game.myHand.map((card: PublicCard, index: number) => {
        const playable = myTurn && isPlayableCard(card, game);
        const lockedOut = onlyDrawn && card.cardId !== game.lastDrawnCardId;
        const canPlay = playable && !lockedOut;
        const hidden = isHidden(card.cardId);
        return (
          <div
            key={card.cardId}
            className="absolute bottom-1 origin-bottom transition-transform duration-200 ease-out"
            style={{
              transform: fanTransform(index, count),
              zIndex: index + 1,
              opacity: hidden ? 0 : 1,
            }}
          >
            <UnoCard
              card={card}
              index={index}
              variant="hand"
              playable={canPlay}
              lifted={pendingId === card.cardId}
              anchorId={handAnchorId(card.cardId)}
              onClick={
                canPlay
                  ? () => {
                      setPendingId(card.cardId);
                      onPlay(card.cardId);
                    }
                  : undefined
              }
            />
          </div>
        );
      })}
    </div>
  );
}
