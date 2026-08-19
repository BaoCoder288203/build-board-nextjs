export type ThemeColors = {
  themeColorFrom?: string | null;
  themeColorTo?: string | null;
};

const DEFAULT_THEME: ThemeColors = {
  themeColorFrom: "#0C66E4",
  themeColorTo: "#579DFF",
};

export function themeGradientStyle(theme: Partial<ThemeColors>) {
  const from = theme.themeColorFrom ?? DEFAULT_THEME.themeColorFrom;
  const to = theme.themeColorTo ?? DEFAULT_THEME.themeColorTo;
  return {
    background: `linear-gradient(135deg, ${from}, ${to})`,
  } as const;
}

function themeStops(theme?: Partial<ThemeColors> | null) {
  const from =
    theme?.themeColorFrom ??
    theme?.themeColorTo ??
    DEFAULT_THEME.themeColorFrom;
  const to =
    theme?.themeColorTo ??
    theme?.themeColorFrom ??
    DEFAULT_THEME.themeColorTo;
  return { from: from!, to: to! };
}

/** Soft page canvas tinted from workspace avatar colors. */
export function workspaceCanvasStyle(theme?: Partial<ThemeColors> | null) {
  if (!theme?.themeColorFrom && !theme?.themeColorTo) return undefined;
  const { from, to } = themeStops(theme);
  return {
    background: `linear-gradient(160deg, color-mix(in srgb, ${from} 14%, #f7f8f9), color-mix(in srgb, ${to} 10%, #f7f8f9) 55%, #f7f8f9)`,
  } as const;
}

/** Header bars mixed from the same board/workspace theme. */
export function themeHeaderStyle(
  theme: Partial<ThemeColors> | null | undefined,
  strength: "strong" | "soft",
) {
  const { from, to } = themeStops(theme);
  const a = strength === "strong" ? 34 : 26;
  const b = strength === "strong" ? 26 : 20;
  return {
    background: `linear-gradient(160deg, color-mix(in srgb, ${from} ${a}%, #ffffff), color-mix(in srgb, ${to} ${b}%, #ffffff))`,
  } as const;
}

/** CSS background string for board switch cover / fallbacks. */
export function workspaceCanvasBackground(
  theme?: Partial<ThemeColors> | null,
): string {
  return (
    workspaceCanvasStyle(theme)?.background ??
    "linear-gradient(160deg, #f7f8f9, #f7f8f9)"
  );
}

export function projectInitial(
  name: string,
  icon?: string | null,
): string {
  if (icon?.trim()) return icon.trim().slice(0, 1).toUpperCase();
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const firstWord = trimmed.split(/\s+/)[0] ?? trimmed;
  const char = [...firstWord][0];
  return char ? char.toUpperCase() : "?";
}
