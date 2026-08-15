import type { PublicCard, UnoColor } from "./card.types";
import type { ConnectionStatus, PlayerStatus, PublicUnoPlayer } from "./player.types";

export type RoomStatus = "WAITING" | "READY" | "PLAYING" | "FINISHED" | "CLOSED";
export type UnoGameStatus =
  | "INITIALIZING"
  | "DEALING"
  | "PLAYING"
  | "WAITING_FOR_COLOR"
  | "WAITING_FOR_CHALLENGE"
  | "PAUSED"
  | "ROUND_FINISHED"
  | "FINISHED"
  | "ABORTED";
export type UnoDirection = "CLOCKWISE" | "COUNTER_CLOCKWISE";

export type GameRules = {
  targetScore: number;
  stacking: boolean;
  jumpIn: boolean;
  sevenZero: boolean;
  drawUntilPlayable: boolean;
  forcePlay: boolean;
  allowChallenge: boolean;
  challengePenalty: number;
  initialHandSize: number;
  autoStartNextRound: boolean;
  unoPenaltyDraw: number;
  turnTimerEnabled: boolean;
};

export type PublicUnoRoom = {
  id: string;
  status: RoomStatus;
  hostId: string;
  hostUserId: string;
  contextType: "MEETING" | "BOARD" | "WORKSPACE";
  meetingId: string | null;
  boardId: string | null;
  workspaceId: string;
  maxPlayers: number;
  allowSpectator: boolean;
  rules: GameRules;
  players: PublicUnoPlayer[];
  gameId: string | null;
  createdAt: string;
};

export type UnoWindow = {
  targetPlayerId: string;
  expiresAt: number;
  called: boolean;
};

export type UnoChallengeView = {
  kind: "WD4";
  challengerPlayerId: string;
  accusedPlayerId: string;
  expiresAt: number;
};

export type PlayerGameView = {
  gameId: string;
  status: UnoGameStatus;
  sequence: number;
  currentPlayerId: string | null;
  direction: UnoDirection;
  currentColor: UnoColor | null;
  topDiscard: PublicCard | null;
  drawCount: number;
  pendingDraw: number;
  myHand: PublicCard[];
  lastDrawnCardId: string | null;
  unoWindow: UnoWindow | null;
  colorChooserPlayerId: string | null;
  challenge: UnoChallengeView | null;
  players: Array<{
    playerId: string;
    userId: string;
    cardCount: number;
    calledUno: boolean;
    status: PlayerStatus;
    connectionStatus?: ConnectionStatus;
    seatIndex: number;
  }>;
  scores: Record<string, number>;
  turnDeadlineAt: string | null;
  winnerId?: string;
  endReason?: string;
  roundNumber: number;
  turnNumber: number;
};

export type UnoSnapshot = {
  sequence: number;
  serverTime: string;
  room: PublicUnoRoom;
  game: PlayerGameView | null;
};
