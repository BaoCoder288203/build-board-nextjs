"use client";

import { useEffect, useRef } from "react";
import { UNO_CARD_SIZE, UNO_WILD_GOLD } from "../constants/uno.constants";
import { setUnoAnchor } from "../motion/unoAnchors";
import type { PublicCard, UnoColor } from "../types/card.types";
import {
  cardColorClass,
  cardFaceStyle,
  cardLabel,
  cardTheme,
  isWildCard,
  type UnoCardVariant,
} from "../utils/cardUtils";
import { CardGlyph } from "./UnoCardIcons";
import { UnoCardBack } from "./UnoCardBack";

export function chosenColorDot(color: UnoColor | null) {
  if (!color) return "bg-white/40";
  return cardColorClass(color).split(" ")[0];
}

export function UnoCard({
  card,
  playable,
  selected,
  onClick,
  faceUp = true,
  index = 0,
  variant = "hand",
  lifted = false,
  className = "",
  anchorId,
}: {
  card: PublicCard;
  playable?: boolean;
  selected?: boolean;
  onClick?: () => void;
  faceUp?: boolean;
  index?: number;
  variant?: UnoCardVariant;
  lifted?: boolean;
  className?: string;
  anchorId?: string;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const wild = isWildCard(card);
  const theme = cardTheme(card.color);
  const clickable = Boolean(onClick);
  const dimmed = variant === "hand" && !clickable;

  const bindRef = (el: HTMLElement | null) => {
    ref.current = el;
    if (anchorId) setUnoAnchor(anchorId, el);
  };

  useEffect(() => {
    if (!anchorId) return;
    setUnoAnchor(anchorId, ref.current);
    return () => setUnoAnchor(anchorId, null);
  }, [anchorId]);

  if (!faceUp) {
    return (
      <UnoCardBack variant={variant} className={className} anchorId={anchorId} />
    );
  }

  const size = UNO_CARD_SIZE[variant];
  const hoverable = clickable && variant === "hand";
  const shell = `relative shrink-0 overflow-hidden rounded-[1.15rem] border-[3px] shadow-[0_8px_18px_rgba(0,0,0,0.35)] transition-[transform,opacity] duration-200 ease-out ${size} ${
    wild ? "border-[#E8C547]" : "border-white/25"
  } ${playable ? "z-[2] -translate-y-1.5" : ""} ${
    selected ? "ring-2 ring-amber-300" : ""
  } ${
    hoverable
      ? "origin-bottom cursor-pointer hover:-translate-y-2 hover:scale-[1.07] active:scale-[0.97]"
      : "cursor-default"
  } ${dimmed ? "opacity-60" : "opacity-100"} ${
    lifted ? "-translate-y-2 scale-105 opacity-90" : ""
  } ${className}`;
  const faceStyle = {
    ...cardFaceStyle(wild ? null : card.color),
    boxShadow: wild
      ? `0 0 0 2px ${UNO_WILD_GOLD}, 0 8px 18px rgba(0,0,0,0.4)`
      : undefined,
  };

  const inner = (
    <>
      <div
        className="pointer-events-none absolute inset-[7%] rounded-[50%] border-[2.5px] border-white"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-[12%] flex items-center justify-center rounded-[50%] border-[2px] border-white bg-white"
        aria-hidden
      >
        {wild ? (
          <div
            className="h-[78%] w-[62%] rounded-[50%]"
            style={{
              background:
                "conic-gradient(#E8394B 0 90deg, #FFC93C 90deg 180deg, #3CB878 180deg 270deg, #3B82F6 270deg 360deg)",
            }}
          />
        ) : null}
      </div>
      <span className="absolute left-[7%] top-[6%] z-[1] text-white">
        <CardGlyph card={card} className="h-3.5 w-3.5 text-[0.72rem]" />
      </span>
      <span className="absolute bottom-[6%] right-[7%] z-[1] rotate-180 text-white">
        <CardGlyph card={card} className="h-3.5 w-3.5 text-[0.72rem]" />
      </span>
      {wild && card.value === "WILD" ? null : (
        <span
          className="relative z-[1] flex h-full items-center justify-center text-[1.85rem] font-black leading-none"
          style={{
            transform: "rotate(-15deg)",
            color: wild ? "#111118" : theme?.ink ?? "#fff",
          }}
        >
          <CardGlyph
            card={card}
            className={
              card.type === "NUMBER" ? "text-[1.85rem]" : "h-9 w-9 text-[1.6rem]"
            }
          />
        </span>
      )}
    </>
  );

  if (variant === "hand") {
    return (
      <button
        ref={bindRef}
        type="button"
        disabled={!clickable}
        onClick={onClick}
        aria-label={`${card.color ?? "wild"} ${cardLabel(card)}`}
        data-card-index={index}
        className={shell}
        style={faceStyle}
      >
        {inner}
      </button>
    );
  }

  return (
    <div
      ref={bindRef}
      aria-label={`${card.color ?? "wild"} ${cardLabel(card)}`}
      data-card-index={index}
      className={`${shell} pointer-events-none`}
      style={faceStyle}
    >
      {inner}
    </div>
  );
}
