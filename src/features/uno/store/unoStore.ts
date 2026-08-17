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
    set((state) => {
      const backToLobby = room.status === "WAITING" || room.status === "READY";
      return {
        room,
        overlayOpen: true,
        game: backToLobby ? null : state.game,
        sequence: backToLobby ? 0 : state.sequence,
        pendingInvite:
          state.pendingInvite?.room.id === room.id ? null : state.pendingInvite,
      };
    }),

  applyGame: (game, sequence) =>
    set((state) => {
      if (state.room?.status === "WAITING" || state.room?.status === "READY") {
        return state;
      }
      const nextSeq = sequence ?? game.sequence;
      const sameGame = state.game?.gameId === game.gameId;
      if (sameGame && !shouldApply(state.sequence, nextSeq)) return state;
      return { game, sequence: nextSeq, overlayOpen: true };
    }),

  applySnapshot: (snapshot) =>
    set(() => {
      const backToLobby =
        snapshot.room.status === "WAITING" || snapshot.room.status === "READY";
      return {
        room: snapshot.room,
        game: backToLobby ? null : snapshot.game,
        sequence: backToLobby ? 0 : snapshot.sequence,
        overlayOpen: true,
        lastError: null,
      };
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
