"use client";

import { BeerHouse } from "@/lib/types";
import type { LocationStatus } from "./BeerMap";

const STATUS_ORDER: Record<LocationStatus, number> = { open: 0, done: 1, none: 2 };

const STATUS_LABEL: Record<LocationStatus, string> = {
  open: "Currently here",
  done: "Visited",
  none: "Not visited",
};

const STATUS_DOT: Record<LocationStatus, string> = {
  open: "bg-green-600",
  done: "bg-neutral-500",
  none: "bg-amber-600",
};

interface BeerHouseListProps {
  locations: BeerHouse[];
  getStatus: (id: string) => LocationStatus;
  onSelect: (id: string) => void;
}

export default function BeerHouseList({
  locations,
  getStatus,
  onSelect,
}: BeerHouseListProps) {
  const sorted = [...locations].sort((a, b) => {
    const statusDiff = STATUS_ORDER[getStatus(a.id)] - STATUS_ORDER[getStatus(b.id)];
    if (statusDiff !== 0) return statusDiff;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="h-full overflow-y-auto bg-neutral-50 px-4 py-4">
      <ul className="space-y-2">
        {sorted.map((loc) => {
          const status = getStatus(loc.id);
          return (
            <li key={loc.id}>
              <button
                onClick={() => onSelect(loc.id)}
                className="flex w-full items-center gap-3 rounded-xl bg-white p-3 text-left shadow-sm active:bg-neutral-100"
              >
                <span className={`h-3 w-3 shrink-0 rounded-full ${STATUS_DOT[status]}`} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-neutral-900">
                    {loc.name}
                  </span>
                  <span className="block truncate text-xs text-neutral-500">
                    {loc.address}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-neutral-400">
                  {STATUS_LABEL[status]}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
