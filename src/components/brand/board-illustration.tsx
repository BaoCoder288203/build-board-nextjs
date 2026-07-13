export function BoardIllustration({
  className = "",
  floating = true,
}: {
  className?: string;
  floating?: boolean;
}) {
  return (
    <div
      className={`relative ${floating ? "bb-animate-float" : ""} ${className}`}
      aria-hidden
    >
      <div className="absolute -inset-8 rounded-[28px] bg-white/10 blur-2xl" />
      <div className="relative grid grid-cols-3 gap-3 rounded-2xl bg-[#0a4fbf]/45 p-4 shadow-bb-lg backdrop-blur-sm ring-1 ring-white/20 sm:gap-4 sm:p-5">
        <Column
          delay="0ms"
          cards={[
            { title: "Ship auth", tone: "blue" },
            { title: "Invite team", tone: "white" },
          ]}
        />
        <Column
          delay="80ms"
          cards={[
            { title: "Board layout", tone: "white" },
            { title: "Realtime sync", tone: "green" },
            { title: "Notifications", tone: "white" },
          ]}
        />
        <Column
          delay="160ms"
          cards={[
            { title: "AI assist", tone: "amber" },
            { title: "Launch", tone: "white" },
          ]}
        />
      </div>
    </div>
  );
}

function Column({
  cards,
  delay,
}: {
  cards: { title: string; tone: "white" | "blue" | "green" | "amber" }[];
  delay: string;
}) {
  const tones = {
    white: "bg-white text-bb-ink",
    blue: "bg-[#DEEBFF] text-bb-blue-dark",
    green: "bg-[#DCFFF1] text-[#216E4E]",
    amber: "bg-[#FFF7D6] text-[#7F5F01]",
  };

  return (
    <div className="flex min-w-0 flex-col gap-2.5 rounded-xl bg-black/15 p-2.5 sm:p-3">
      <div className="mb-1 h-2 w-12 rounded-full bg-white/35" />
      {cards.map((card, index) => (
        <div
          key={card.title}
          className={`bb-animate-card rounded-lg px-2.5 py-2.5 text-[11px] font-semibold shadow-sm sm:text-xs ${tones[card.tone]}`}
          style={{ animationDelay: `calc(${delay} + ${index * 70}ms)` }}
        >
          {card.title}
        </div>
      ))}
    </div>
  );
}
