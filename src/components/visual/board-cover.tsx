import { themeGradientStyle, type ThemeColors } from "@/lib/visual-identity";

type Props = {
  coverUrl?: string | null;
  alt: string;
  fallbackTheme?: Partial<ThemeColors>;
  className?: string;
};

export function BoardCover({
  coverUrl,
  alt,
  fallbackTheme,
  className = "h-20 w-full object-cover",
}: Props) {
  if (coverUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={coverUrl} alt={alt} className={className} loading="lazy" />
    );
  }

  return (
    <div
      className={className}
      style={themeGradientStyle(fallbackTheme ?? {})}
      aria-hidden
    />
  );
}
