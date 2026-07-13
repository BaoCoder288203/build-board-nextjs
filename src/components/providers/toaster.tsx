"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      closeButton
      richColors={false}
      toastOptions={{
        duration: 4500,
        classNames: {
          toast:
            "group border border-bb-border bg-bb-surface text-bb-ink shadow-bb-lg rounded-[12px] font-sans",
          title: "text-sm font-semibold text-bb-ink",
          description: "text-sm text-bb-muted",
          actionButton:
            "bg-bb-blue text-white font-semibold hover:bg-bb-blue-dark",
          cancelButton: "bg-bb-sky text-bb-ink font-semibold",
          closeButton:
            "border border-bb-border bg-bb-surface text-bb-muted hover:bg-bb-sky hover:text-bb-ink",
          success: "!border-bb-success/25 !bg-bb-success-bg",
          error: "!border-bb-danger/25 !bg-bb-danger-bg",
          info: "!border-bb-blue/20 !bg-bb-sky",
          warning: "!border-amber-500/25 !bg-amber-50",
        },
      }}
    />
  );
}
