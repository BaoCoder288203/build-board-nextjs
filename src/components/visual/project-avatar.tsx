import { projectInitial, themeGradientStyle } from "@/lib/visual-identity";

type Props = {
  name: string;
  icon?: string | null;
  themeColorFrom?: string | null;
  themeColorTo?: string | null;
  className?: string;
};

export function ProjectAvatar({
  name,
  icon,
  themeColorFrom,
  themeColorTo,
  className = "h-10 w-10 rounded-lg text-sm font-bold text-white",
}: Props) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${className}`}
      style={themeGradientStyle({ themeColorFrom, themeColorTo })}
      aria-hidden
    >
      {projectInitial(name, icon)}
    </span>
  );
}
