"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

const HUD_KEY = "beermap.hudTheme.v1";

interface ThemeContextValue {
  hud: boolean;
  toggleHud: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function loadHud(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(HUD_KEY) === "1";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [hud, setHud] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHud(loadHud());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.dataset.theme = hud ? "hud" : "";
    window.localStorage.setItem(HUD_KEY, hud ? "1" : "0");
  }, [hud, hydrated]);

  const toggleHud = useCallback(() => {
    setHud((prev) => !prev);
  }, []);

  return (
    <ThemeContext.Provider value={{ hud, toggleHud }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
