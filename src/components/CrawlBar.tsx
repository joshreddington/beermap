"use client";

import { Crawl } from "@/lib/types";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export type ViewMode = "map" | "list";

interface CrawlBarProps {
  activeCrawl: Crawl | null;
  onStartClick: () => void;
  onEndClick: () => void;
  onHistoryClick: () => void;
  onStopsClick: () => void;
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

export default function CrawlBar({
  activeCrawl,
  onStartClick,
  onEndClick,
  onHistoryClick,
  onStopsClick,
  view,
  onViewChange,
}: CrawlBarProps) {
  return (
    <div className="z-[900] bg-neutral-900 px-4 pt-[env(safe-area-inset-top)] pb-3 text-white">
      <div className="flex items-center justify-between pt-3">
        <span className="text-base font-semibold leading-tight">
          🍺 Munich Bar Crawl
        </span>
        <div className="flex shrink-0 rounded-lg bg-neutral-800 p-0.5 text-xs font-medium">
          <button
            onClick={() => onViewChange("map")}
            className={`rounded-md px-3 py-1.5 ${
              view === "map" ? "bg-neutral-600" : "text-neutral-300"
            }`}
          >
            Map
          </button>
          <button
            onClick={() => onViewChange("list")}
            className={`rounded-md px-3 py-1.5 ${
              view === "list" ? "bg-neutral-600" : "text-neutral-300"
            }`}
          >
            List
          </button>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        {activeCrawl ? (
          <span className="truncate text-xs text-neutral-300">
            {activeCrawl.name} · started {formatTime(activeCrawl.startedAt)} ·{" "}
            {activeCrawl.stops.length} stop
            {activeCrawl.stops.length === 1 ? "" : "s"}
          </span>
        ) : (
          <span className="text-xs text-neutral-400">No active crawl</span>
        )}
        <div className="flex shrink-0 gap-2">
          {activeCrawl ? (
            <>
              <button
                onClick={onStopsClick}
                className="rounded-lg bg-neutral-700 px-3 py-2 text-xs font-medium active:bg-neutral-600"
              >
                Stops
              </button>
              <button
                onClick={onEndClick}
                className="rounded-lg bg-red-600 px-3 py-2 text-xs font-medium active:bg-red-700"
              >
                End
              </button>
            </>
          ) : (
            <button
              onClick={onStartClick}
              className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-medium active:bg-amber-700"
            >
              New Crawl
            </button>
          )}
          <button
            onClick={onHistoryClick}
            className="rounded-lg bg-neutral-700 px-3 py-2 text-xs font-medium active:bg-neutral-600"
          >
            History
          </button>
        </div>
      </div>
    </div>
  );
}
