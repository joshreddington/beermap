"use client";

import { Crawl, CustomLocation } from "@/lib/types";
import { stopLocationName } from "@/lib/stops";
import { getCrawlColor } from "@/lib/crawlColors";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface HistoryModalProps {
  crawls: Crawl[];
  customLocations: CustomLocation[];
  onClose: () => void;
  onDelete: (id: string) => void;
}

export default function HistoryModal({
  crawls,
  customLocations,
  onClose,
  onDelete,
}: HistoryModalProps) {
  return (
    <div className="fixed inset-0 z-[1100] bg-black/50">
      <div className="absolute inset-x-0 bottom-0 top-16 flex flex-col rounded-t-2xl bg-white">
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-neutral-900">
            Crawl History
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
          {crawls.length === 0 && (
            <p className="text-sm text-neutral-500">
              No crawls yet. Start one from the map screen.
            </p>
          )}
          <ul className="space-y-4">
            {crawls.map((crawl) => (
              <li
                key={crawl.id}
                className="rounded-xl border border-neutral-200 border-l-4 p-4"
                style={{ borderLeftColor: getCrawlColor(crawl) }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-neutral-900">
                      {crawl.name}
                    </h3>
                    <p className="text-xs text-neutral-500">
                      {formatDate(crawl.startedAt)} · {formatTime(crawl.startedAt)}
                      {crawl.endedAt ? ` – ${formatTime(crawl.endedAt)}` : " · in progress"}
                    </p>
                  </div>
                  <button
                    onClick={() => onDelete(crawl.id)}
                    className="shrink-0 rounded-lg bg-neutral-100 px-2 py-1 text-xs text-neutral-600"
                  >
                    Delete
                  </button>
                </div>
                {crawl.stops.length === 0 ? (
                  <p className="mt-2 text-sm text-neutral-400">No stops logged.</p>
                ) : (
                  <ol className="mt-2 space-y-1.5 text-sm text-neutral-700">
                    {crawl.stops.map((stop, i) => (
                      <li key={stop.id}>
                        <div className="flex justify-between gap-2">
                          <span className="truncate">
                            {i + 1}. {stopLocationName(stop, customLocations)}
                          </span>
                          <span className="shrink-0 text-neutral-500">
                            {formatTime(stop.arrivedAt)}
                            {stop.departedAt ? ` – ${formatTime(stop.departedAt)}` : " – still there"}
                          </span>
                        </div>
                        {stop.challenge && (
                          <div className="text-xs text-neutral-500">🎯 {stop.challenge}</div>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
