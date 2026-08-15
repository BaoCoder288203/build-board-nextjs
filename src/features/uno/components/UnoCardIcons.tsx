import type { ReactNode } from "react";
import type { PublicCard } from "../types/card.types";

function StrokeIcon({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" aria-hidden>
      {children}
    </svg>
  );
}

export function SkipIcon({ className = "h-[1em] w-[1em]" }: { className?: string }) {
  return (
    <StrokeIcon className={className}>
      <circle cx="32" cy="32" r="20" stroke="currentColor" strokeWidth="7" />
      <path
        d="M18 46 L46 18"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
      />
    </StrokeIcon>
  );
}

export function ReverseIcon({ className = "h-[1em] w-[1em]" }: { className?: string }) {
  return (
    <StrokeIcon className={className}>
      <path
        d="M20 28c2-10 22-12 26 0"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path d="M42 18 L48 28 L36 30" fill="currentColor" stroke="none" />
      <path
        d="M44 36c-2 10-22 12-26 0"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path d="M22 46 L16 36 L28 34" fill="currentColor" stroke="none" />
    </StrokeIcon>
  );
}

export function DrawTwoIcon({ className = "h-[1em] w-[1em]" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center font-black leading-none ${className}`}>
      +2
    </span>
  );
}

export function WildFourIcon({ className = "h-[1em] w-[1em]" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center font-black leading-none ${className}`}>
      +4
    </span>
  );
}

export function WildPie({ className = "h-[1em] w-[1em]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <path d="M32 8 A24 24 0 0 1 56 32 L32 32 Z" fill="#E8394B" />
      <path d="M56 32 A24 24 0 0 1 32 56 L32 32 Z" fill="#FFC93C" />
      <path d="M32 56 A24 24 0 0 1 8 32 L32 32 Z" fill="#3CB878" />
      <path d="M8 32 A24 24 0 0 1 32 8 L32 32 Z" fill="#3B82F6" />
    </svg>
  );
}

export function CardGlyph({
  card,
  className = "",
}: {
  card: PublicCard;
  className?: string;
}) {
  if (card.type === "NUMBER") {
    return <span className={className}>{card.value}</span>;
  }
  if (card.value === "SKIP") return <SkipIcon className={className} />;
  if (card.value === "REVERSE") return <ReverseIcon className={className} />;
  if (card.value === "DRAW_TWO") return <DrawTwoIcon className={className} />;
  if (card.value === "WILD_DRAW_FOUR") return <WildFourIcon className={className} />;
  return <WildPie className={className} />;
}
