import type { CSSProperties, ReactNode } from "react";
import type { UnoCardVariant } from "../utils/cardUtils";

export function UnoCardRim({
  children,
  variant = "hand",
  faceStyle,
}: {
  children: ReactNode;
  variant?: UnoCardVariant;
  faceStyle?: CSSProperties;
}) {
  const compact = variant === "opponent";

  return (
    <span
      className={`flex h-full w-full rounded-[1.15rem] bg-[#111] ${
        compact ? "p-px" : "p-[1.5px]"
      }`}
    >
      <span
        className={`flex h-full min-h-0 w-full rounded-[1.05rem] bg-white ${
          compact ? "p-[1.5px]" : "p-[2.5px]"
        }`}
      >
        <span
          className="relative block h-full min-h-0 w-full overflow-hidden rounded-[0.95rem] border border-[#111]"
          style={faceStyle}
        >
          {children}
        </span>
      </span>
    </span>
  );
}
