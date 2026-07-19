"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  animateBoardEnter,
  consumeBoardSwitchPending,
  peekBoardSwitchPending,
  runBoardSwitchTransition,
} from "@/lib/board-transition";

gsap.registerPlugin(useGSAP);

export type BoardCanvasHandle = {
  switchTo: (boardId: string, navigate: (id: string) => void) => Promise<void>;
  getElement: () => HTMLDivElement | null;
};

type Props = {
  boardId: string;
  children: ReactNode;
  className?: string;
};

export const BoardCanvasTransition = forwardRef<BoardCanvasHandle, Props>(
  function BoardCanvasTransition({ boardId, children, className = "" }, ref) {
    const canvasRef = useRef<HTMLDivElement>(null);
    const switchingRef = useRef(false);
    const [fromSwitch] = useState(() => {
      if (typeof window === "undefined") return false;
      return peekBoardSwitchPending();
    });

    useImperativeHandle(ref, () => ({
      getElement: () => canvasRef.current,
      switchTo: async (nextId, navigate) => {
        if (switchingRef.current || nextId === boardId) return;
        switchingRef.current = true;
        try {
          await runBoardSwitchTransition({
            sourceEl: canvasRef.current,
            navigate: () => navigate(nextId),
          });
        } finally {
          switchingRef.current = false;
        }
      },
    }));

    useGSAP(
      () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Keep the flag until enter completes so React Strict Mode remount
        // still gets the incoming animation.
        if (!peekBoardSwitchPending()) {
          gsap.set(canvas, { clearProps: "all" });
          return;
        }

        const columns = Array.from(
          canvas.querySelectorAll<HTMLElement>("[data-board-column='true']"),
        );
        void animateBoardEnter(canvas, columns).finally(() => {
          consumeBoardSwitchPending();
        });
      },
      { dependencies: [boardId], scope: canvasRef },
    );

    return (
      <div
        ref={canvasRef}
        className={`will-change-transform ${className}`}
        data-board-canvas="true"
        style={fromSwitch ? { opacity: 0 } : undefined}
      >
        {children}
      </div>
    );
  },
);
