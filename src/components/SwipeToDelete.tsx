"use client";

import { useRef, useState, ReactNode } from "react";

const REVEAL_WIDTH = 84;

interface SwipeToDeleteProps {
  onDelete: () => void;
  children: ReactNode;
}

export default function SwipeToDelete({ onDelete, children }: SwipeToDeleteProps) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragState = useRef<{ startX: number; startOffset: number } | null>(null);
  const didDrag = useRef(false);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    dragState.current = { startX: e.clientX, startOffset: offset };
    didDrag.current = false;
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragState.current) return;
    const delta = e.clientX - dragState.current.startX;
    if (Math.abs(delta) > 5) didDrag.current = true;
    const next = Math.min(0, Math.max(-REVEAL_WIDTH, dragState.current.startOffset + delta));
    setOffset(next);
  }

  function settle() {
    dragState.current = null;
    setDragging(false);
    setOffset((current) => (current < -REVEAL_WIDTH / 2 ? -REVEAL_WIDTH : 0));
  }

  function handleContentClick() {
    // A drag ending in a mouse/touch "up" still fires a trailing click; ignore
    // that one so it doesn't immediately re-close the reveal it just opened.
    if (didDrag.current) {
      didDrag.current = false;
      return;
    }
    if (offset < 0) setOffset(0);
  }

  return (
    <div className="relative overflow-hidden rounded-xl">
      <div
        className="absolute inset-y-0 right-0 flex items-stretch"
        style={{ width: REVEAL_WIDTH }}
      >
        <button
          onClick={() => {
            setOffset(0);
            onDelete();
          }}
          className="flex-1 bg-red-600 text-sm font-medium text-white"
        >
          Delete
        </button>
      </div>
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={settle}
        onPointerCancel={settle}
        onClick={handleContentClick}
        style={{
          transform: `translateX(${offset}px)`,
          transition: dragging ? "none" : "transform 200ms ease",
          touchAction: "pan-y",
        }}
        className="relative bg-white"
      >
        {children}
      </div>
    </div>
  );
}
