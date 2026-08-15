import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export { gsap, useGSAP };

export const UNO_MOTION = {
  instant: 0.08,
  hover: 0.16,
  fast: 0.15,
  normal: 0.25,
  emphasis: 0.38,
  major: 0.45,
  dealStagger: 0.07,
  drawStagger: 0.06,
} as const;

export const UNO_EASE = {
  out: "power2.out",
  inOut: "power2.inOut",
  settle: "back.out(1.25)",
} as const;

export function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function motionDuration(seconds: number) {
  return prefersReducedMotion() ? Math.min(0.12, seconds * 0.4) : seconds;
}
