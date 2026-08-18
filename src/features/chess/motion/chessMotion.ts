import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export { gsap, useGSAP };

export const CHESS_MOTION = {
  select: 0.12,
  move: 0.24,
  drop: 0.14,
  capture: 0.28,
  promotion: 0.15,
  check: 0.28,
} as const;

export function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function motionDuration(seconds: number) {
  if (prefersReducedMotion()) return Math.min(0.08, seconds * 0.3);
  return Math.min(0.3, Math.max(0.15, seconds));
}
