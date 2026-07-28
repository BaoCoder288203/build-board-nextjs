"use client";

import dynamic from "next/dynamic";
import {
  useInView,
  usePrefersReducedMotion,
  useWebGLSupport,
} from "@/components/home/home-motion";

function CollabFallback() {
  return (
    <div
      className="flex h-full min-h-[400px] w-full items-center justify-center p-6"
      aria-hidden
    >
      <div className="relative w-full max-w-xs">
        <div className="rounded-xl border border-bb-border bg-white p-4 shadow-bb-lg">
          <div className="h-2.5 w-24 rounded-full bg-bb-blue" />
          <div className="mt-3 h-2 w-full rounded-full bg-bb-sky-deep" />
          <div className="mt-2 h-2 w-4/5 rounded-full bg-bb-sky" />
          <div className="mt-4 flex gap-2">
            <span className="h-7 w-7 rounded-full bg-bb-blue" />
            <span className="h-7 w-7 rounded-full bg-bb-board" />
          </div>
        </div>
        <div className="absolute -right-2 top-6 w-[70%] rounded-xl border border-bb-sky-deep bg-bb-sky p-3 shadow-bb">
          <div className="h-2 w-3/4 rounded-full bg-bb-ink/25" />
          <div className="mt-2 h-2 w-full rounded-full bg-bb-ink/15" />
        </div>
        <div className="absolute bottom-4 right-4 flex gap-1.5">
          <span className="h-7 w-7 rounded-full bg-[#FF8F73]" />
          <span className="h-7 w-7 rounded-full bg-[#F5CD47]" />
          <span className="h-7 w-7 rounded-full bg-bb-board" />
        </div>
      </div>
    </div>
  );
}

const FeatureCollabScene = dynamic(
  () =>
    import("@/components/home/feature-collab-scene").then(
      (m) => m.FeatureCollabScene,
    ),
  {
    ssr: false,
    loading: () => <CollabFallback />,
  },
);

export function FeatureCollabVisual() {
  const reducedMotion = usePrefersReducedMotion();
  const webglOk = useWebGLSupport();
  const { ref, inView } = useInView(0.2);

  if (!webglOk || reducedMotion) {
    return <CollabFallback />;
  }

  return (
    <div
      ref={ref}
      className="relative h-[260px] w-full sm:h-[300px] lg:h-[320px]"
    >
      <FeatureCollabScene active={inView} reducedMotion={false} />
    </div>
  );
}
