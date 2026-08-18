"use client";

import { useCallback } from "react";
import { toastFromError, toastSuccess } from "@/lib/toast";
import { CHESS_MVP } from "../constants/chess.constants";
import { createChessRoom, inviteChessPlayers, joinChessRoom } from "../services/chessApi";
import { chessActions } from "./useChessActions";
import { useChessStore } from "../store/chessStore";
import { isChessHost, myChessPlayer, roomPhase } from "../utils/playerUtils";
import { useChessConnection } from "./useChessConnection";
import { useChessReconnect } from "./useChessReconnect";

export function useChessGame(userId: string | null) {
  useChessConnection(userId);
  const overlayOpen = useChessStore((s) => s.overlayOpen);
  const room = useChessStore((s) => s.room);
  const game = useChessStore((s) => s.game);
  const pendingInvite = useChessStore((s) => s.pendingInvite);
  const lastError = useChessStore((s) => s.lastError);
  const busy = useChessStore((s) => s.busy);
  const setBusy = useChessStore((s) => s.setBusy);
  const setPendingInvite = useChessStore((s) => s.setPendingInvite);
  const applyRoom = useChessStore((s) => s.applyRoom);
  const resetSession = useChessStore((s) => s.resetSession);

  useChessReconnect(overlayOpen && Boolean(room));

  const me = myChessPlayer(room, userId);
  const host = isChessHost(room, userId);
  const phase = roomPhase(room, game?.status);

  const startFromMeeting = useCallback(
    async (meetingId: string) => {
      setBusy(true);
      try {
        const created = await createChessRoom({
          contextType: "MEETING",
          meetingId,
          maxPlayers: CHESS_MVP.maxPlayers,
        });
        applyRoom(created);
        await chessActions.joinSocket(created.id);
      } catch (error) {
        toastFromError(error, "Could not start Chess");
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
      const joined = await joinChessRoom(pendingInvite.room.id);
      applyRoom(joined.room);
      await chessActions.joinSocket(joined.room.id);
      setPendingInvite(null);
    } catch (error) {
      toastFromError(error, "Could not join Chess");
    } finally {
      setBusy(false);
    }
  }, [applyRoom, pendingInvite, setBusy, setPendingInvite]);

  const inviteUsers = useCallback(
    async (userIds: string[]) => {
      if (!room || userIds.length === 0) return;
      setBusy(true);
      try {
        await inviteChessPlayers(room.id, userIds);
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
        await chessActions.leave();
      }
    } finally {
      resetSession();
    }
  }, [resetSession, room]);

  return {
    overlayOpen,
    room,
    game,
    me,
    host,
    phase,
    pendingInvite,
    lastError,
    busy,
    startFromMeeting,
    acceptInvite,
    dismissInvite: () => setPendingInvite(null),
    inviteUsers,
    leaveGame,
    actions: chessActions,
  };
}
