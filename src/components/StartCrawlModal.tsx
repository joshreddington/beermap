"use client";

import { useState } from "react";

interface StartCrawlModalProps {
  onStart: (name: string) => void;
  onCancel: () => void;
}

export default function StartCrawlModal({
  onStart,
  onCancel,
}: StartCrawlModalProps) {
  const [name, setName] = useState("");

  return (
    <div className="fixed inset-0 z-[1100] flex items-end justify-center bg-black/50 sm:items-center">
      <div className="w-full max-w-sm rounded-t-2xl bg-white p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] sm:rounded-2xl">
        <h2 className="text-lg font-semibold text-neutral-900">
          Start a New Bar Crawl
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Give it a name, then tap beer houses on the map to log arrivals and
          departures.
        </p>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Friday Night Crawl"
          className="mt-4 w-full rounded-xl border border-neutral-300 px-3 py-2 text-base text-neutral-900"
        />
        <div className="mt-4 flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl bg-neutral-100 py-3 font-medium text-neutral-700"
          >
            Cancel
          </button>
          <button
            onClick={() => onStart(name || "Bar Crawl")}
            className="flex-1 rounded-xl bg-amber-600 py-3 font-medium text-white active:bg-amber-700"
          >
            Start
          </button>
        </div>
      </div>
    </div>
  );
}
