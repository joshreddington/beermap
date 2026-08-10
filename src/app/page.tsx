"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useCrawls } from "@/context/CrawlContext";
import { useHome } from "@/context/HomeContext";
import { useCustomLocations } from "@/context/CustomLocationsContext";
import { BEER_HOUSES } from "@/lib/beerHouses";
import { stopCoords } from "@/lib/stops";
import { getCrawlColor } from "@/lib/crawlColors";
import CrawlBar, { ViewMode } from "@/components/CrawlBar";
import LocationPanel from "@/components/LocationPanel";
import StartCrawlModal from "@/components/StartCrawlModal";
import HistoryModal from "@/components/HistoryModal";
import StopsModal from "@/components/StopsModal";
import AddStopForm from "@/components/AddStopForm";
import HomeSheet from "@/components/HomeSheet";
import BeerHouseList from "@/components/BeerHouseList";
import type { LocationStatus, RouteSegment, PickMode, MapLocation } from "@/components/BeerMap";

const BeerMap = dynamic(() => import("@/components/BeerMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-neutral-100 text-neutral-500">
      Loading map…
    </div>
  ),
});

type PickTarget = "stop" | "home" | null;

export default function Home() {
  const {
    crawls,
    activeCrawl,
    startCrawl,
    endCrawl,
    logArrival,
    logDeparture,
    deleteCrawl,
    logStopAt,
    deleteStop,
  } = useCrawls();
  const { home, setHome, clearHome } = useHome();
  const { customLocations, addCustomLocation, deleteCustomLocation } = useCustomLocations();

  const [view, setView] = useState<ViewMode>("map");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showStart, setShowStart] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showStops, setShowStops] = useState(false);
  const [showHomeSheet, setShowHomeSheet] = useState(false);
  const [pickTarget, setPickTarget] = useState<PickTarget>(null);
  const [pendingStopCoords, setPendingStopCoords] = useState<[number, number] | null>(
    null
  );

  const locations = useMemo<MapLocation[]>(
    () => [
      ...BEER_HOUSES,
      ...customLocations.map((c) => ({ ...c, kind: "custom" as const })),
    ],
    [customLocations]
  );

  const getStatus = useCallback(
    (locationId: string): LocationStatus => {
      if (!activeCrawl) return "none";
      const stops = activeCrawl.stops.filter(
        (s) => s.locationId === locationId
      );
      if (stops.length === 0) return "none";
      return stops.some((s) => s.departedAt === null) ? "open" : "done";
    },
    [activeCrawl]
  );

  const routeSegments = useMemo<RouteSegment[]>(() => {
    if (!activeCrawl) return [];
    const resolved = activeCrawl.stops
      .map((s) => ({ stop: s, coords: stopCoords(s, customLocations) }))
      .filter((s): s is { stop: (typeof activeCrawl.stops)[number]; coords: [number, number] } =>
        s.coords !== null
      );
    const segments: RouteSegment[] = [];
    for (let i = 1; i < resolved.length; i++) {
      segments.push({
        key: `${resolved[i - 1].stop.id}-${resolved[i].stop.id}`,
        from: resolved[i - 1].coords,
        to: resolved[i].coords,
        wobbleLevel: i,
      });
    }
    return segments;
  }, [activeCrawl, customLocations]);

  const lastStopCoords = useMemo<[number, number] | null>(() => {
    if (!activeCrawl) return null;
    for (let i = activeCrawl.stops.length - 1; i >= 0; i--) {
      const coords = stopCoords(activeCrawl.stops[i], customLocations);
      if (coords) return coords;
    }
    return null;
  }, [activeCrawl, customLocations]);

  const selectedLocation = locations.find((l) => l.id === selectedId) ?? null;

  function selectLocation(id: string) {
    setSelectedId(id);
  }

  const pickMode: PickMode | null =
    pickTarget === "stop"
      ? { active: true, label: "Tap the map to place your stop" }
      : pickTarget === "home"
      ? { active: true, label: "Tap the map to set your home" }
      : null;

  const pickFocus: [number, number] | null =
    pickTarget === "stop"
      ? lastStopCoords
      : pickTarget === "home" && home
      ? [home.lat, home.lng]
      : null;

  function handlePick(lat: number, lng: number) {
    if (pickTarget === "stop") {
      setPendingStopCoords([lat, lng]);
    } else if (pickTarget === "home") {
      setHome(lat, lng);
      setShowHomeSheet(true);
    }
    setPickTarget(null);
  }

  function handleStartAddStop() {
    setShowStops(false);
    setPickTarget("stop");
  }

  function handleHomeFabClick() {
    if (home) {
      setShowHomeSheet(true);
    } else {
      setPickTarget("home");
    }
  }

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden">
      <CrawlBar
        activeCrawl={activeCrawl}
        onStartClick={() => setShowStart(true)}
        onEndClick={endCrawl}
        onHistoryClick={() => setShowHistory(true)}
        onStopsClick={() => setShowStops(true)}
        view={view}
        onViewChange={setView}
      />

      <div className="relative flex-1">
        {view === "map" ? (
          <>
            <BeerMap
              locations={locations}
              selectedId={selectedId}
              onSelect={selectLocation}
              getStatus={getStatus}
              routeSegments={routeSegments}
              routeBaseColor={activeCrawl ? getCrawlColor(activeCrawl) : undefined}
              homeLocation={home ? [home.lat, home.lng] : null}
              onHomeClick={() => setShowHomeSheet(true)}
              pickMode={pickMode}
              pickFocus={pickFocus}
              onPick={handlePick}
              onCancelPick={() => setPickTarget(null)}
            />
            {!pickMode && (
              <button
                onClick={handleStartAddStop}
                aria-label="Add a stop"
                className="absolute bottom-24 right-4 z-[800] flex h-14 w-14 items-center justify-center rounded-full bg-purple-600 text-2xl text-white shadow-lg active:bg-purple-700"
              >
                ➕
              </button>
            )}
            {!pickMode && (
              <button
                onClick={handleHomeFabClick}
                aria-label={home ? "Home" : "Set home location"}
                className="absolute bottom-5 right-4 z-[800] flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-2xl text-white shadow-lg active:bg-blue-700"
              >
                🏠
              </button>
            )}
          </>
        ) : (
          <BeerHouseList
            locations={locations}
            getStatus={getStatus}
            onSelect={selectLocation}
          />
        )}
      </div>

      {selectedLocation && (
        <LocationPanel
          location={selectedLocation}
          activeCrawl={activeCrawl}
          onLogArrival={() => logArrival(selectedLocation.id)}
          onLogDeparture={() => logDeparture(selectedLocation.id)}
          onClose={() => setSelectedId(null)}
          onStartCrawl={() => setShowStart(true)}
          onDeleteStop={deleteStop}
          isCustom={selectedLocation.kind === "custom"}
          onDeleteLocation={
            selectedLocation.kind === "custom"
              ? () => {
                  deleteCustomLocation(selectedLocation.id);
                  setSelectedId(null);
                }
              : undefined
          }
        />
      )}

      {showStart && (
        <StartCrawlModal
          onCancel={() => setShowStart(false)}
          onStart={(name) => {
            startCrawl(name);
            setShowStart(false);
          }}
        />
      )}

      {showHistory && (
        <HistoryModal
          crawls={crawls}
          customLocations={customLocations}
          onClose={() => setShowHistory(false)}
          onDelete={deleteCrawl}
        />
      )}

      {showStops && activeCrawl && (
        <StopsModal
          crawl={activeCrawl}
          customLocations={customLocations}
          onClose={() => setShowStops(false)}
          onDeleteStop={deleteStop}
        />
      )}

      {pendingStopCoords && (
        <AddStopForm
          coords={pendingStopCoords}
          hasActiveCrawl={!!activeCrawl}
          onCancel={() => setPendingStopCoords(null)}
          onAdd={(name, description, lat, lng, arrivedAt, departedAt) => {
            const location = addCustomLocation(name, description, lat, lng);
            if (arrivedAt) {
              logStopAt(location.id, arrivedAt, departedAt);
            }
            setPendingStopCoords(null);
          }}
        />
      )}

      {showHomeSheet && home && (
        <HomeSheet
          home={home}
          onClose={() => setShowHomeSheet(false)}
          onChangeLocation={() => {
            setShowHomeSheet(false);
            setPickTarget("home");
          }}
          onRemove={() => {
            clearHome();
            setShowHomeSheet(false);
          }}
        />
      )}
    </div>
  );
}
