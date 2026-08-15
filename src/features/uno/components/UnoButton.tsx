"use client";

export function UnoButton({
  visible,
  urgent,
  onClick,
}: {
  visible: boolean;
  urgent?: boolean;
  onClick: () => void;
}) {
  if (!visible) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-14 w-14 rounded-full bg-gradient-to-b from-[#E8394B] to-[#C41E3A] text-xs font-black uppercase tracking-wide text-white shadow-[0_6px_16px_rgba(232,57,75,0.45)] transition-transform duration-150 ease-out hover:scale-105 active:scale-95 ${
        urgent ? "animate-pulse motion-reduce:animate-none" : ""
      }`}
    >
      UNO!
    </button>
  );
}
