import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { GuestOnly } from "@/components/guest-only";
import { ClosingCta } from "@/components/home/closing-cta";
import { FeatureSections } from "@/components/home/feature-sections";
import { HeroVisual } from "@/components/home/hero-visual";
import { HowItWorks } from "@/components/home/how-it-works";
import { SiteFooter } from "@/components/home/site-footer";
import { TrustStrip } from "@/components/home/trust-strip";
import { buttonClassName } from "@/components/ui/button";

export default function HomePage() {
  return (
    <GuestOnly>
      <div className="relative overflow-x-hidden">
        <header className="sticky top-0 z-30 border-b border-bb-border/50 bg-bb-surface/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
            <Logo />
            <nav className="hidden items-center gap-6 md:flex">
              <a
                href="#how-it-works"
                className="text-sm font-semibold text-bb-ink transition hover:text-bb-blue"
              >
                How it works
              </a>
              <a
                href="#features"
                className="text-sm font-semibold text-bb-ink transition hover:text-bb-blue"
              >
                Features
              </a>
            </nav>
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

        {/* Hero */}
        <div className="relative min-h-[calc(100vh-4.5rem)] overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(118deg,#F4F8FF_0%,#E9F2FF_38%,#0C66E4_62%,#579DFF_100%)] max-lg:bg-[linear-gradient(180deg,#F4F8FF_0%,#E9F2FF_44%,#0C66E4_70%,#579DFF_100%)]" />
          <div
            className="pointer-events-none absolute inset-0 opacity-50"
            style={{
              backgroundImage:
                "radial-gradient(ellipse 55% 45% at 18% 10%, rgba(255,255,255,0.95), transparent), radial-gradient(ellipse 45% 55% at 88% 55%, rgba(255,255,255,0.22), transparent)",
            }}
          />

          {/* Living Kanban — full-bleed visual plane (pointer events for parallax) */}
          <div className="absolute inset-x-0 bottom-0 top-[38%] z-[1] lg:inset-0 lg:left-[40%]">
            <HeroVisual />
          </div>

          <main className="pointer-events-none relative z-10 mx-auto flex min-h-[calc(100vh-4.5rem)] max-w-6xl flex-col justify-center px-5 pb-[42vh] pt-10 sm:px-8 lg:pb-20 lg:pt-6">
            <div className="bb-animate-fade-up pointer-events-auto max-w-xl">
              <p className="text-5xl font-extrabold tracking-tight text-bb-ink sm:text-6xl lg:text-7xl">
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
                  <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden />
                </Link>
                <Link
                  href="/login"
                  className={buttonClassName({
                    variant: "secondary",
                    size: "lg",
                  })}
                >
                  Log in
                </Link>
              </div>
            </div>
          </main>
        </div>

        <TrustStrip />
        <HowItWorks />
        <FeatureSections />
        <ClosingCta />
        <SiteFooter />
      </div>
    </GuestOnly>
  );
}
