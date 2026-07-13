import type { LabelHTMLAttributes, ReactNode } from "react";

export function Field({
  label,
  children,
  error,
  htmlFor,
}: {
  label: string;
  children: ReactNode;
  error?: string;
  htmlFor?: string;
}) {
  return (
    <label className="mb-4 block" htmlFor={htmlFor}>
      <span className="mb-1.5 block text-sm font-semibold text-bb-ink">
        {label}
      </span>
      {children}
      {error ? (
        <span className="mt-1.5 block text-xs font-medium text-bb-danger">
          {error}
        </span>
      ) : null}
    </label>
  );
}

export function Label({
  className = "",
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={`mb-1.5 block text-sm font-semibold text-bb-ink ${className}`}
      {...props}
    />
  );
}
