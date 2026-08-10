"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { Crawl, CrawlStop } from "@/lib/types";
import { generateId } from "@/lib/id";

const STORAGE_KEY = "beermap.crawls.v1";
const ACTIVE_KEY = "beermap.activeCrawlId.v1";

interface CrawlContextValue {
  crawls: Crawl[];
  activeCrawl: Crawl | null;
  startCrawl: (name: string) => void;
  endCrawl: () => void;
  logArrival: (locationId: string) => void;
  logDeparture: (locationId: string) => void;
  openStopFor: (locationId: string) => CrawlStop | undefined;
  deleteCrawl: (crawlId: string) => void;
  addManualStop: (
    name: string,
    description: string,
    arrivedAt: string,
    departedAt: string | null,
    lat: number,
    lng: number
  ) => void;
  deleteStop: (stopId: string) => void;
  closeStop: (stopId: string) => void;
}

const CrawlContext = createContext<CrawlContextValue | null>(null);

function loadCrawls(): Crawl[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Crawl[]) : [];
  } catch {
    return [];
  }
}

function loadActiveId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACTIVE_KEY);
}

export function CrawlProvider({ children }: { children: ReactNode }) {
  const [crawls, setCrawls] = useState<Crawl[]>([]);
  const [activeCrawlId, setActiveCrawlId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Reading localStorage must happen post-mount: it's unavailable during
    // the static export's server render, so state starts empty and is
    // hydrated here once the real client value is known.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCrawls(loadCrawls());
    setActiveCrawlId(loadActiveId());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(crawls));
  }, [crawls, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (activeCrawlId) {
      window.localStorage.setItem(ACTIVE_KEY, activeCrawlId);
    } else {
      window.localStorage.removeItem(ACTIVE_KEY);
    }
  }, [activeCrawlId, hydrated]);

  const activeCrawl = useMemo(
    () => crawls.find((c) => c.id === activeCrawlId) ?? null,
    [crawls, activeCrawlId]
  );

  const startCrawl = useCallback((name: string) => {
    const crawl: Crawl = {
      id: generateId(),
      name: name.trim() || "Bar Crawl",
      startedAt: new Date().toISOString(),
      endedAt: null,
      stops: [],
    };
    setCrawls((prev) => [crawl, ...prev]);
    setActiveCrawlId(crawl.id);
  }, []);

  const endCrawl = useCallback(() => {
    setCrawls((prev) =>
      prev.map((c) =>
        c.id === activeCrawlId
          ? { ...c, endedAt: c.endedAt ?? new Date().toISOString() }
          : c
      )
    );
    setActiveCrawlId(null);
  }, [activeCrawlId]);

  const logArrival = useCallback(
    (locationId: string) => {
      if (!activeCrawlId) return;
      setCrawls((prev) =>
        prev.map((c) => {
          if (c.id !== activeCrawlId) return c;
          const hasOpenStop = c.stops.some(
            (s) => s.locationId === locationId && s.departedAt === null
          );
          if (hasOpenStop) return c;
          const now = new Date().toISOString();
          // Arriving somewhere new implicitly ends whatever visit was still open.
          const closedStops = c.stops.map((s) =>
            s.departedAt === null ? { ...s, departedAt: now } : s
          );
          const stop: CrawlStop = {
            id: generateId(),
            locationId,
            arrivedAt: now,
            departedAt: null,
          };
          return { ...c, stops: [...closedStops, stop] };
        })
      );
    },
    [activeCrawlId]
  );

  const logDeparture = useCallback(
    (locationId: string) => {
      if (!activeCrawlId) return;
      setCrawls((prev) =>
        prev.map((c) => {
          if (c.id !== activeCrawlId) return c;
          let closed = false;
          const stops = [...c.stops].reverse().map((s) => {
            if (!closed && s.locationId === locationId && s.departedAt === null) {
              closed = true;
              return { ...s, departedAt: new Date().toISOString() };
            }
            return s;
          });
          return { ...c, stops: stops.reverse() };
        })
      );
    },
    [activeCrawlId]
  );

  const openStopFor = useCallback(
    (locationId: string) => {
      if (!activeCrawl) return undefined;
      return activeCrawl.stops.find(
        (s) => s.locationId === locationId && s.departedAt === null
      );
    },
    [activeCrawl]
  );

  const addManualStop = useCallback(
    (
      name: string,
      description: string,
      arrivedAt: string,
      departedAt: string | null,
      lat: number,
      lng: number
    ) => {
      if (!activeCrawlId) return;
      const stop: CrawlStop = {
        id: generateId(),
        locationId: null,
        customName: name.trim() || "Custom stop",
        customDescription: description.trim() || undefined,
        customLat: lat,
        customLng: lng,
        arrivedAt,
        departedAt,
      };
      setCrawls((prev) =>
        prev.map((c) => {
          if (c.id !== activeCrawlId) return c;
          // If this new stop is itself still "open", it becomes the current
          // visit, so anything else left open before it is implicitly ended.
          const baseStops =
            departedAt === null
              ? c.stops.map((s) =>
                  s.departedAt === null ? { ...s, departedAt: arrivedAt } : s
                )
              : c.stops;
          const stops = [...baseStops, stop].sort(
            (a, b) => new Date(a.arrivedAt).getTime() - new Date(b.arrivedAt).getTime()
          );
          return { ...c, stops };
        })
      );
    },
    [activeCrawlId]
  );

  const closeStop = useCallback(
    (stopId: string) => {
      if (!activeCrawlId) return;
      setCrawls((prev) =>
        prev.map((c) => {
          if (c.id !== activeCrawlId) return c;
          const stops = c.stops.map((s) =>
            s.id === stopId && s.departedAt === null
              ? { ...s, departedAt: new Date().toISOString() }
              : s
          );
          return { ...c, stops };
        })
      );
    },
    [activeCrawlId]
  );

  const deleteStop = useCallback(
    (stopId: string) => {
      if (!activeCrawlId) return;
      setCrawls((prev) =>
        prev.map((c) =>
          c.id === activeCrawlId
            ? { ...c, stops: c.stops.filter((s) => s.id !== stopId) }
            : c
        )
      );
    },
    [activeCrawlId]
  );

  const deleteCrawl = useCallback(
    (crawlId: string) => {
      setCrawls((prev) => prev.filter((c) => c.id !== crawlId));
      if (activeCrawlId === crawlId) setActiveCrawlId(null);
    },
    [activeCrawlId]
  );

  const value: CrawlContextValue = {
    crawls,
    activeCrawl,
    startCrawl,
    endCrawl,
    logArrival,
    logDeparture,
    openStopFor,
    deleteCrawl,
    addManualStop,
    deleteStop,
    closeStop,
  };

  return <CrawlContext.Provider value={value}>{children}</CrawlContext.Provider>;
}

export function useCrawls(): CrawlContextValue {
  const ctx = useContext(CrawlContext);
  if (!ctx) throw new Error("useCrawls must be used within a CrawlProvider");
  return ctx;
}
