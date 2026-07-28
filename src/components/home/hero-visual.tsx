"use client";

import dynamic from "next/dynamic";
import { BoardIllustration } from "@/components/brand/board-illustration";
import {
  useAdaptiveDpr,
  useInView,
  useIsCompact,
  usePrefersReducedMotion,
  useWebGLSupport,
} from "@/components/home/home-motion";

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

export function HeroVisual() {
  const reducedMotion = usePrefersReducedMotion();
  const compact = useIsCompact();
  const dprRange = useAdaptiveDpr(compact);
  const webglOk = useWebGLSupport();
  const { ref, inView } = useInView(0.1);

  if (!webglOk || reducedMotion) {
    return (
      <div className="flex h-full min-h-[280px] w-full items-center justify-center lg:min-h-0">
        <BoardIllustration className="w-full max-w-md lg:max-w-lg" />
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="relative h-full min-h-[300px] w-full lg:min-h-[520px]"
    >
      <HeroBoardScene
        reducedMotion={reducedMotion}
        compact={compact}
        active={inView}
        dprRange={dprRange}
      />
    </div>
  );
}
