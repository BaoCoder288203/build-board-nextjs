"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useConfirmStore } from "@/lib/confirm";

export function ConfirmDialogProvider() {
  const request = useConfirmStore((s) => s.request);
  const resolve = useConfirmStore((s) => s.resolve);

  useEffect(() => {
    if (!request) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") resolve(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [request, resolve]);

  if (!request) return null;

  const isDanger = request.tone === "danger";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        type="button"
        className="bb-animate-fade-in absolute inset-0 bg-bb-ink/45"
        aria-label="Dismiss"
        onClick={() => resolve(false)}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="bb-confirm-title"
        aria-describedby={
          request.description ? "bb-confirm-description" : undefined
        }
        className="bb-animate-fade-up relative z-10 w-full max-w-md rounded-[12px] border border-bb-border/80 bg-bb-surface p-6 shadow-bb-lg"
      >
        <h2
          id="bb-confirm-title"
          className="text-lg font-bold text-bb-ink"
        >
          {request.title}
        </h2>
        {request.description ? (
          <p
            id="bb-confirm-description"
            className="mt-2 text-sm leading-relaxed text-bb-muted"
          >
            {request.description}
          </p>
        ) : null}
        <div className="mt-6 flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => resolve(false)}
          >
            {request.cancelLabel}
          </Button>
          <Button
            type="button"
            variant={isDanger ? "danger" : "primary"}
            size="sm"
            autoFocus
            onClick={() => resolve(true)}
          >
            {request.confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
