export type PlayerStatus =
  | "WAITING"
  | "READY"
  | "PLAYING"
  | "FINISHED"
  | "SPECTATING";

export type ConnectionStatus =
  | "CONNECTED"
  | "DISCONNECTED"
  | "RECONNECTING"
  | "LEFT"
  | "REMOVED";

export type ChessColor = "WHITE" | "BLACK";

export type PublicChessPlayer = {
  playerId: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  isHost: boolean;
  isSpectator: boolean;
  isReady: boolean;
  status: PlayerStatus;
  connectionStatus: ConnectionStatus;
  color: ChessColor | null;
  joinedAt: string;
};
