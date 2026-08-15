"use client";

import { useRef, type RefObject } from "react";
import { useUnoFx } from "./useUnoFx";

export function UnoFxOverlay({
  myPlayerId,
  myUserId,
  shakeRef,
}: {
  myPlayerId: string | null;
  myUserId: string | null;
  shakeRef: RefObject<HTMLElement | null>;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  useUnoFx(overlayRef, shakeRef, myPlayerId, myUserId);

  return (
    <div
      ref={overlayRef}
      data-uno-overlay
      className="pointer-events-none absolute inset-0 z-30 overflow-hidden"
      style={{ perspective: 800 }}
    />
  );
}
