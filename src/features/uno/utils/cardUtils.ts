import type { CSSProperties } from "react";
import { UNO_COLOR_THEME } from "../constants/uno.constants";
import type { PublicCard, UnoColor } from "../types/card.types";
import type { PlayerGameView } from "../types/game.types";

export type UnoCardVariant = "hand" | "pile" | "opponent";

export function cardTheme(color: UnoColor | null) {
  if (!color) return null;
  return UNO_COLOR_THEME[color];
}

export function cardColorClass(color: UnoColor | null) {
  if (!color) return "bg-zinc-900 text-white";
  if (color === "RED") return "bg-[#C41E3A] text-white";
  if (color === "YELLOW") return "bg-[#F5A623] text-[#1A1204]";
  if (color === "GREEN") return "bg-[#1E8F52] text-white";
  return "bg-[#1D4ED8] text-white";
}

export function cardLabel(card: PublicCard) {
  if (card.type === "NUMBER") return String(card.value);
  if (card.value === "SKIP") return "Skip";
  if (card.value === "REVERSE") return "Rev";
  if (card.value === "DRAW_TWO") return "+2";
  if (card.value === "WILD_DRAW_FOUR") return "+4";
  return "Wild";
}

export function isWildCard(card: PublicCard) {
  return card.type === "WILD";
}

export function isPlayableCard(card: PublicCard, game: PlayerGameView): boolean {
  if (game.pendingDraw > 0) return false;
  if (card.type === "WILD") return true;
  if (game.currentColor && card.color === game.currentColor) return true;
  const top = game.topDiscard;
  if (top && card.value === top.value) return true;
  return false;
}

export function discardRotation(cardId: string) {
  let hash = 0;
  for (let i = 0; i < cardId.length; i += 1) {
    hash = (hash * 31 + cardId.charCodeAt(i)) | 0;
  }
  return (hash % 17) - 8;
}

export function cardFaceStyle(color: UnoColor | null): CSSProperties {
  const theme = cardTheme(color);
  if (!theme) {
    return {
      background: "radial-gradient(circle at 30% 20%, #2a2a32, #111118 70%)",
    };
  }
  return {
    background: `linear-gradient(160deg, ${theme.from} 0%, ${theme.to} 100%)`,
    color: theme.ink,
  };
}
