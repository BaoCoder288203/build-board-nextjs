"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Eye, Pin, Search, UserRound } from "lucide-react";
import { useRef } from "react";
import { usePrefersReducedMotion } from "@/components/home/home-motion";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export function TaskDetailVisual() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  useGSAP(
    () => {
      if (!ref.current || reduced) return;
      gsap.fromTo(
        ref.current.querySelectorAll("[data-chip]"),
        { y: 10, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.12,
          duration: 0.55,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ref.current,
            start: "top 85%",
            once: true,
          },
        },
      );
    },
    { dependencies: [reduced], scope: ref },
  );

  return (
    <div
      ref={ref}
      className="relative mx-auto w-full max-w-sm overflow-hidden rounded-2xl border border-bb-border/80 bg-white p-5 shadow-bb-lg"
      aria-hidden
    >
      <div className="h-3 w-2/3 rounded-full bg-bb-ink/90" />
      <div className="mt-4 space-y-2">
        <div className="h-2 w-full rounded-full bg-bb-sky-deep" />
        <div className="h-2 w-5/6 rounded-full bg-bb-sky" />
        <div className="h-2 w-4/6 rounded-full bg-bb-sky" />
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <span
          data-chip
          className="inline-flex items-center gap-1.5 rounded-lg bg-bb-sky px-2.5 py-1.5 text-xs font-semibold text-bb-ink"
        >
          <UserRound className="h-3.5 w-3.5 text-bb-blue" aria-hidden />
          Assignees
        </span>
        <span
          data-chip
          className="inline-flex items-center gap-1.5 rounded-lg bg-bb-sky px-2.5 py-1.5 text-xs font-semibold text-bb-ink"
        >
          <Pin className="h-3.5 w-3.5 text-bb-blue" aria-hidden />
          Pin
        </span>
        <span
          data-chip
          className="inline-flex items-center gap-1.5 rounded-lg bg-bb-sky px-2.5 py-1.5 text-xs font-semibold text-bb-ink"
        >
          <Eye className="h-3.5 w-3.5 text-bb-blue" aria-hidden />
          Watch
        </span>
      </div>
      <div className="mt-5 rounded-xl bg-bb-canvas p-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-bb-blue text-[10px] font-bold text-white">
            A
          </span>
          <div className="h-2 flex-1 rounded-full bg-bb-sky-deep" />
        </div>
      </div>
    </div>
  );
}

export function SearchVisual() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  useGSAP(
    () => {
      if (!ref.current || reduced) return;
      const caret = ref.current.querySelector("[data-caret]");
      if (!caret) return;
      gsap.to(caret, {
        opacity: 0.2,
        duration: 0.55,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
      gsap.fromTo(
        ref.current.querySelectorAll("[data-hit]"),
        { x: -8, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          stagger: 0.1,
          duration: 0.5,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ref.current,
            start: "top 85%",
            once: true,
          },
        },
      );
    },
    { dependencies: [reduced], scope: ref },
  );

  return (
    <div
      ref={ref}
      className="relative mx-auto w-full max-w-sm overflow-hidden rounded-2xl border border-bb-border/80 bg-white shadow-bb-lg"
      aria-hidden
    >
      <div className="flex items-center gap-3 border-b border-bb-border px-4 py-3">
        <Search className="h-4 w-4 text-bb-muted" aria-hidden />
        <span className="text-sm text-bb-muted">Search boards, tasks…</span>
        <kbd className="ml-auto rounded-md border border-bb-border bg-bb-canvas px-1.5 py-0.5 text-[10px] font-semibold text-bb-muted">
          ⌘K
        </kbd>
        <span data-caret className="h-4 w-0.5 bg-bb-blue" />
      </div>
      <ul className="space-y-1 p-2">
        {[
          { label: "Ship auth flow", meta: "Board · Doing" },
          { label: "Invite teammates", meta: "Workspace" },
          { label: "Launch checklist", meta: "Board · Done" },
        ].map((hit) => (
          <li
            key={hit.label}
            data-hit
            className="rounded-lg px-3 py-2.5 hover:bg-bb-sky"
          >
            <p className="text-sm font-semibold text-bb-ink">{hit.label}</p>
            <p className="text-xs text-bb-muted">{hit.meta}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
