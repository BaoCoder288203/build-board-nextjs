"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Check } from "lucide-react";
import { useRef } from "react";
import { prefersReducedMotion } from "@/lib/board-transition";

gsap.registerPlugin(useGSAP);

const DONE_GREEN = "#22A06B";
const RAY_COUNT = 8;

type Props = {
  done: boolean;
  disabled?: boolean;
  size?: "sm" | "md";
  onToggle: () => void;
};

export function TaskDoneCheckbox({
  done,
  disabled = false,
  size = "sm",
  onToggle,
}: Props) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const burstRef = useRef<HTMLSpanElement>(null);
  const prevDone = useRef(done);

  const px = size === "md" ? 20 : 16;
  const rayHeight = Math.round(px * 0.38);
  const rayTravel = Math.round(px * 0.55);
  const rayWidth = size === "md" ? 2.5 : 2;

  useGSAP(
    () => {
      const burst = burstRef.current;
      const tips = burst?.querySelectorAll<HTMLElement>("[data-ray-tip]");
      if (!burst || !tips?.length) return;

      const becameDone = done && !prevDone.current;
      prevDone.current = done;

      gsap.killTweensOf([burst, tips]);

      if (!becameDone) {
        gsap.set(burst, { opacity: 0 });
        gsap.set(tips, { y: 0, opacity: 0, scaleY: 0.4 });
        return;
      }

      if (prefersReducedMotion()) {
        gsap.set(burst, { opacity: 0 });
        gsap.set(tips, { y: 0, opacity: 0, scaleY: 0.4 });
        return;
      }

      // Overlay only — checkbox size/position never changes.
      gsap.set(burst, { opacity: 1 });
      gsap.fromTo(
        tips,
        { y: Math.max(1, Math.round(px * 0.06)), opacity: 1, scaleY: 0.4 },
        {
          y: -rayTravel,
          opacity: 1,
          scaleY: 1,
          duration: 0.28,
          stagger: 0.012,
          ease: "power2.out",
          onComplete: () => {
            gsap.set(burst, { opacity: 0 });
            gsap.set(tips, { y: 0, opacity: 0, scaleY: 0.4 });
          },
        },
      );
    },
    { scope: rootRef, dependencies: [done, px, rayTravel] },
  );

  return (
    <span
      ref={rootRef}
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: px, height: px }}
    >
      <button
        type="button"
        disabled={disabled}
        aria-pressed={done}
        aria-label={done ? "Mark task as not done" : "Mark task as done"}
        title={done ? "Mark as not done" : "Mark as done"}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggle();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className={`relative z-[1] inline-flex shrink-0 items-center justify-center rounded-full border-2 transition-[background-color,border-color,color] duration-150 disabled:cursor-not-allowed disabled:opacity-60 ${
          done
            ? "border-[#22A06B] bg-[#22A06B] text-white"
            : "border-bb-muted/55 bg-white text-transparent hover:border-[#22A06B]"
        }`}
        style={{ width: px, height: px }}
      >
        <Check
          className={size === "md" ? "h-3 w-3" : "h-2.5 w-2.5"}
          strokeWidth={3}
          aria-hidden
        />
      </button>

      <span
        ref={burstRef}
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-0 w-0 overflow-visible opacity-0"
      >
        {Array.from({ length: RAY_COUNT }, (_, i) => {
          const angle = (i * 360) / RAY_COUNT;
          return (
            <span
              key={angle}
              className="absolute left-0 top-0 block h-0 w-0"
              style={{ transform: `rotate(${angle}deg)` }}
            >
              <span
                data-ray-tip
                className="absolute left-0 top-0 block origin-bottom rounded-full"
                style={{
                  width: rayWidth,
                  height: rayHeight,
                  marginLeft: -rayWidth / 2,
                  marginTop: -rayHeight,
                  background: DONE_GREEN,
                  opacity: 0,
                }}
              />
            </span>
          );
        })}
      </span>
    </span>
  );
}
