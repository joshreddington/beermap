"use client";

import { useState } from "react";
import { BeerHouse, Crawl } from "@/lib/types";
import SwipeToDelete from "./SwipeToDelete";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const CURRENT_YEAR = new Date().getFullYear();

interface LocationPanelProps {
  location: BeerHouse;
  activeCrawl: Crawl | null;
  onLogArrival: () => void;
  onLogDeparture: () => void;
  onClose: () => void;
  onStartCrawl: () => void;
  onDeleteStop: (stopId: string) => void;
  isCustom?: boolean;
  onDeleteLocation?: () => void;
  visitedYear?: number | null;
  onSetVisitedYear?: (year: number) => void;
  onClearVisitedYear?: () => void;
}

export default function LocationPanel({
  location,
  activeCrawl,
  onLogArrival,
  onLogDeparture,
  onClose,
  onStartCrawl,
  onDeleteStop,
  isCustom = false,
  onDeleteLocation,
  visitedYear = null,
  onSetVisitedYear,
  onClearVisitedYear,
}: LocationPanelProps) {
  const stopsHere =
    activeCrawl?.stops.filter((s) => s.locationId === location.id) ?? [];
  const openStop = stopsHere.find((s) => s.departedAt === null);
  const [editingYear, setEditingYear] = useState(false);
  const [yearInput, setYearInput] = useState(
    visitedYear ? String(visitedYear) : ""
  );

  function submitYear() {
    const year = parseInt(yearInput, 10);
    if (Number.isInteger(year) && year >= 1900 && year <= CURRENT_YEAR) {
      onSetVisitedYear?.(year);
      setEditingYear(false);
    }
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[1000] rounded-t-2xl bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.15)] pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-lg px-5 pt-3 pb-5">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-neutral-300" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">
              {isCustom && "📍 "}
              {location.name}
            </h2>
            <p className="text-sm text-neutral-500">{location.address}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-full bg-neutral-100 px-3 py-1 text-sm text-neutral-600"
          >
            ✕
          </button>
        </div>

        {location.description && (
          <p className="mt-3 text-sm text-neutral-700">{location.description}</p>
        )}

        {onSetVisitedYear && (
          <div className="mt-2 text-sm text-neutral-600">
            {editingYear ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  type="number"
                  inputMode="numeric"
                  min={1900}
                  max={CURRENT_YEAR}
                  value={yearInput}
                  onChange={(e) => setYearInput(e.target.value)}
                  placeholder={String(CURRENT_YEAR)}
                  className="w-24 rounded-lg border border-neutral-300 px-2 py-1 text-sm text-neutral-900"
                />
                <button
                  onClick={submitYear}
                  className="rounded-lg bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingYear(false)}
                  className="rounded-lg px-2 py-1 text-xs text-neutral-400"
                >
                  Cancel
                </button>
              </div>
            ) : visitedYear ? (
              <button
                onClick={() => {
                  setYearInput(String(visitedYear));
                  setEditingYear(true);
                }}
                className="flex items-center gap-1"
              >
                🗓️ First visited {visitedYear}
                {onClearVisitedYear && (
                  <span
                    role="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClearVisitedYear();
                    }}
                    className="ml-1 text-xs text-neutral-400"
                  >
                    ✕
                  </span>
                )}
              </button>
            ) : (
              <button
                onClick={() => setEditingYear(true)}
                className="text-xs text-neutral-400 underline decoration-dotted"
              >
                + Add first visited year
              </button>
            )}
          </div>
        )}

        {stopsHere.length > 0 && (
          <ul className="mt-3 space-y-2 text-sm text-neutral-600">
            {stopsHere.map((s) => (
              <li key={s.id}>
                <SwipeToDelete onDelete={() => onDeleteStop(s.id)}>
                  <div className="px-1 py-1.5">
                    <div>
                      🍺 Arrived {formatTime(s.arrivedAt)}
                      {s.departedAt ? ` · Left ${formatTime(s.departedAt)}` : " · still here"}
                    </div>
                    {s.challenge && (
                      <div className="mt-0.5 text-xs text-neutral-500">
                        🎯 {s.challenge}
                      </div>
                    )}
                  </div>
                </SwipeToDelete>
              </li>
            ))}
          </ul>
        )}
        {stopsHere.length > 0 && (
          <p className="mt-1 text-xs text-neutral-400">Swipe a visit left to delete it.</p>
        )}

        <div className="mt-4 space-y-2">
          {!activeCrawl && (
            <button
              onClick={onStartCrawl}
              className="w-full rounded-xl bg-amber-600 py-3 font-medium text-white active:bg-amber-700"
            >
              Start a Bar Crawl to Log a Visit
            </button>
          )}
          {activeCrawl && !openStop && (
            <button
              onClick={onLogArrival}
              className="w-full rounded-xl bg-green-600 py-3 font-medium text-white active:bg-green-700"
            >
              Log Arrival
            </button>
          )}
          {activeCrawl && openStop && (
            <button
              onClick={onLogDeparture}
              className="w-full rounded-xl bg-red-600 py-3 font-medium text-white active:bg-red-700"
            >
              Log Departure
            </button>
          )}
          {isCustom && onDeleteLocation && (
            <button
              onClick={onDeleteLocation}
              className="w-full rounded-xl bg-neutral-100 py-2.5 text-sm font-medium text-neutral-700"
            >
              Delete This Stop
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
