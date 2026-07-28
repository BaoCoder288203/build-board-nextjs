import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionReveal } from "@/components/home/section-reveal";
import { buttonClassName } from "@/components/ui/button";

export function ClosingCta() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-24">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(135deg, #0C66E4 0%, #0747A6 48%, #579DFF 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 50% 60% at 20% 20%, rgba(255,255,255,0.35), transparent), radial-gradient(ellipse 45% 50% at 85% 70%, rgba(233,242,255,0.25), transparent)",
        }}
      />

      <div className="relative mx-auto max-w-3xl px-5 text-center sm:px-8">
        <SectionReveal>
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Capture work. Move it forward.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-white/85">
            BuildBoard gives software teams a clear board — lists, tasks, and
            progress without the noise. Free to start.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/register"
              className={buttonClassName({ variant: "onDark", size: "lg" })}
            >
              Get started free
              <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden />
            </Link>
            <Link
              href="/login"
              className={buttonClassName({
                variant: "onDarkGhost",
                size: "lg",
              })}
            >
              Log in
            </Link>
          </div>
        </SectionReveal>
      </div>
    </section>
  );
}
