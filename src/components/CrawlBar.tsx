"use client";

import { Crawl } from "@/lib/types";
import { getCrawlColor } from "@/lib/crawlColors";
import { useTheme } from "@/context/ThemeContext";

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
  onAccountClick: () => void;
  onSharingClick: () => void;
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

export default function CrawlBar({
  activeCrawl,
  onStartClick,
  onEndClick,
  onHistoryClick,
  onStopsClick,
  onAccountClick,
  onSharingClick,
  view,
  onViewChange,
}: CrawlBarProps) {
  const { hud, toggleHud } = useTheme();

  return (
    <div className="z-[900] bg-zinc-900 px-4 pt-[env(safe-area-inset-top)] pb-3 text-zinc-50">
      <div className="flex items-center justify-between pt-3">
        <span className="text-base font-semibold leading-tight">
          🍺 Munich Bar Crawl
        </span>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={onSharingClick}
            aria-label="Location sharing"
            className="rounded-md bg-zinc-800 px-2 py-1.5 text-sm text-zinc-300"
          >
            📡
          </button>
          <button
            onClick={onAccountClick}
            aria-label="Account"
            className="rounded-md bg-zinc-800 px-2 py-1.5 text-sm text-zinc-300"
          >
            👤
          </button>
          <button
            onClick={toggleHud}
            aria-label="Toggle HUD display"
            aria-pressed={hud}
            className={`rounded-md px-2 py-1.5 text-sm ${
              hud ? "bg-zinc-600" : "bg-zinc-800 text-zinc-300"
            }`}
          >
            ✈️
          </button>
          <div className="flex rounded-lg bg-zinc-800 p-0.5 text-xs font-medium">
            <button
              onClick={() => onViewChange("map")}
              className={`rounded-md px-3 py-1.5 ${
                view === "map" ? "bg-zinc-600" : "text-zinc-300"
              }`}
            >
              Map
            </button>
            <button
              onClick={() => onViewChange("list")}
              className={`rounded-md px-3 py-1.5 ${
                view === "list" ? "bg-zinc-600" : "text-zinc-300"
              }`}
            >
              List
            </button>
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        {activeCrawl ? (
          <span className="flex min-w-0 items-center gap-1.5 truncate text-xs text-zinc-300">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: getCrawlColor(activeCrawl) }}
            />
            {activeCrawl.name} · started {formatTime(activeCrawl.startedAt)} ·{" "}
            {activeCrawl.stops.length} stop
            {activeCrawl.stops.length === 1 ? "" : "s"}
          </span>
        ) : (
          <span className="text-xs text-zinc-400">No active crawl</span>
        )}
        <div className="flex shrink-0 gap-2">
          {activeCrawl ? (
            <>
              <button
                onClick={onStopsClick}
                className="rounded-lg bg-zinc-700 px-3 py-2 text-xs font-medium active:bg-zinc-600"
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
            className="rounded-lg bg-zinc-700 px-3 py-2 text-xs font-medium active:bg-zinc-600"
          >
            History
          </button>
        </div>
      </div>
    </div>
  );
}
