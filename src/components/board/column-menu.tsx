"use client";

import { ArrowLeft, MoreHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { BoardColumn, BoardSummary } from "@/lib/projects";

export type ColumnMenuView =
  | "root"
  | "copy"
  | "move"
  | "move-cards"
  | "sort";

type Props = {
  column: BoardColumn;
  columns: BoardColumn[];
  boards: BoardSummary[];
  onClose: () => void;
  onAddCard: () => void;
  onCopy: (name: string) => Promise<void>;
  onMove: (boardId: string, position: number) => Promise<void>;
  onMoveCards: (destinationColumnId: string) => Promise<void>;
  onSort: (sortBy: "created_desc" | "created_asc" | "name_asc") => Promise<void>;
  onArchive: () => Promise<void>;
};

export function ColumnMenu({
  column,
  columns,
  boards,
  onClose,
  onAddCard,
  onCopy,
  onMove,
  onMoveCards,
  onSort,
  onArchive,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<ColumnMenuView>("root");
  const [copyName, setCopyName] = useState(`${column.name} (copy)`);
  const [moveBoardId, setMoveBoardId] = useState(column.boardId || boards[0]?.id || "");
  const [movePosition, setMovePosition] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [onClose]);

  const title =
    view === "root"
      ? "List actions"
      : view === "copy"
        ? "Copy list"
        : view === "move"
          ? "Move list"
          : view === "move-cards"
            ? "Move all cards"
            : "Sort list";

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      ref={ref}
      className="absolute right-0 top-9 z-30 w-72 overflow-hidden rounded-xl border border-bb-border bg-white shadow-bb-lg"
    >
      <div className="flex items-center gap-1 border-b border-bb-border px-2 py-2">
        {view !== "root" ? (
          <button
            type="button"
            className="rounded-lg p-1.5 text-bb-muted hover:bg-bb-sky"
            onClick={() => setView("root")}
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        ) : (
          <span className="w-7" />
        )}
        <p className="flex-1 text-center text-sm font-bold text-bb-ink">{title}</p>
        <button
          type="button"
          className="rounded-lg p-1.5 text-bb-muted hover:bg-bb-sky"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="max-h-80 overflow-y-auto p-2">
        {view === "root" ? (
          <ul className="space-y-0.5 text-sm">
            <MenuItem
              onClick={() => {
                onAddCard();
                onClose();
              }}
            >
              Add card
            </MenuItem>
            <MenuItem onClick={() => setView("copy")}>Copy list…</MenuItem>
            <MenuItem onClick={() => setView("move")}>Move list…</MenuItem>
            <MenuItem onClick={() => setView("move-cards")}>
              Move all cards in this list…
            </MenuItem>
            <MenuItem onClick={() => setView("sort")}>Sort by…</MenuItem>
            <div className="my-2 border-t border-bb-border" />
            <MenuItem
              danger
              disabled={column.isDefault || busy}
              onClick={() => void run(onArchive)}
            >
              Archive this list
            </MenuItem>
          </ul>
        ) : null}

        {view === "copy" ? (
          <form
            className="space-y-3 p-1"
            onSubmit={(e) => {
              e.preventDefault();
              void run(() => onCopy(copyName.trim()));
            }}
          >
            <label className="block text-xs font-semibold text-bb-muted">
              Name
              <Input
                className="mt-1"
                value={copyName}
                onChange={(e) => setCopyName(e.target.value)}
                required
                minLength={2}
                autoFocus
              />
            </label>
            <Button type="submit" size="sm" disabled={busy || copyName.trim().length < 2}>
              {busy ? "Copying..." : "Create list"}
            </Button>
          </form>
        ) : null}

        {view === "move" ? (
          <form
            className="space-y-3 p-1"
            onSubmit={(e) => {
              e.preventDefault();
              void run(() => onMove(moveBoardId, movePosition));
            }}
          >
            <label className="block text-xs font-semibold text-bb-muted">
              Board
              <select
                className="mt-1 h-10 w-full rounded-[10px] border border-bb-border bg-white px-2 text-sm"
                value={moveBoardId}
                onChange={(e) => {
                  setMoveBoardId(e.target.value);
                  setMovePosition(0);
                }}
              >
                {boards.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold text-bb-muted">
              Position
              <select
                className="mt-1 h-10 w-full rounded-[10px] border border-bb-border bg-white px-2 text-sm"
                value={movePosition}
                onChange={(e) => setMovePosition(Number(e.target.value))}
              >
                {Array.from(
                  {
                    length:
                      (boards.find((b) => b.id === moveBoardId)?.columnsCount ??
                        columns.length) + (moveBoardId === column.boardId ? 0 : 1),
                  },
                  (_, i) => i,
                ).map((i) => (
                  <option key={i} value={i}>
                    {i + 1}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit" size="sm" disabled={busy || !moveBoardId}>
              {busy ? "Moving..." : "Move list"}
            </Button>
          </form>
        ) : null}

        {view === "move-cards" ? (
          <ul className="space-y-0.5 text-sm">
            {columns
              .filter((c) => c.id !== column.id)
              .map((c) => (
                <MenuItem
                  key={c.id}
                  disabled={busy}
                  onClick={() => void run(() => onMoveCards(c.id))}
                >
                  {c.name}
                </MenuItem>
              ))}
            {columns.filter((c) => c.id !== column.id).length === 0 ? (
              <p className="px-2 py-3 text-xs text-bb-muted">No other lists</p>
            ) : null}
          </ul>
        ) : null}

        {view === "sort" ? (
          <ul className="space-y-0.5 text-sm">
            <MenuItem
              disabled={busy}
              onClick={() => void run(() => onSort("created_desc"))}
            >
              Date created (newest first)
            </MenuItem>
            <MenuItem
              disabled={busy}
              onClick={() => void run(() => onSort("created_asc"))}
            >
              Date created (oldest first)
            </MenuItem>
            <MenuItem
              disabled={busy}
              onClick={() => void run(() => onSort("name_asc"))}
            >
              Card name (alphabetically)
            </MenuItem>
          </ul>
        ) : null}
      </div>
    </div>
  );
}

function MenuItem({
  children,
  onClick,
  danger,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <li>
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={`w-full rounded-lg px-3 py-2 text-left font-medium transition hover:bg-bb-sky disabled:opacity-40 ${
          danger ? "text-red-700 hover:bg-red-50" : "text-bb-ink"
        }`}
      >
        {children}
      </button>
    </li>
  );
}

export function ColumnMenuTrigger({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md p-1 text-bb-muted hover:bg-black/5 hover:text-bb-ink"
      aria-label="List actions"
    >
      <MoreHorizontal className="h-4 w-4" />
    </button>
  );
}
