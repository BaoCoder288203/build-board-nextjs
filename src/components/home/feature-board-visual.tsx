"use client";

import dynamic from "next/dynamic";
import { BoardIllustration } from "@/components/brand/board-illustration";
import {
  useInView,
  usePrefersReducedMotion,
  useWebGLSupport,
} from "@/components/home/home-motion";

const FeatureBoardScene = dynamic(
  () =>
    import("@/components/home/feature-board-scene").then(
      (m) => m.FeatureBoardScene,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center p-6">
        <BoardIllustration className="w-full max-w-sm opacity-80" floating={false} />
      </div>
    ),
  },
);

const FRAME = "relative h-[260px] w-full sm:h-[300px] lg:h-[320px]";

export function FeatureBoardVisual() {
  const reducedMotion = usePrefersReducedMotion();
  const webglOk = useWebGLSupport();
  const { ref, inView } = useInView(0.2);

  if (!webglOk) {
    return (
      <div className={`flex items-center justify-center p-4 ${FRAME}`}>
        <BoardIllustration className="w-full max-w-sm" floating={false} />
      </div>
    );
  }

  return (
    <div ref={ref} className={FRAME}>
      <FeatureBoardScene active={inView} reducedMotion={reducedMotion} />
    </div>
  );
}
