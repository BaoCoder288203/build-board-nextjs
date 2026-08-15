import { useUnoStore } from "./unoStore";
import { myUnoPlayer, isUnoHost } from "../utils/playerUtils";
import { roomPhase } from "../utils/gameUtils";

export function selectMyPlayer() {
  const { room, myUserId } = useUnoStore.getState();
  return myUnoPlayer(room, myUserId);
}

export function selectIsHost() {
  const { room, myUserId } = useUnoStore.getState();
  return isUnoHost(room, myUserId);
}

export function selectPhase() {
  const { room, game } = useUnoStore.getState();
  return roomPhase(room, game);
}
