"use client";

import { create } from "zustand";

export type ConfirmTone = "default" | "danger";

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
};

type ConfirmRequest = ConfirmOptions & {
  id: number;
  resolve: (value: boolean) => void;
};

type ConfirmState = {
  request: ConfirmRequest | null;
  open: (options: ConfirmOptions) => Promise<boolean>;
  resolve: (value: boolean) => void;
};

let nextId = 1;

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  request: null,

  open: (options) =>
    new Promise<boolean>((resolve) => {
      const current = get().request;
      if (current) current.resolve(false);

      set({
        request: {
          id: nextId++,
          title: options.title,
          description: options.description,
          confirmLabel: options.confirmLabel ?? "Confirm",
          cancelLabel: options.cancelLabel ?? "Cancel",
          tone: options.tone ?? "default",
          resolve,
        },
      });
    }),

  resolve: (value) => {
    const current = get().request;
    if (!current) return;
    current.resolve(value);
    set({ request: null });
  },
}));

/** Promise-based confirm dialog. Returns true when the user confirms. */
export function confirm(options: ConfirmOptions): Promise<boolean> {
  return useConfirmStore.getState().open(options);
}
