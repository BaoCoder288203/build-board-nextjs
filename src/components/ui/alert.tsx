import type { ReactNode } from "react";

type Tone = "success" | "danger" | "info";

const tones: Record<Tone, string> = {
  success: "bg-bb-success-bg text-bb-success border-bb-success/20",
  danger: "bg-bb-danger-bg text-bb-danger border-bb-danger/20",
  info: "bg-bb-sky text-bb-ink border-bb-blue/15",
};

export function Alert({
  tone = "info",
  children,
  className = "",
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mb-4 rounded-[10px] border px-3.5 py-3 text-sm ${tones[tone]} ${className}`}
      role="status"
    >
      {children}
    </div>
  );
}
