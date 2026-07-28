import type { ReactNode } from "react";

/**
 * Inset gradient plate + overflow-visible stage so the 3D canvas
 * can sit on top and “pop out” past the bg edges.
 */
export function SceneStage({
  children,
  className = "",
  withCanvasShadow = true,
  withGlow = true,
}: {
  children: ReactNode;
  className?: string;
  withCanvasShadow?: boolean;
  withGlow?: boolean;
}) {
  return (
    <div
      className={`relative overflow-visible px-1 py-6 sm:px-2 sm:py-8 ${className}`}
    >
      {/* Inset plate — shorter/narrower than the canvas */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-5 inset-y-10 rounded-2xl bg-gradient-to-br from-[#0C66E4]/18 via-[#E9F2FF]/85 to-[#579DFF]/30 ring-1 ring-bb-blue/20 sm:inset-x-7 sm:inset-y-12"
      />
      {/* Soft glow under the protruding board */}
      {withGlow ? (
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[52%] h-[55%] w-[78%] -translate-x-1/2 -translate-y-1/2 rounded-[40%] bg-[#0C66E4]/25 blur-3xl"
        />
      ) : null}
      {/* Canvas layer — bleeds past the plate */}
      <div
        className={`relative z-10 ${
          withCanvasShadow ? "drop-shadow-[0_18px_40px_rgba(12,102,228,0.28)]" : ""
        }`}
      >
        {children}
      </div>
    </div>
  );
}
