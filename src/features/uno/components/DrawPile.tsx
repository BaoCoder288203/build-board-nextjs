"use client";

import { UNO_ANCHOR } from "../motion/unoAnchors";
import { useUnoAnchor } from "../motion/useUnoAnchor";
import { UnoCardBack } from "./UnoCardBack";

export function DrawPile({
  count,
  pendingDraw,
  disabled,
  onDraw,
}: {
  count: number;
  pendingDraw: number;
  disabled?: boolean;
  onDraw: () => void;
}) {
  const setAnchor = useUnoAnchor<HTMLButtonElement>(UNO_ANCHOR.draw);
  const stack = Math.min(Math.max(count, 1), 3);

  return (
    <button
      ref={setAnchor}
      type="button"
      disabled={disabled}
      onClick={onDraw}
      className="relative h-[7.15rem] w-[4.75rem] disabled:opacity-50"
      aria-label={`Draw pile, ${count} cards`}
    >
      {Array.from({ length: stack }, (_, i) => (
        <div
          key={i}
          className="absolute inset-0"
          style={{ transform: `translate(${i * 2}px, ${-i * 2}px)` }}
        >
          <UnoCardBack variant="pile" />
        </div>
      ))}
      <span className="absolute inset-x-0 bottom-1 z-[2] text-center text-[10px] font-black tracking-wide text-white drop-shadow">
        {count}
      </span>
      {pendingDraw > 0 ? (
        <span className="absolute -right-2 -top-2 z-[3] rounded-full bg-[#E8394B] px-1.5 text-[10px] font-bold text-white">
          +{pendingDraw}
        </span>
      ) : null}
    </button>
  );
}
