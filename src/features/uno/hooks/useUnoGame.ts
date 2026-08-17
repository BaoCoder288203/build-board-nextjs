"use client";

import { useCallback } from "react";
import { toastFromError, toastSuccess } from "@/lib/toast";
import { createUnoRoom, inviteUnoPlayers, joinUnoRoom } from "../services/unoApi";
import { unoActions } from "./useUnoActions";
import { useUnoStore } from "../store/unoStore";
import { isUnoHost, myUnoPlayer } from "../utils/playerUtils";
import { roomPhase, shouldShowPass } from "../utils/gameUtils";
import { useUnoConnection } from "./useUnoConnection";
import { useUnoReconnect } from "./useUnoReconnect";
import { clearUnoFx } from "../motion/unoFxBus";

export function useUnoGame(userId: string | null) {
  useUnoConnection(userId);
  const overlayOpen = useUnoStore((s) => s.overlayOpen);
  const pickerOpen = useUnoStore((s) => s.pickerOpen);
  const room = useUnoStore((s) => s.room);
  const game = useUnoStore((s) => s.game);
  const pendingInvite = useUnoStore((s) => s.pendingInvite);
  const lastError = useUnoStore((s) => s.lastError);
  const busy = useUnoStore((s) => s.busy);
  const setBusy = useUnoStore((s) => s.setBusy);
  const setPickerOpen = useUnoStore((s) => s.setPickerOpen);
  const setPendingInvite = useUnoStore((s) => s.setPendingInvite);
  const applyRoom = useUnoStore((s) => s.applyRoom);
  const resetSession = useUnoStore((s) => s.resetSession);

  useUnoReconnect(overlayOpen && Boolean(room));

  const me = myUnoPlayer(room, userId);
  const host = isUnoHost(room, userId);
  const phase = roomPhase(room, game);

  const openPicker = useCallback(() => setPickerOpen(true), [setPickerOpen]);

  const startFromMeeting = useCallback(
    async (meetingId: string) => {
      setBusy(true);
      try {
        const created = await createUnoRoom({
          contextType: "MEETING",
          meetingId,
          maxPlayers: 6,
        });
        applyRoom(created);
        await unoActions.joinSocket(created.id);
      } catch (error) {
        toastFromError(error, "Could not start UNO");
      } finally {
        setBusy(false);
      }
    },
    [applyRoom, setBusy],
  );

  const acceptInvite = useCallback(async () => {
    if (!pendingInvite) return;
    setBusy(true);
    try {
      const joined = await joinUnoRoom(pendingInvite.room.id);
      applyRoom(joined.room);
      await unoActions.joinSocket(joined.room.id);
      setPendingInvite(null);
    } catch (error) {
      toastFromError(error, "Could not join UNO");
    } finally {
      setBusy(false);
    }
  }, [applyRoom, pendingInvite, setBusy, setPendingInvite]);

  const inviteUsers = useCallback(
    async (userIds: string[]) => {
      if (!room || userIds.length === 0) return;
      setBusy(true);
      try {
        await inviteUnoPlayers(room.id, userIds);
        toastSuccess("Invite sent");
      } catch (error) {
        toastFromError(error, "Could not invite players");
      } finally {
        setBusy(false);
      }
    },
    [room, setBusy],
  );

  const leaveGame = useCallback(async () => {
    try {
      if (room) {
        await unoActions.leave();
      }
    } finally {
      clearUnoFx();
      resetSession();
    }
  }, [resetSession, room]);

  return {
    overlayOpen,
    pickerOpen,
    setPickerOpen,
    openPicker,
    room,
    game,
    me,
    host,
    phase,
    pendingInvite,
    lastError,
    busy,
    showPass: shouldShowPass(game, me?.playerId ?? null),
    startFromMeeting,
    acceptInvite,
    dismissInvite: () => setPendingInvite(null),
    inviteUsers,
    leaveGame,
    actions: unoActions,
  };
}
