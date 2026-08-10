"use client";

import { Crawl } from "@/lib/types";
import { stopLocationName } from "@/lib/stops";
import SwipeToDelete from "./SwipeToDelete";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface StopsModalProps {
  crawl: Crawl;
  onClose: () => void;
  onDeleteStop: (stopId: string) => void;
}

export default function StopsModal({ crawl, onClose, onDeleteStop }: StopsModalProps) {
  return (
    <div className="fixed inset-0 z-[1100] bg-black/50">
      <div className="absolute inset-x-0 bottom-0 top-16 flex flex-col rounded-t-2xl bg-white">
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-neutral-900">
            {crawl.name} · Stops
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full bg-neutral-100 px-3 py-1 text-sm text-neutral-600"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          {crawl.stops.length === 0 ? (
            <p className="text-sm text-neutral-500">
              No stops logged yet. Tap a beer house on the map, or use the ➕ button to
              add one manually.
            </p>
          ) : (
            <>
              <ul className="space-y-2">
                {crawl.stops.map((s, i) => (
                  <li key={s.id}>
                    <SwipeToDelete onDelete={() => onDeleteStop(s.id)}>
                      <div className="flex items-center justify-between gap-2 px-1 py-2.5">
                        <span className="truncate text-sm text-neutral-800">
                          {i + 1}. {stopLocationName(s)}
                        </span>
                        <span className="shrink-0 text-xs text-neutral-500">
                          {formatTime(s.arrivedAt)}
                          {s.departedAt ? ` – ${formatTime(s.departedAt)}` : " – still there"}
                        </span>
                      </div>
                    </SwipeToDelete>
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-xs text-neutral-400">Swipe a stop left to delete it.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
