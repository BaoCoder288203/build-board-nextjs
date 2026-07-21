import { themeGradientStyle, type ThemeColors } from "@/lib/visual-identity";

type Props = Partial<ThemeColors> & {
  className?: string;
};

export function WorkspaceAvatar({
  themeColorFrom,
  themeColorTo,
  className = "h-28 w-full",
}: Props) {
  return (
    <div
      className={`${className} transition duration-200 group-hover:brightness-105`}
      style={themeGradientStyle({ themeColorFrom, themeColorTo })}
      aria-hidden
    />
  );
}
