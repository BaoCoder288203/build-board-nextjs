import { forwardRef, type InputHTMLAttributes } from "react";

export const inputClassName =
  "h-11 w-full rounded-[10px] border border-bb-border bg-bb-surface px-3.5 text-sm text-bb-ink outline-none transition placeholder:text-bb-muted/70 focus:border-bb-blue focus:ring-2 focus:ring-bb-blue/20 disabled:cursor-not-allowed disabled:opacity-60";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function Input({ className = "", ...props }, ref) {
  return (
    <input ref={ref} className={`${inputClassName} ${className}`} {...props} />
  );
});
