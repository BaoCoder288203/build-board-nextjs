import type { ReactNode } from "react";
import { BoardIllustration } from "@/components/brand/board-illustration";
import { Logo } from "@/components/brand/logo";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-[linear-gradient(160deg,#0C66E4_0%,#0055CC_48%,#0747A6_100%)] lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.35), transparent 45%), radial-gradient(circle at 80% 70%, rgba(87,157,255,0.5), transparent 40%)",
          }}
        />
        <Logo tone="light" className="relative z-10" />
        <div className="relative z-10 max-w-md">
          <p className="text-4xl font-bold leading-tight tracking-tight text-white">
            Capture work.
            <br />
            Move it forward.
          </p>
          <p className="mt-4 text-base text-white/80">
            Boards, lists, and tasks that stay clear for software teams — built
            for focus, not clutter.
          </p>
          <div className="mt-10 max-w-md">
            <BoardIllustration />
          </div>
        </div>
        <p className="relative z-10 text-sm text-white/55">
          BuildBoard · project management for builders
        </p>
      </aside>

      <main className="flex flex-col bg-bb-canvas">
        <div className="flex items-center justify-between border-b border-bb-border/70 bg-bb-surface px-5 py-4 lg:hidden">
          <Logo />
        </div>
        <div className="flex flex-1 items-center justify-center px-5 py-10">
          <div className="bb-animate-fade-up w-full max-w-[420px]">
            <div className="mb-8">
              <h1 className="text-3xl font-bold tracking-tight text-bb-ink">
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-2 text-sm leading-relaxed text-bb-muted">
                  {subtitle}
                </p>
              ) : null}
            </div>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

export { Field } from "@/components/ui/label";
export { Input, inputClassName } from "@/components/ui/input";
export { Button, buttonClassName } from "@/components/ui/button";
export { Alert } from "@/components/ui/alert";
