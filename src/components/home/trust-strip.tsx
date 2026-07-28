import { Columns3, FolderKanban, Gift, LogIn } from "lucide-react";
import { SectionReveal } from "@/components/home/section-reveal";

const SIGNALS = [
  { label: "Boards", icon: Columns3 },
  { label: "Workspaces", icon: FolderKanban },
  { label: "Google login", icon: LogIn },
  { label: "Free to start", icon: Gift },
] as const;

export function TrustStrip() {
  return (
    <section
      aria-label="Built for software teams"
      className="relative border-y border-bb-border/60 bg-bb-surface/80"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 70% 80% at 50% 0%, #E9F2FF, transparent)",
        }}
      />
      <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-6 px-5 py-10 sm:px-8 sm:py-12">
        <SectionReveal>
          <p className="text-center text-sm font-semibold uppercase tracking-[0.14em] text-bb-blue">
            Built for software teams
          </p>
        </SectionReveal>
        <SectionReveal delay={0.08}>
          <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 sm:gap-x-12">
            {SIGNALS.map(({ label, icon: Icon }) => (
              <li
                key={label}
                className="inline-flex items-center gap-2 text-sm font-semibold text-bb-ink sm:text-base"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-bb-sky text-bb-blue">
                  <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </SectionReveal>
      </div>
    </section>
  );
}
