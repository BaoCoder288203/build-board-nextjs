export type BoardPaneId = "planner" | "board";

export type BoardPaneState = {
  planner: boolean;
  board: boolean;
};

export const DEFAULT_BOARD_PANES: BoardPaneState = {
  planner: false,
  board: true,
};

const STORAGE_KEY = "bb.board.panes.v2";

export function readBoardPanes(): BoardPaneState {
  if (typeof window === "undefined") return DEFAULT_BOARD_PANES;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_BOARD_PANES;
    const parsed = JSON.parse(raw) as Partial<BoardPaneState>;
    const planner = Boolean(parsed.planner);
    const board = Boolean(parsed.board);
    if (!planner && !board) return DEFAULT_BOARD_PANES;
    return { planner, board };
  } catch {
    return DEFAULT_BOARD_PANES;
  }
}

export function writeBoardPanes(state: BoardPaneState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
}

export function toggleBoardPane(state: BoardPaneState, pane: BoardPaneId): BoardPaneState {
  const next = { ...state, [pane]: !state[pane] };
  if (!next.planner && !next.board) return state;
  return next;
}
