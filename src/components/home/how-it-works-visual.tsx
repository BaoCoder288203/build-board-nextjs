"use client";

import dynamic from "next/dynamic";
import { BoardIllustration } from "@/components/brand/board-illustration";
import {
  useInView,
  usePrefersReducedMotion,
  useWebGLSupport,
} from "@/components/home/home-motion";

const HowItWorksScene = dynamic(
  () =>
    import("@/components/home/how-it-works-scene").then((m) => m.HowItWorksScene),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center p-6">
        <BoardIllustration className="w-full max-w-sm opacity-80" floating={false} />
      </div>
    ),
  },
);

/** Explicit height — canvas fills this; bg plate is inset smaller for pop-out. */
const FRAME =
  "relative h-[280px] w-full sm:h-[320px] lg:h-[340px]";

export function HowItWorksVisual() {
  const reducedMotion = usePrefersReducedMotion();
  const webglOk = useWebGLSupport();
  const { ref, inView } = useInView(0.25);

  if (!webglOk) {
    return (
      <div className={`flex items-center justify-center p-4 ${FRAME}`}>
        <BoardIllustration className="w-full max-w-sm" floating={false} />
      </div>
    );
  }

  return (
    <div ref={ref} className={FRAME}>
      <HowItWorksScene active={inView} reducedMotion={reducedMotion} />
    </div>
  );
}
