"use client";

import { useEffect, useRef } from "react";
import { UNO_CARD_SIZE } from "../constants/uno.constants";
import { setUnoAnchor } from "../motion/unoAnchors";
import type { UnoCardVariant } from "../utils/cardUtils";

export function UnoCardBack({
  count,
  variant = "opponent",
  className = "",
  anchorId,
  stacked = 0,
}: {
  count?: number;
  variant?: UnoCardVariant;
  className?: string;
  anchorId?: string;
  stacked?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const size = UNO_CARD_SIZE[variant];

  useEffect(() => {
    if (!anchorId) return;
    setUnoAnchor(anchorId, ref.current);
    return () => setUnoAnchor(anchorId, null);
  }, [anchorId]);

  return (
    <div
      ref={ref}
      className={`relative shrink-0 ${size} ${className}`}
      style={stacked ? { transform: `translate(${stacked * 2}px, ${stacked * -2}px)` } : undefined}
    >
      <div className="absolute inset-0 overflow-hidden rounded-[1.05rem] border-[3px] border-white/25 shadow-[0_6px_14px_rgba(0,0,0,0.35)]">
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(145deg, #1b2a58 0%, #2b1d55 55%, #12172e 100%)",
          }}
        />
        <div className="absolute inset-[9%] rounded-[50%] border-[2.5px] border-white/90" />
        <div className="absolute inset-[15%] flex items-center justify-center rounded-[50%] border-[2px] border-[#E8C547]/90 bg-[#E8394B]">
          <span
            className="rotate-[-15deg] text-[0.7rem] font-black tracking-wide text-white"
            style={{ fontSize: variant === "opponent" ? "0.55rem" : "0.95rem" }}
          >
            UNO
          </span>
        </div>
      </div>
      {typeof count === "number" ? (
        <span className="absolute -right-1.5 -top-1.5 z-[1] inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-[#0F1B3C] shadow">
          {count}
        </span>
      ) : null}
    </div>
  );
}
