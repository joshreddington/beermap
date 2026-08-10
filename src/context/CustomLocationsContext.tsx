"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { CustomLocation } from "@/lib/types";
import { generateId } from "@/lib/id";

const STORAGE_KEY = "beermap.customLocations.v1";

interface CustomLocationsContextValue {
  customLocations: CustomLocation[];
  addCustomLocation: (
    name: string,
    description: string,
    lat: number,
    lng: number
  ) => CustomLocation;
  deleteCustomLocation: (id: string) => void;
}

const CustomLocationsContext = createContext<CustomLocationsContextValue | null>(null);

function loadCustomLocations(): CustomLocation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CustomLocation[]) : [];
  } catch {
    return [];
  }
}

function formatAddress(lat: number, lng: number): string {
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

export function CustomLocationsProvider({ children }: { children: ReactNode }) {
  const [customLocations, setCustomLocations] = useState<CustomLocation[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCustomLocations(loadCustomLocations());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(customLocations));
  }, [customLocations, hydrated]);

  const addCustomLocation = useCallback(
    (name: string, description: string, lat: number, lng: number) => {
      const location: CustomLocation = {
        id: generateId(),
        name: name.trim() || "Custom stop",
        description: description.trim(),
        lat,
        lng,
        address: formatAddress(lat, lng),
        createdAt: new Date().toISOString(),
      };
      setCustomLocations((prev) => [...prev, location]);
      return location;
    },
    []
  );

  const deleteCustomLocation = useCallback((id: string) => {
    setCustomLocations((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const value: CustomLocationsContextValue = {
    customLocations,
    addCustomLocation,
    deleteCustomLocation,
  };

  return (
    <CustomLocationsContext.Provider value={value}>
      {children}
    </CustomLocationsContext.Provider>
  );
}

export function useCustomLocations(): CustomLocationsContextValue {
  const ctx = useContext(CustomLocationsContext);
  if (!ctx) throw new Error("useCustomLocations must be used within a CustomLocationsProvider");
  return ctx;
}
