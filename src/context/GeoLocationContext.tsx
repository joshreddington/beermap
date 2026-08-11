"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import { Geolocation } from "@capacitor/geolocation";

const STORAGE_KEY = "beermap.myLocation.v1";
// If watchPosition goes quiet this long (common indoors, where GPS loses
// fix without ever calling the error callback), treat the fix as stale
// rather than trusting an old, possibly-wrong dot.
const STALE_AFTER_MS = 45_000;
const STALE_CHECK_INTERVAL_MS = 10_000;

export type GeoStatus =
  | "idle"
  | "requesting"
  | "active"
  | "stale"
  | "denied"
  | "unavailable";

export interface GeoFix {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
}

interface StoredState {
  enabled: boolean;
  fix: GeoFix | null;
  deniedAt: string | null;
}

interface GeoLocationContextValue {
  status: GeoStatus;
  fix: GeoFix | null;
  enabled: boolean;
  enable: () => void;
  disable: () => void;
  retryAfterDenied: () => void;
}

const GeoLocationContext = createContext<GeoLocationContextValue | null>(null);

function loadStored(): StoredState {
  if (typeof window === "undefined") {
    return { enabled: false, fix: null, deniedAt: null };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { enabled: false, fix: null, deniedAt: null };
    return JSON.parse(raw) as StoredState;
  } catch {
    return { enabled: false, fix: null, deniedAt: null };
  }
}

export function GeoLocationProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<GeoStatus>("idle");
  const [fix, setFix] = useState<GeoFix | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [deniedAt, setDeniedAt] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const watchId = useRef<string | null>(null);

  // Hydrate from localStorage once. A stored fix is shown immediately
  // (greyed, via "stale" status) so the map never looks empty or jumps once
  // a real fix arrives — offline-first for the location dot too.
  useEffect(() => {
    const stored = loadStored();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnabled(stored.enabled);
    setFix(stored.fix);
    setDeniedAt(stored.deniedAt);
    setStatus(stored.deniedAt ? "denied" : stored.fix ? "stale" : "idle");
    setHydrated(true);
  }, []);

  // Single source of truth for persistence: whatever `enabled`/`fix`/
  // `deniedAt` currently are, after every render, is what's on disk. This
  // avoids callbacks racing each other with stale closures over these
  // values (a manual persist-on-each-setState approach previously let a
  // watchPosition success handler clobber `enabled: true` back to `false`).
  useEffect(() => {
    if (!hydrated) return;
    const state: StoredState = { enabled, fix, deniedAt };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [enabled, fix, deniedAt, hydrated]);

  const stopWatch = useCallback(() => {
    if (watchId.current) {
      Geolocation.clearWatch({ id: watchId.current }).catch(() => {});
      watchId.current = null;
    }
  }, []);

  const startWatch = useCallback(async () => {
    setStatus("requesting");
    try {
      const id = await Geolocation.watchPosition(
        { enableHighAccuracy: true, timeout: 20_000, maximumAge: 10_000 },
        (position, err) => {
          if (err) {
            const code = (err as { code?: number }).code;
            if (code === 1) {
              // Permission denied: remember it, stop watching, never
              // auto-reprompt. A note explains; only an explicit tap retries.
              stopWatch();
              setDeniedAt(new Date().toISOString());
              setStatus("denied");
            } else {
              // POSITION_UNAVAILABLE / TIMEOUT — no fix (indoors, airplane
              // mode, weak signal). Keep the last known fix on screen,
              // greyed, rather than clearing it or erroring.
              setStatus((prevStatus) => (prevStatus === "denied" ? prevStatus : "stale"));
            }
            return;
          }
          if (!position) return;
          const next: GeoFix = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp || Date.now(),
          };
          setFix(next);
          setStatus("active");
          setDeniedAt(null);
        }
      );
      watchId.current = id;
    } catch {
      // checkPermissions/watchPosition can throw outright when location
      // services are off system-wide (not just denied for this app) or the
      // platform has no geolocation support at all. Same graceful note.
      setStatus((prevStatus) => (prevStatus === "idle" ? "unavailable" : prevStatus));
    }
  }, [stopWatch]);

  const enable = useCallback(() => {
    setEnabled(true);
    startWatch();
  }, [startWatch]);

  const disable = useCallback(() => {
    setEnabled(false);
    stopWatch();
    setStatus(fix ? "stale" : "idle");
  }, [stopWatch, fix]);

  const retryAfterDenied = useCallback(() => {
    // Explicit, user-initiated re-ask — not an automatic nag.
    setDeniedAt(null);
    startWatch();
  }, [startWatch]);

  // Resume tracking on load if the user had previously opted in and hasn't
  // been denied since.
  useEffect(() => {
    if (!hydrated) return;
    if (enabled && !deniedAt) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      startWatch();
    }
    return () => stopWatch();
    // Only on initial hydration, not every time `enabled` toggles (enable()
    // already starts the watch itself).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  // Staleness watchdog: watchPosition can go quiet without ever firing an
  // error (typical when a GPS fix is lost indoors), so age out silently.
  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(() => {
      setFix((currentFix) => {
        if (currentFix && Date.now() - currentFix.timestamp > STALE_AFTER_MS) {
          setStatus((prevStatus) => (prevStatus === "active" ? "stale" : prevStatus));
        }
        return currentFix;
      });
    }, STALE_CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [enabled]);

  return (
    <GeoLocationContext.Provider
      value={{ status, fix, enabled, enable, disable, retryAfterDenied }}
    >
      {children}
    </GeoLocationContext.Provider>
  );
}

export function useGeoLocation(): GeoLocationContextValue {
  const ctx = useContext(GeoLocationContext);
  if (!ctx) throw new Error("useGeoLocation must be used within a GeoLocationProvider");
  return ctx;
}
