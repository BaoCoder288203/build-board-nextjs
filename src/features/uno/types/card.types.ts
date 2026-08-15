export type UnoColor = "RED" | "YELLOW" | "GREEN" | "BLUE";
export type UnoCardType = "NUMBER" | "ACTION" | "WILD";
export type UnoNumberValue = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type UnoActionValue = "SKIP" | "REVERSE" | "DRAW_TWO";
export type UnoWildValue = "WILD" | "WILD_DRAW_FOUR";

export type PublicCard = {
  cardId: string;
  type: UnoCardType;
  color: UnoColor | null;
  value: string | number;
};
