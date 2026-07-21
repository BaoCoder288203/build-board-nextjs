"use client";

import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

export function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="bb-animate-fade-in absolute inset-0 bg-bb-ink/40"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bb-modal-title"
        className="bb-animate-fade-up relative z-10 w-full max-w-md rounded-[12px] border border-bb-border/80 bg-bb-surface p-6 shadow-bb-lg"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 id="bb-modal-title" className="text-lg font-bold text-bb-ink">
            {title}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close"
            className="px-2.5"
          >
            <X className="h-4 w-4" strokeWidth={2} aria-hidden />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
