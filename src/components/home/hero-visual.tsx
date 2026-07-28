"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { BoardIllustration } from "@/components/brand/board-illustration";

const HeroBoardScene = dynamic(
  () =>
    import("@/components/home/hero-board-scene").then((m) => m.HeroBoardScene),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center">
        <BoardIllustration className="w-full max-w-md opacity-80 lg:max-w-lg" />
      </div>
    ),
  },
);

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return reduced;
}

function useIsCompact() {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const sync = () => setCompact(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return compact;
}

export function HeroVisual() {
  const reducedMotion = usePrefersReducedMotion();
  const compact = useIsCompact();
  const [webglOk, setWebglOk] = useState(true);

  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const ok = Boolean(
        canvas.getContext("webgl") || canvas.getContext("experimental-webgl"),
      );
      setWebglOk(ok);
    } catch {
      setWebglOk(false);
    }
  }, []);

  if (!webglOk) {
    return (
      <div className="flex h-full min-h-[280px] w-full items-center justify-center lg:min-h-0">
        <BoardIllustration className="w-full max-w-md lg:max-w-lg" />
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-[300px] w-full lg:min-h-[520px]">
      <HeroBoardScene reducedMotion={reducedMotion} compact={compact} />
    </div>
  );
}
