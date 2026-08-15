import type { PlayerGameView, PublicUnoRoom } from "../types/game.types";

export type UnoPendingInvite = {
  room: PublicUnoRoom;
  invitedBy: string;
};

export type UnoStoreState = {
  overlayOpen: boolean;
  pickerOpen: boolean;
  room: PublicUnoRoom | null;
  game: PlayerGameView | null;
  sequence: number;
  myUserId: string | null;
  pendingInvite: UnoPendingInvite | null;
  lastError: { code: string; message: string } | null;
  busy: boolean;
};
