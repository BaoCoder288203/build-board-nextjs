import { HowItWorksVisual } from "@/components/home/how-it-works-visual";
import { SceneStage } from "@/components/home/scene-stage";
import { SectionReveal } from "@/components/home/section-reveal";

const STEPS = [
  {
    n: "01",
    title: "Create a workspace",
    body: "Spin up a home for your team — boards live together so context stays close to the work.",
  },
  {
    n: "02",
    title: "Organize on a board",
    body: "Lists and cards keep status obvious. Drag work forward without digging through noise.",
  },
  {
    n: "03",
    title: "Ship with your team",
    body: "Assignees, comments, and search keep everyone aligned from capture to done.",
  },
] as const;

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative scroll-mt-24 overflow-visible py-20 sm:py-24"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(180deg, #F7F8F9 0%, #E9F2FF 48%, #F4F8FF 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute -right-24 top-16 h-72 w-72 rounded-full opacity-40 blur-3xl"
        style={{ background: "#579DFF" }}
      />
      <div
        className="pointer-events-none absolute -left-16 bottom-10 h-56 w-56 rounded-full opacity-30 blur-3xl"
        style={{ background: "#0C66E4" }}
      />

      <div className="relative mx-auto grid max-w-6xl gap-12 overflow-visible px-5 sm:px-8 lg:grid-cols-2 lg:items-center lg:gap-16">
        <div>
          <SectionReveal>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-bb-blue">
              How it works
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-bb-ink sm:text-4xl">
              From empty board to shipped work
            </h2>
            <p className="mt-3 max-w-md text-base leading-relaxed text-bb-muted">
              Three steps — the same loop your team already knows, without the
              ceremony.
            </p>
          </SectionReveal>

          <ol className="mt-10 space-y-8">
            {STEPS.map((step, i) => (
              <SectionReveal key={step.n} delay={0.06 * (i + 1)}>
                <li className="flex gap-4">
                  <span className="mt-0.5 font-mono text-sm font-bold text-bb-board">
                    {step.n}
                  </span>
                  <div>
                    <h3 className="text-lg font-bold text-bb-ink">{step.title}</h3>
                    <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-bb-muted">
                      {step.body}
                    </p>
                  </div>
                </li>
              </SectionReveal>
            ))}
          </ol>
        </div>

        <SectionReveal delay={0.12} className="relative overflow-visible">
          <SceneStage withCanvasShadow={false} withGlow={false}>
            <HowItWorksVisual />
          </SceneStage>
        </SectionReveal>
      </div>
    </section>
  );
}
