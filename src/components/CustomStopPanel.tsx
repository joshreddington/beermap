"use client";

import { CrawlStop } from "@/lib/types";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface CustomStopPanelProps {
  stop: CrawlStop;
  onClose: () => void;
  onLogDeparture: () => void;
  onDelete: () => void;
}

export default function CustomStopPanel({
  stop,
  onClose,
  onLogDeparture,
  onDelete,
}: CustomStopPanelProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-[1000] rounded-t-2xl bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.15)] pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-lg px-5 pt-3 pb-5">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-neutral-300" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">
              📍 {stop.customName ?? "Custom stop"}
            </h2>
            <p className="text-sm text-neutral-500">Manually added stop</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-full bg-neutral-100 px-3 py-1 text-sm text-neutral-600"
          >
            ✕
          </button>
        </div>

        {stop.customDescription && (
          <p className="mt-3 text-sm text-neutral-700">{stop.customDescription}</p>
        )}

        <p className="mt-3 text-sm text-neutral-600">
          🍺 Arrived {formatTime(stop.arrivedAt)}
          {stop.departedAt ? ` · Left ${formatTime(stop.departedAt)}` : " · still here"}
        </p>

        <div className="mt-4 flex gap-2">
          {stop.departedAt === null && (
            <button
              onClick={onLogDeparture}
              className="flex-1 rounded-xl bg-red-600 py-3 font-medium text-white active:bg-red-700"
            >
              Log Departure
            </button>
          )}
          <button
            onClick={onDelete}
            className="flex-1 rounded-xl bg-neutral-100 py-3 font-medium text-neutral-700"
          >
            Delete Stop
          </button>
        </div>
      </div>
    </div>
  );
}
