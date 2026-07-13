import Link from "next/link";
import { BoardIllustration } from "@/components/brand/board-illustration";
import { Logo } from "@/components/brand/logo";
import { buttonClassName } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(105deg,#E9F2FF_0%,#E9F2FF_48%,#0C66E4_48%,#579DFF_100%)] max-lg:bg-[linear-gradient(180deg,#E9F2FF_0%,#E9F2FF_42%,#0C66E4_42%,#579DFF_100%)]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 50% 40% at 20% 0%, rgba(255,255,255,0.9), transparent), radial-gradient(ellipse 40% 50% at 85% 60%, rgba(255,255,255,0.2), transparent)",
        }}
      />

      {/* Solid light bar — buttons always use light-surface variants (never text-white here) */}
      <header className="relative z-10 border-b border-bb-border/50 bg-bb-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Logo />
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className={buttonClassName({ variant: "ghost", size: "sm" })}
            >
              Log in
            </Link>
            <Link
              href="/register"
              className={buttonClassName({ variant: "primary", size: "sm" })}
            >
              Sign up — it&apos;s free
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid min-h-[calc(100vh-4.5rem)] max-w-6xl items-center gap-12 px-5 pb-16 pt-6 sm:px-8 lg:grid-cols-2 lg:gap-8 lg:pb-20">
        <div className="bb-animate-fade-up max-lg:pt-4">
          <p className="text-5xl font-extrabold tracking-tight text-bb-ink sm:text-6xl">
            BuildBoard
          </p>
          <h1 className="mt-5 max-w-md text-xl font-semibold leading-snug text-bb-ink sm:text-2xl">
            Capture, organize, and ship work from one clear board.
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-bb-muted">
            A focused board for software teams — lists, tasks, and progress
            without the noise.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/register"
              className={buttonClassName({ variant: "primary", size: "lg" })}
            >
              Get started free
            </Link>
            <Link
              href="/login"
              className={buttonClassName({ variant: "secondary", size: "lg" })}
            >
              Log in
            </Link>
          </div>
        </div>

        <div
          className="bb-animate-fade-in flex items-center justify-center py-6 lg:justify-end lg:py-0"
          style={{ animationDelay: "120ms" }}
        >
          <BoardIllustration className="w-full max-w-md lg:max-w-lg" />
        </div>
      </main>
    </div>
  );
}
