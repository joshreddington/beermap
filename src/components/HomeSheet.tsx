"use client";

import { HomeLocation } from "@/context/HomeContext";
import { directionsHomeUrl } from "@/lib/navigation";

interface HomeSheetProps {
  home: HomeLocation;
  onClose: () => void;
  onChangeLocation: () => void;
  onRemove: () => void;
}

export default function HomeSheet({
  home,
  onClose,
  onChangeLocation,
  onRemove,
}: HomeSheetProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-[1000] rounded-t-2xl bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.15)] pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-lg px-5 pt-3 pb-5">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-neutral-300" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">🏠 Home</h2>
            <p className="text-sm text-neutral-500">
              {home.lat.toFixed(4)}, {home.lng.toFixed(4)}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-full bg-neutral-100 px-3 py-1 text-sm text-neutral-600"
          >
            ✕
          </button>
        </div>

        <a
          href={directionsHomeUrl(home.lat, home.lng)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 block w-full rounded-xl bg-blue-600 py-3 text-center font-medium text-white active:bg-blue-700"
        >
          Please Get Me Home
        </a>

        <div className="mt-2 flex gap-2">
          <button
            onClick={onChangeLocation}
            className="flex-1 rounded-xl bg-neutral-100 py-2.5 text-sm font-medium text-neutral-700"
          >
            Change Location
          </button>
          <button
            onClick={onRemove}
            className="flex-1 rounded-xl bg-neutral-100 py-2.5 text-sm font-medium text-red-600"
          >
            Remove Home
          </button>
        </div>
      </div>
    </div>
  );
}
