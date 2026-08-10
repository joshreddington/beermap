"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useCrawls } from "@/context/CrawlContext";
import { useHome } from "@/context/HomeContext";
import { BEER_HOUSES } from "@/lib/beerHouses";
import { stopCoords } from "@/lib/stops";
import CrawlBar, { ViewMode } from "@/components/CrawlBar";
import LocationPanel from "@/components/LocationPanel";
import StartCrawlModal from "@/components/StartCrawlModal";
import HistoryModal from "@/components/HistoryModal";
import StopsModal from "@/components/StopsModal";
import AddStopForm from "@/components/AddStopForm";
import CustomStopPanel from "@/components/CustomStopPanel";
import HomeSheet from "@/components/HomeSheet";
import BeerHouseList from "@/components/BeerHouseList";
import type { LocationStatus, RouteSegment, PickMode } from "@/components/BeerMap";

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
    addManualStop,
    deleteStop,
    closeStop,
  } = useCrawls();
  const { home, setHome, clearHome } = useHome();

  const [view, setView] = useState<ViewMode>("map");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedCustomStopId, setSelectedCustomStopId] = useState<string | null>(
    null
  );
  const [showStart, setShowStart] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showStops, setShowStops] = useState(false);
  const [showHomeSheet, setShowHomeSheet] = useState(false);
  const [pickTarget, setPickTarget] = useState<PickTarget>(null);
  const [pendingStopCoords, setPendingStopCoords] = useState<[number, number] | null>(
    null
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
      .map((s) => ({ stop: s, coords: stopCoords(s) }))
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
  }, [activeCrawl]);

  const lastStopCoords = useMemo<[number, number] | null>(() => {
    if (!activeCrawl) return null;
    for (let i = activeCrawl.stops.length - 1; i >= 0; i--) {
      const coords = stopCoords(activeCrawl.stops[i]);
      if (coords) return coords;
    }
    return null;
  }, [activeCrawl]);

  const customStops = useMemo(() => {
    if (!activeCrawl) return [];
    return activeCrawl.stops
      .filter((s) => !s.locationId && s.customLat !== undefined && s.customLng !== undefined)
      .map((s) => ({
        id: s.id,
        name: s.customName ?? "Custom stop",
        lat: s.customLat as number,
        lng: s.customLng as number,
      }));
  }, [activeCrawl]);

  const selectedLocation = BEER_HOUSES.find((b) => b.id === selectedId) ?? null;
  const selectedCustomStop =
    activeCrawl?.stops.find((s) => s.id === selectedCustomStopId) ?? null;

  function selectBeerHouse(id: string) {
    setSelectedCustomStopId(null);
    setSelectedId(id);
  }

  function selectCustomStop(id: string) {
    setSelectedId(null);
    setSelectedCustomStopId(id);
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
              locations={BEER_HOUSES}
              selectedId={selectedId}
              onSelect={selectBeerHouse}
              getStatus={getStatus}
              routeSegments={routeSegments}
              customStops={customStops}
              selectedCustomStopId={selectedCustomStopId}
              onSelectCustomStop={selectCustomStop}
              homeLocation={home ? [home.lat, home.lng] : null}
              onHomeClick={() => setShowHomeSheet(true)}
              pickMode={pickMode}
              pickFocus={pickFocus}
              onPick={handlePick}
              onCancelPick={() => setPickTarget(null)}
            />
            {!pickMode && activeCrawl && (
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
            locations={BEER_HOUSES}
            getStatus={getStatus}
            onSelect={selectBeerHouse}
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
        />
      )}

      {selectedCustomStop && (
        <CustomStopPanel
          stop={selectedCustomStop}
          onClose={() => setSelectedCustomStopId(null)}
          onLogDeparture={() => closeStop(selectedCustomStop.id)}
          onDelete={() => {
            deleteStop(selectedCustomStop.id);
            setSelectedCustomStopId(null);
          }}
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
          onClose={() => setShowHistory(false)}
          onDelete={deleteCrawl}
        />
      )}

      {showStops && activeCrawl && (
        <StopsModal
          crawl={activeCrawl}
          onClose={() => setShowStops(false)}
          onDeleteStop={deleteStop}
        />
      )}

      {pendingStopCoords && (
        <AddStopForm
          coords={pendingStopCoords}
          onCancel={() => setPendingStopCoords(null)}
          onAdd={(name, description, arrivedAt, departedAt, lat, lng) => {
            addManualStop(name, description, arrivedAt, departedAt, lat, lng);
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
