"use client";

import type { PublicCard, UnoColor } from "../types/card.types";
import { discardRotation } from "../utils/cardUtils";
import { UNO_ANCHOR } from "../motion/unoAnchors";
import { useUnoAnchor } from "../motion/useUnoAnchor";
import { chosenColorDot, UnoCard } from "./UnoCard";

export function DiscardPile({
  card,
  currentColor,
}: {
  card: PublicCard | null;
  currentColor: UnoColor | null;
}) {
  const setAnchor = useUnoAnchor<HTMLDivElement>(UNO_ANCHOR.discard);

  if (!card) {
    return (
      <div
        ref={setAnchor}
        className="flex h-[7.15rem] w-[4.75rem] items-center justify-center rounded-[1.15rem] border-2 border-dashed border-white/30 text-xs text-white/60"
      >
        Discard
      </div>
    );
  }

  return (
    <div ref={setAnchor} className="relative">
      <div style={{ transform: `rotate(${discardRotation(card.cardId)}deg)` }}>
        <UnoCard card={card} variant="pile" />
      </div>
      <span
        className={`absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border border-white ${chosenColorDot(currentColor)}`}
        title={currentColor ?? undefined}
      />
    </div>
  );
}
