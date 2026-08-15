import { create } from "zustand";
import type { PlayerGameView, PublicUnoRoom, UnoSnapshot } from "../types/game.types";
import type { UnoPendingInvite, UnoStoreState } from "./unoTypes";

function shouldApply(local: number, incoming?: number) {
  if (incoming == null) return true;
  return incoming >= local;
}

export const useUnoStore = create<
  UnoStoreState & {
    setMyUserId: (id: string | null) => void;
    setOverlayOpen: (open: boolean) => void;
    setPickerOpen: (open: boolean) => void;
    setBusy: (busy: boolean) => void;
    setPendingInvite: (invite: UnoPendingInvite | null) => void;
    applyRoom: (room: PublicUnoRoom) => void;
    applyGame: (game: PlayerGameView, sequence?: number) => void;
    applySnapshot: (snapshot: UnoSnapshot) => void;
    setError: (error: { code: string; message: string } | null) => void;
    resetSession: () => void;
  }
>((set) => ({
  overlayOpen: false,
  pickerOpen: false,
  room: null,
  game: null,
  sequence: 0,
  myUserId: null,
  pendingInvite: null,
  lastError: null,
  busy: false,

  setMyUserId: (id) => set({ myUserId: id }),
  setOverlayOpen: (open) =>
    set(open ? { overlayOpen: true, pickerOpen: false } : { overlayOpen: false }),
  setPickerOpen: (open) => set({ pickerOpen: open }),
  setBusy: (busy) => set({ busy }),
  setPendingInvite: (invite) => set({ pendingInvite: invite }),
  setError: (error) => set({ lastError: error }),

  applyRoom: (room) =>
    set((state) => ({
      room,
      overlayOpen: true,
      pendingInvite:
        state.pendingInvite?.room.id === room.id ? null : state.pendingInvite,
    })),

  applyGame: (game, sequence) =>
    set((state) => {
      const nextSeq = sequence ?? game.sequence;
      if (!shouldApply(state.sequence, nextSeq)) return state;
      return { game, sequence: nextSeq, overlayOpen: true };
    }),

  applySnapshot: (snapshot) =>
    set({
      room: snapshot.room,
      game: snapshot.game,
      sequence: snapshot.sequence,
      overlayOpen: true,
      lastError: null,
    }),

  resetSession: () =>
    set({
      overlayOpen: false,
      pickerOpen: false,
      room: null,
      game: null,
      sequence: 0,
      lastError: null,
      busy: false,
    }),
}));
