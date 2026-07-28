import { FeatureBoardVisual } from "@/components/home/feature-board-visual";
import { FeatureCollabVisual } from "@/components/home/feature-collab-visual";
import {
  SearchVisual,
  TaskDetailVisual,
} from "@/components/home/feature-css-visuals";
import { SceneStage } from "@/components/home/scene-stage";
import { SectionReveal } from "@/components/home/section-reveal";

type Feature = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  reverse?: boolean;
  visual: "board" | "tasks" | "collab" | "search";
};

const FEATURES: Feature[] = [
  {
    id: "boards",
    eyebrow: "Boards & columns",
    title: "See progress at a glance",
    body: "Lists keep work staged clearly — capture ideas, drag them forward, and know what’s shipping without digging through tabs.",
    visual: "board",
  },
  {
    id: "tasks",
    eyebrow: "Tasks that move work",
    title: "Everything a card needs",
    body: "Open a task for detail, assignees, pin, and watch. Duplicate when you need a template — keep the board the single source of truth.",
    reverse: true,
    visual: "tasks",
  },
  {
    id: "collab",
    eyebrow: "Collaborate",
    title: "Talk where the work lives",
    body: "Rich comments with TipTap, @mentions, reactions, and board sharing — context stays on the card, not buried in chat threads.",
    visual: "collab",
  },
  {
    id: "search",
    eyebrow: "Find anything",
    title: "⌘K across your workspace",
    body: "Jump to boards, tasks, and people from global search. Pair it with the dashboard to see what needs attention next.",
    reverse: true,
    visual: "search",
  },
];

function FeatureVisual({ kind }: { kind: Feature["visual"] }) {
  switch (kind) {
    case "board":
      return <FeatureBoardVisual />;
    case "tasks":
      return <TaskDetailVisual />;
    case "collab":
      return <FeatureCollabVisual />;
    case "search":
      return <SearchVisual />;
  }
}

export function FeatureSections() {
  return (
    <section id="features" className="relative scroll-mt-24 overflow-visible py-8 sm:py-12">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(180deg, #F4F8FF 0%, #FFFFFF 30%, #E9F2FF 70%, #F7F8F9 100%)",
        }}
      />
      <div className="relative mx-auto max-w-6xl space-y-20 overflow-visible px-5 py-12 sm:px-8 sm:space-y-28 sm:py-16">
        {FEATURES.map((feature, index) => (
          <div
            key={feature.id}
            className={`grid items-center gap-10 overflow-visible lg:grid-cols-2 lg:gap-16 ${
              feature.reverse ? "lg:[&>*:first-child]:order-2" : ""
            }`}
          >
            <SectionReveal delay={0.04}>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-bb-blue">
                {feature.eyebrow}
              </p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-bb-ink sm:text-4xl">
                {feature.title}
              </h2>
              <p className="mt-4 max-w-md text-base leading-relaxed text-bb-muted">
                {feature.body}
              </p>
            </SectionReveal>
            <SectionReveal delay={0.1} className="overflow-visible">
              {feature.visual === "board" || feature.visual === "collab" ? (
                <SceneStage
                  withCanvasShadow={feature.id !== "boards"}
                  withGlow={feature.id !== "boards"}
                >
                  <FeatureVisual kind={feature.visual} />
                </SceneStage>
              ) : (
                <div className="relative overflow-hidden rounded-2xl bg-bb-sky/50 p-6 ring-1 ring-bb-blue/10 sm:p-8">
                  {index % 2 === 0 ? (
                    <div
                      className="pointer-events-none absolute -left-10 top-8 h-40 w-40 rounded-full opacity-30 blur-3xl"
                      style={{ background: "#579DFF" }}
                    />
                  ) : null}
                  <FeatureVisual kind={feature.visual} />
                </div>
              )}
            </SectionReveal>
          </div>
        ))}
      </div>
    </section>
  );
}
