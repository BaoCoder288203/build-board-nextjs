"use client";

import { useRef } from "react";
import { UNO_COLORS, UNO_COLOR_THEME } from "../constants/uno.constants";
import type { UnoColor } from "../types/card.types";
import { gsap, UNO_EASE, UNO_MOTION, useGSAP } from "../motion/unoMotion";

function ColorPickerPanel({
  onSelect,
}: {
  onSelect: (color: UnoColor) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      if (!rootRef.current) return;
      gsap.fromTo(
        rootRef.current,
        { autoAlpha: 0, scale: 0.92 },
        {
          autoAlpha: 1,
          scale: 1,
          duration: UNO_MOTION.fast,
          ease: UNO_EASE.out,
        },
      );
    },
    { scope: rootRef },
  );

  return (
    <div
      ref={rootRef}
      className="flex flex-col items-center gap-3 rounded-2xl border border-white/15 bg-[#0F1B3C]/80 px-5 py-4 shadow-xl"
    >
      <p className="text-xs font-bold uppercase tracking-wider text-white/80">
        Choose a color
      </p>
      <div className="flex items-center gap-3">
        {UNO_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onSelect(color)}
            aria-label={color}
            className="h-12 w-12 rounded-full border-2 border-white/70 shadow-md transition-transform duration-150 ease-out hover:scale-110 active:scale-95"
            style={{
              background: `linear-gradient(160deg, ${UNO_COLOR_THEME[color].from}, ${UNO_COLOR_THEME[color].to})`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function ColorPicker({
  open,
  onSelect,
}: {
  open: boolean;
  onSelect: (color: UnoColor) => void;
}) {
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
      <ColorPickerPanel onSelect={onSelect} />
    </div>
  );
}
