export const UNO_CLIENT_EVENT = {
  ROOM_JOIN: "uno:room:join",
  ROOM_LEAVE: "uno:room:leave",
  PLAYER_READY: "uno:player:ready",
  PLAYER_UNREADY: "uno:player:unready",
  GAME_START: "uno:game:start",
  CARD_PLAY: "uno:card:play",
  CARD_DRAW: "uno:card:draw",
  TURN_PASS: "uno:turn:pass",
  COLOR_SELECT: "uno:color:select",
  DECLARE: "uno:declare",
  CHALLENGE: "uno:challenge",
  SNAPSHOT_REQUEST: "uno:snapshot:request",
  REMATCH_REQUEST: "uno:rematch:request",
} as const;

export const UNO_SERVER_EVENT = {
  ROOM_UPDATED: "uno:room:updated",
  ROOM_INVITE: "uno:room:invite",
  PLAYER_JOINED: "uno:player:joined",
  PLAYER_LEFT: "uno:player:left",
  PLAYER_DISCONNECTED: "uno:player:disconnected",
  PLAYER_RECONNECTED: "uno:player:reconnected",
  GAME_STARTED: "uno:game:started",
  GAME_STATE: "uno:game:state",
  CARD_PLAYED: "uno:card:played",
  CARD_DRAWN: "uno:card:drawn",
  COLOR_SELECTED: "uno:color:selected",
  DECLARED: "uno:declared",
  CHALLENGED: "uno:challenged",
  TURN_CHANGED: "uno:turn:changed",
  TURN_TIMEOUT: "uno:turn:timeout",
  ROUND_ENDED: "uno:round:ended",
  GAME_ENDED: "uno:game:ended",
  SNAPSHOT: "uno:snapshot",
  ERROR: "uno:error",
} as const;

export const UNO_COLORS = ["RED", "YELLOW", "GREEN", "BLUE"] as const;

export const UNO_MVP = {
  minPlayers: 2,
  maxPlayers: 6,
  unoWindowMs: 2_000,
  wd4ChallengeWindowMs: 5_000,
} as const;

export const UNO_TABLE = {
  from: "#0F1B3C",
  to: "#241B4E",
} as const;

export const UNO_COLOR_THEME = {
  RED: { from: "#E8394B", to: "#C41E3A", ink: "#FFFFFF" },
  YELLOW: { from: "#FFC93C", to: "#F5A623", ink: "#1A1204" },
  GREEN: { from: "#3CB878", to: "#1E8F52", ink: "#FFFFFF" },
  BLUE: { from: "#3B82F6", to: "#1D4ED8", ink: "#FFFFFF" },
} as const;

export const UNO_WILD_GOLD = "#E8C547";

export const UNO_WILD_CONIC =
  "conic-gradient(#E8394B 0 90deg, #FFC93C 90deg 180deg, #3CB878 180deg 270deg, #3B82F6 270deg 360deg)";

export const UNO_OVAL_TILT = "rotate(18deg)";

export const UNO_CARD_SIZE = {
  hand: "h-[6.75rem] w-[4.5rem]",
  pile: "h-[7.15rem] w-[4.75rem]",
  opponent: "h-[3.5rem] w-[2.35rem]",
  fly: "h-[6.75rem] w-[4.5rem]",
} as const;

export const UNO_SFX_MUTE_KEY = "bb.uno.sfxMuted";
