import Link from "next/link";

export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect width="32" height="32" rx="8" fill="#0C66E4" />
      <rect x="6" y="7" width="6" height="14" rx="1.5" fill="white" />
      <rect x="13" y="7" width="6" height="18" rx="1.5" fill="white" opacity="0.85" />
      <rect x="20" y="7" width="6" height="10" rx="1.5" fill="white" opacity="0.7" />
    </svg>
  );
}

export function Logo({
  href = "/",
  tone = "dark",
  className = "",
}: {
  href?: string;
  tone?: "dark" | "light";
  className?: string;
}) {
  const text = tone === "light" ? "text-white" : "text-bb-ink";

  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2.5 ${className}`}
    >
      <LogoMark />
      <span className={`text-lg font-bold tracking-tight ${text}`}>
        BuildBoard
      </span>
    </Link>
  );
}
