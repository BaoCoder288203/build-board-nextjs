"use client";

type UserAvatarProps = {
  name: string;
  avatar?: string | null;
  /** Alias used by some APIs (`avatarUrl`) */
  avatarUrl?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  title?: string;
  ringClassName?: string;
  fallbackClassName?: string;
};

const SIZE_CLASS: Record<NonNullable<UserAvatarProps["size"]>, string> = {
  xs: "h-5 w-5 text-[9px]",
  sm: "h-6 w-6 text-[10px]",
  md: "h-7 w-7 text-[10px]",
  lg: "h-8 w-8 text-[10px]",
  xl: "h-10 w-10 text-xs",
};

export function userInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function UserAvatar({
  name,
  avatar,
  avatarUrl,
  size = "md",
  className = "",
  title,
  ringClassName = "",
  fallbackClassName = "bg-bb-blue text-white",
}: UserAvatarProps) {
  const src = (avatar || avatarUrl || "").trim() || null;
  const sizeClass = SIZE_CLASS[size];

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        title={title ?? name}
        className={`inline-block shrink-0 rounded-full object-cover ${sizeClass} ${ringClassName} ${className}`}
      />
    );
  }

  return (
    <span
      title={title ?? name}
      aria-hidden={title ? undefined : true}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold ${sizeClass} ${fallbackClassName} ${ringClassName} ${className}`}
    >
      {userInitials(name)}
    </span>
  );
}
