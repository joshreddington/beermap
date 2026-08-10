"use client";

import { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { BeerHouse } from "@/lib/types";
import { MUNICH_CENTER } from "@/lib/beerHouses";

export type LocationStatus = "none" | "open" | "done";

export interface RouteSegment {
  key: string;
  from: [number, number];
  to: [number, number];
  wobbleLevel: number;
}

export interface CustomStopMarker {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface PickMode {
  active: boolean;
  label: string;
}

function makeIcon(status: LocationStatus, selected: boolean) {
  const bg =
    status === "open" ? "#16a34a" : status === "done" ? "#78716c" : "#d97706";
  const ring = selected ? "0 0 0 3px #fff, 0 0 0 6px #2563eb" : "0 0 0 2px #fff";
  return L.divIcon({
    className: "beer-marker",
    html: `<div style="
      width: 34px; height: 34px; border-radius: 50%;
      background: ${bg}; box-shadow: ${ring};
      display: flex; align-items: center; justify-content: center;
      font-size: 18px;">🍺</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -17],
  });
}

function makeCustomStopIcon(selected: boolean) {
  const ring = selected ? "0 0 0 2px #fff, 0 0 0 5px #2563eb" : "0 0 0 2px #fff";
  return L.divIcon({
    className: "custom-stop-marker",
    html: `<div style="
      width: 28px; height: 28px; border-radius: 50% 50% 50% 0;
      background: #7c3aed; box-shadow: ${ring};
      transform: rotate(-45deg);
      display: flex; align-items: center; justify-content: center;">
      <span style="transform: rotate(45deg); font-size: 13px;">📍</span>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 26],
  });
}

const homeIcon = L.divIcon({
  className: "home-marker",
  html: `<div style="
    width: 36px; height: 36px; border-radius: 50%;
    background: #2563eb; box-shadow: 0 0 0 2px #fff;
    display: flex; align-items: center; justify-content: center;
    font-size: 18px;">🏠</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

// Deterministic PRNG so a given segment's wobble stays stable across re-renders.
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}

// A drunker walk the more stops in, but scaled to how far apart the two
// stops actually are: two bars a block apart stay a fairly straight line
// even late in the crawl, while a long trek (e.g. out to Erding) can wander.
function wobblyPath(
  from: [number, number],
  to: [number, number],
  wobbleLevel: number,
  seed: number
): [number, number][] {
  const steps = 24;
  const rand = mulberry32(seed);
  const [fromLat, fromLng] = from;
  const [toLat, toLng] = to;
  const dLat = toLat - fromLat;
  const dLng = toLng - fromLng;
  const length = Math.hypot(dLat, dLng) || 1e-9;
  const perpLat = -dLng / length;
  const perpLng = dLat / length;

  const ampFraction = Math.min(0.04 + wobbleLevel * 0.025, 0.3);
  const amplitude = Math.min(length * ampFraction, 0.01);
  const frequency = 1.5 + wobbleLevel * 0.4;
  const phase = rand() * Math.PI * 2;

  const points: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const baseLat = fromLat + dLat * t;
    const baseLng = fromLng + dLng * t;
    const envelope = Math.sin(Math.PI * t);
    const wave = Math.sin(t * frequency * Math.PI * 2 + phase);
    const jitter = (rand() - 0.5) * 0.6;
    const offset = (wave + jitter) * amplitude * envelope;
    points.push([baseLat + perpLat * offset, baseLng + perpLng * offset]);
  }
  return points;
}

function routeColor(wobbleLevel: number): string {
  const t = Math.min(wobbleLevel / 8, 1);
  const r = Math.round(217 + (220 - 217) * t);
  const g = Math.round(119 + (38 - 119) * t);
  const b = Math.round(6 + (38 - 6) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function FitBounds({ locations }: { locations: BeerHouse[] }) {
  const map = useMap();
  useEffect(() => {
    if (locations.length === 0) return;
    const bounds = L.latLngBounds(locations.map((l) => [l.lat, l.lng]));
    map.fitBounds(bounds, { padding: [40, 40] });
    // Fit once on initial mount only; the map is user-controlled afterwards.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

// Manual stops are placed by tapping the visible map; if that tap happens at
// a wide, zoomed-out view (e.g. the initial Munich-to-Erding fit), two taps
// can land just a few real-world meters apart even though they look far
// apart on screen — their pins then visually overlap and hide any route
// line between them. Zooming in when picking starts keeps taps precise.
const MIN_PICK_ZOOM = 15;

function PickZoom({
  active,
  focus,
}: {
  active: boolean;
  focus: [number, number] | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (!active) return;
    const target = focus ?? map.getCenter();
    const targetZoom = Math.max(map.getZoom(), MIN_PICK_ZOOM);
    map.setView(target, targetZoom, { animate: true });
    // Only react to picking starting, not every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
  return null;
}

function ClickCapture({
  active,
  onPick,
}: {
  active: boolean;
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (!active) return;
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

interface BeerMapProps {
  locations: BeerHouse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  getStatus: (id: string) => LocationStatus;
  routeSegments?: RouteSegment[];
  customStops?: CustomStopMarker[];
  selectedCustomStopId?: string | null;
  onSelectCustomStop?: (id: string) => void;
  homeLocation?: [number, number] | null;
  onHomeClick?: () => void;
  pickMode?: PickMode | null;
  pickFocus?: [number, number] | null;
  onPick?: (lat: number, lng: number) => void;
  onCancelPick?: () => void;
}

export default function BeerMap({
  locations,
  selectedId,
  onSelect,
  getStatus,
  routeSegments = [],
  customStops = [],
  selectedCustomStopId = null,
  onSelectCustomStop,
  homeLocation = null,
  onHomeClick,
  pickMode = null,
  pickFocus = null,
  onPick,
  onCancelPick,
}: BeerMapProps) {
  const icons = useMemo(() => {
    const map = new Map<string, L.DivIcon>();
    for (const loc of locations) {
      const status = getStatus(loc.id);
      const selected = loc.id === selectedId;
      map.set(loc.id, makeIcon(status, selected));
    }
    return map;
  }, [locations, selectedId, getStatus]);

  const paths = useMemo(
    () =>
      routeSegments.map((seg) => ({
        key: seg.key,
        color: routeColor(seg.wobbleLevel),
        points: wobblyPath(seg.from, seg.to, seg.wobbleLevel, hashString(seg.key)),
      })),
    [routeSegments]
  );

  const picking = pickMode?.active ?? false;

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={MUNICH_CENTER}
        zoom={13}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%", cursor: picking ? "crosshair" : "" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds locations={locations} />
        <PickZoom active={picking} focus={pickFocus} />
        <ClickCapture active={picking} onPick={(lat, lng) => onPick?.(lat, lng)} />
        {paths.map((p) => (
          <Polyline
            key={p.key}
            positions={p.points}
            pathOptions={{ color: p.color, weight: 4, opacity: 0.75 }}
          />
        ))}
        {locations.map((loc) => (
          <Marker
            key={loc.id}
            position={[loc.lat, loc.lng]}
            icon={icons.get(loc.id)}
            interactive={!picking}
            eventHandlers={{
              click: () => onSelect(loc.id),
            }}
          />
        ))}
        {customStops.map((s) => (
          <Marker
            key={s.id}
            position={[s.lat, s.lng]}
            icon={makeCustomStopIcon(s.id === selectedCustomStopId)}
            interactive={!picking}
            eventHandlers={{
              click: () => onSelectCustomStop?.(s.id),
            }}
          />
        ))}
        {homeLocation && (
          <Marker
            position={homeLocation}
            icon={homeIcon}
            interactive={!picking}
            eventHandlers={{
              click: () => onHomeClick?.(),
            }}
          />
        )}
      </MapContainer>

      {picking && (
        <div className="pointer-events-none absolute inset-x-0 top-3 z-[850] flex justify-center px-4">
          <div className="pointer-events-auto flex items-center gap-3 rounded-full bg-neutral-900/90 px-4 py-2 text-sm text-white shadow-lg">
            <span>⬇️ {pickMode?.label}</span>
            <button
              onClick={onCancelPick}
              className="rounded-full bg-white/15 px-2 py-1 text-xs font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
