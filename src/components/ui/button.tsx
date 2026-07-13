import type { ButtonHTMLAttributes } from "react";

/**
 * Contrast contract (do not break):
 * - primary / danger: solid brand|danger bg + white text
 * - secondary / ghost: light surfaces + ink text
 * - onDark / onDarkGhost: only on guaranteed dark/blue panels + light text or white chip
 * Never override text-* / bg-* on these variants ad-hoc for “theme switching”.
 */
type Variant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "onDark"
  | "onDarkGhost";
type Size = "md" | "sm" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-bb-blue text-white hover:bg-bb-blue-dark shadow-sm active:scale-[0.98]",
  secondary:
    "border border-bb-border bg-bb-surface text-bb-ink hover:bg-bb-sky active:scale-[0.98]",
  ghost:
    "bg-transparent text-bb-ink hover:bg-bb-sky active:scale-[0.98]",
  danger:
    "bg-bb-danger text-white hover:bg-[#ae2a21] active:scale-[0.98]",
  onDark:
    "border border-transparent bg-white text-bb-blue hover:bg-bb-sky active:scale-[0.98]",
  onDarkGhost:
    "bg-transparent text-white hover:bg-white/15 active:scale-[0.98]",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

export function buttonClassName({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
}: {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  className?: string;
} = {}) {
  return [
    "inline-flex items-center justify-center gap-2 rounded-[10px] font-semibold transition duration-150",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bb-blue focus-visible:ring-offset-2",
    "disabled:cursor-not-allowed disabled:opacity-55 disabled:active:scale-100",
    variants[variant],
    sizes[size],
    fullWidth ? "w-full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}) {
  return (
    <button
      type={type}
      className={buttonClassName({ variant, size, fullWidth, className })}
      {...props}
    />
  );
}
