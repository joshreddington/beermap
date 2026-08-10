"use client";

import { useState } from "react";
import { toLocalInputValue, fromLocalInputValue } from "@/lib/datetime";

interface AddStopFormProps {
  coords: [number, number];
  hasActiveCrawl: boolean;
  onAdd: (
    name: string,
    description: string,
    lat: number,
    lng: number,
    arrivedAt: string | null,
    departedAt: string | null
  ) => void;
  onCancel: () => void;
}

export default function AddStopForm({
  coords,
  hasActiveCrawl,
  onAdd,
  onCancel,
}: AddStopFormProps) {
  const now = toLocalInputValue(new Date().toISOString());
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [arrival, setArrival] = useState(now);
  const [hasLeft, setHasLeft] = useState(false);
  const [departure, setDeparture] = useState(now);

  function submit() {
    if (!name.trim()) return;
    onAdd(
      name,
      description,
      coords[0],
      coords[1],
      hasActiveCrawl ? fromLocalInputValue(arrival) : null,
      hasActiveCrawl && hasLeft ? fromLocalInputValue(departure) : null
    );
  }

  return (
    <div className="fixed inset-0 z-[1200] flex items-end justify-center bg-black/50 sm:items-center">
      <div className="w-full max-w-sm rounded-t-2xl bg-white p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] sm:rounded-2xl">
        <h2 className="text-lg font-semibold text-neutral-900">
          {hasActiveCrawl ? "Add This Stop" : "Save This Stop"}
        </h2>
        <p className="mt-1 text-xs text-neutral-500">
          📍 Pinned at {coords[0].toFixed(4)}, {coords[1].toFixed(4)}
        </p>
        {!hasActiveCrawl && (
          <p className="mt-1 text-xs text-neutral-500">
            Saved as a permanent stop you can visit on any future crawl.
          </p>
        )}

        <label className="mt-3 block text-xs font-medium text-neutral-500">
          Place name
        </label>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Some random Kneipe"
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-base text-neutral-900"
        />

        <label className="mt-3 block text-xs font-medium text-neutral-500">
          Description (optional)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What's this place like?"
          rows={2}
          className="mt-1 w-full resize-none rounded-lg border border-neutral-300 px-3 py-2 text-base text-neutral-900"
        />

        {hasActiveCrawl && (
          <>
            <label className="mt-3 block text-xs font-medium text-neutral-500">
              Arrived at
            </label>
            <input
              type="datetime-local"
              value={arrival}
              onChange={(e) => setArrival(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-base text-neutral-900"
            />

            <label className="mt-3 flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={hasLeft}
                onChange={(e) => setHasLeft(e.target.checked)}
              />
              Already left
            </label>

            {hasLeft && (
              <>
                <label className="mt-2 block text-xs font-medium text-neutral-500">
                  Departed at
                </label>
                <input
                  type="datetime-local"
                  value={departure}
                  onChange={(e) => setDeparture(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-base text-neutral-900"
                />
              </>
            )}
          </>
        )}

        <div className="mt-4 flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl bg-neutral-100 py-2.5 font-medium text-neutral-700"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!name.trim()}
            className="flex-1 rounded-xl bg-amber-600 py-2.5 font-medium text-white active:bg-amber-700 disabled:opacity-50"
          >
            {hasActiveCrawl ? "Add Stop" : "Save Stop"}
          </button>
        </div>
      </div>
    </div>
  );
}
