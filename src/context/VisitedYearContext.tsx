"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

const STORAGE_KEY = "beermap.visitedYears.v1";

type VisitedYears = Record<string, number>;

interface VisitedYearContextValue {
  visitedYears: VisitedYears;
  getVisitedYear: (locationId: string) => number | null;
  setVisitedYear: (locationId: string, year: number) => void;
  clearVisitedYear: (locationId: string) => void;
}

const VisitedYearContext = createContext<VisitedYearContextValue | null>(null);

function loadVisitedYears(): VisitedYears {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as VisitedYears) : {};
  } catch {
    return {};
  }
}

export function VisitedYearProvider({ children }: { children: ReactNode }) {
  const [visitedYears, setVisitedYears] = useState<VisitedYears>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisitedYears(loadVisitedYears());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(visitedYears));
  }, [visitedYears, hydrated]);

  const getVisitedYear = useCallback(
    (locationId: string) => visitedYears[locationId] ?? null,
    [visitedYears]
  );

  const setVisitedYear = useCallback((locationId: string, year: number) => {
    setVisitedYears((prev) => ({ ...prev, [locationId]: year }));
  }, []);

  const clearVisitedYear = useCallback((locationId: string) => {
    setVisitedYears((prev) => {
      const next = { ...prev };
      delete next[locationId];
      return next;
    });
  }, []);

  return (
    <VisitedYearContext.Provider
      value={{ visitedYears, getVisitedYear, setVisitedYear, clearVisitedYear }}
    >
      {children}
    </VisitedYearContext.Provider>
  );
}

export function useVisitedYears(): VisitedYearContextValue {
  const ctx = useContext(VisitedYearContext);
  if (!ctx) throw new Error("useVisitedYears must be used within a VisitedYearProvider");
  return ctx;
}
