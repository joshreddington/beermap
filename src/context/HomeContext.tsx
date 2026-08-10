"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

const HOME_KEY = "beermap.home.v1";

export interface HomeLocation {
  lat: number;
  lng: number;
}

interface HomeContextValue {
  home: HomeLocation | null;
  setHome: (lat: number, lng: number) => void;
  clearHome: () => void;
}

const HomeContext = createContext<HomeContextValue | null>(null);

function loadHome(): HomeLocation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(HOME_KEY);
    return raw ? (JSON.parse(raw) as HomeLocation) : null;
  } catch {
    return null;
  }
}

export function HomeProvider({ children }: { children: ReactNode }) {
  const [home, setHomeState] = useState<HomeLocation | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHomeState(loadHome());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (home) {
      window.localStorage.setItem(HOME_KEY, JSON.stringify(home));
    } else {
      window.localStorage.removeItem(HOME_KEY);
    }
  }, [home, hydrated]);

  const setHome = useCallback((lat: number, lng: number) => {
    setHomeState({ lat, lng });
  }, []);

  const clearHome = useCallback(() => {
    setHomeState(null);
  }, []);

  return (
    <HomeContext.Provider value={{ home, setHome, clearHome }}>
      {children}
    </HomeContext.Provider>
  );
}

export function useHome(): HomeContextValue {
  const ctx = useContext(HomeContext);
  if (!ctx) throw new Error("useHome must be used within a HomeProvider");
  return ctx;
}
