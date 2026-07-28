"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { BoardIllustration } from "@/components/brand/board-illustration";
import {
  useAdaptiveDpr,
  useInView,
  useIsCompact,
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
  const compact = useIsCompact();
  const dprRange = useAdaptiveDpr(compact);
  const webglOk = useWebGLSupport();
  const { ref, inView } = useInView(0.2);
  const [shouldRenderScene, setShouldRenderScene] = useState(false);

  useEffect(() => {
    if (inView) setShouldRenderScene(true);
  }, [inView]);

  if (!webglOk || reducedMotion) {
    return (
      <div className={`flex items-center justify-center p-4 ${FRAME}`}>
        <BoardIllustration className="w-full max-w-sm" floating={false} />
      </div>
    );
  }

  return (
    <div ref={ref} className={FRAME}>
      {shouldRenderScene ? (
        <FeatureBoardScene
          active={inView}
          reducedMotion={reducedMotion}
          dprRange={dprRange}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center p-4">
          <BoardIllustration className="w-full max-w-sm opacity-80" floating={false} />
        </div>
      )}
    </div>
  );
}
