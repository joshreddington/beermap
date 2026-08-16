"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Circle,
  Polyline,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { BeerHouse } from "@/lib/types";
import { MUNICH_CENTER } from "@/lib/beerHouses";
import { useTheme } from "@/context/ThemeContext";
import { fetchWalkingRoute } from "@/lib/routing";
import type { GeoFix, GeoStatus } from "@/context/GeoLocationContext";
import type { SharedPeer } from "@/context/LocationSharingContext";

export type LocationStatus = "none" | "open" | "done";

export interface MapLocation extends BeerHouse {
  kind?: "custom";
}

export interface RouteSegment {
  key: string;
  from: [number, number];
  to: [number, number];
  wobbleLevel: number;
}

export interface PickMode {
  active: boolean;
  label: string;
}

const STATUS_COLORS: Record<"standard" | "hud", Record<LocationStatus, string>> = {
  standard: { open: "#16a34a", done: "#78716c", none: "#d97706" },
  hud: { open: "#39ff14", done: "#3fae7a", none: "#ffb000" },
};

function makeIcon(
  status: LocationStatus,
  selected: boolean,
  kind: "beerhouse" | "custom",
  hud: boolean
) {
  const bg = STATUS_COLORS[hud ? "hud" : "standard"][status];
  const ring = hud
    ? selected
      ? "0 0 0 2px #000, 0 0 0 5px #39ff14"
      : "0 0 0 2px #000"
    : selected
    ? "0 0 0 3px #fff, 0 0 0 6px #2563eb"
    : "0 0 0 2px #fff";

  if (kind === "custom") {
    return L.divIcon({
      className: "custom-stop-marker",
      html: `<div style="
        width: 28px; height: 28px; border-radius: 50% 50% 50% 0;
        background: ${bg}; box-shadow: ${ring};
        transform: rotate(-45deg);
        display: flex; align-items: center; justify-content: center;">
        <span style="transform: rotate(45deg); font-size: 13px;">📍</span>
      </div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 26],
    });
  }

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

function makeHomeIcon(hud: boolean) {
  const bg = hud ? "#33d9ff" : "#2563eb";
  const ring = hud ? "0 0 0 2px #000" : "0 0 0 2px #fff";
  return L.divIcon({
    className: "home-marker",
    html: `<div style="
      width: 36px; height: 36px; border-radius: 50%;
      background: ${bg}; box-shadow: ${ring};
      display: flex; align-items: center; justify-content: center;
      font-size: 18px;">🏠</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

// Solid dot while we have a fresh fix; greyed out (not removed) once the fix
// goes stale, so the marker never just vanishes or jumps to a new spot.
function makeMyLocationIcon(status: GeoStatus, hud: boolean) {
  const isFresh = status === "active";
  const bg = isFresh ? (hud ? "#39ff14" : "#2563eb") : "#9ca3af";
  const ring = hud ? "0 0 0 2px #000" : "0 0 0 2px #fff";
  return L.divIcon({
    className: "my-location-marker",
    html: `<div style="
      width: 18px; height: 18px; border-radius: 50%;
      background: ${bg}; box-shadow: ${ring};
      opacity: ${isFresh ? 1 : 0.65};
      border: ${isFresh ? "none" : "2px dashed #6b7280"};
    "></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function makeSharedPeerIcon(label: string, hud: boolean) {
  const bg = hud ? "#ff00ff" : "#7c3aed";
  const ring = hud ? "0 0 0 2px #000" : "0 0 0 2px #fff";
  const initial = label.trim().charAt(0).toUpperCase() || "?";
  return L.divIcon({
    className: "shared-peer-marker",
    html: `<div style="
      width: 26px; height: 26px; border-radius: 50%;
      background: ${bg}; box-shadow: ${ring};
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; color: #fff; font-weight: 600;">${initial}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

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

// Resamples a (possibly multi-vertex) path at even steps by arc length,
// returning each sample point plus the path's local direction there so a
// wobble can be applied perpendicular to the actual line of travel rather
// than the straight line between its endpoints.
function resampleWithTangents(
  path: [number, number][],
  steps: number
): { point: [number, number]; tangent: [number, number] }[] {
  const segLengths: number[] = [];
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    const d = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
    segLengths.push(d);
    total += d;
  }
  if (total === 0) {
    return Array.from({ length: steps + 1 }, () => ({
      point: path[0],
      tangent: [0, 0] as [number, number],
    }));
  }

  const result: { point: [number, number]; tangent: [number, number] }[] = [];
  for (let i = 0; i <= steps; i++) {
    const targetDist = (i / steps) * total;
    let acc = 0;
    let segIdx = 0;
    for (; segIdx < segLengths.length - 1; segIdx++) {
      if (acc + segLengths[segIdx] >= targetDist) break;
      acc += segLengths[segIdx];
    }
    const segLen = segLengths[segIdx] || 1e-9;
    const localT = Math.min(Math.max((targetDist - acc) / segLen, 0), 1);
    const p0 = path[segIdx];
    const p1 = path[segIdx + 1];
    const dLat = p1[0] - p0[0];
    const dLng = p1[1] - p0[1];
    const len = Math.hypot(dLat, dLng) || 1e-9;
    result.push({
      point: [p0[0] + dLat * localT, p0[1] + dLng * localT],
      tangent: [dLat / len, dLng / len],
    });
  }
  return result;
}

// A drunker walk the more stops in, but scaled to how far apart the two
// stops actually are: two bars a block apart stay a fairly straight line
// even late in the crawl, while a long trek (e.g. out to Erding) can wander
// a little more. `path` is the real walking route when we have one (falls
// back to just the two endpoints), so the wobble rides along actual streets
// — it's a hand-jittered version of the real route, not a replacement for
// it, so the amplitude is kept small relative to a city block even at the
// top of its range.
function wobblyPath(
  path: [number, number][],
  wobbleLevel: number,
  seed: number
): [number, number][] {
  const steps = Math.max(24, Math.min(path.length * 2, 96));
  const rand = mulberry32(seed);
  const samples = resampleWithTangents(path, steps);

  let length = 0;
  for (let i = 1; i < path.length; i++) {
    length += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
  }
  length = length || 1e-9;

  const ampFraction = Math.min(0.006 + wobbleLevel * 0.003, 0.05);
  // ~0.0006 degrees is roughly 65m at Munich's latitude — noticeable
  // hand-tremor, not a detour into the next street over.
  const amplitude = Math.min(length * ampFraction, 0.0006);
  const frequency = 1.5 + wobbleLevel * 0.4;
  const phase = rand() * Math.PI * 2;

  return samples.map(({ point, tangent }, i) => {
    const t = i / steps;
    const [lat, lng] = point;
    const perpLat = -tangent[1];
    const perpLng = tangent[0];
    const envelope = Math.sin(Math.PI * t);
    const wave = Math.sin(t * frequency * Math.PI * 2 + phase);
    const jitter = (rand() - 0.5) * 0.6;
    const offset = (wave + jitter) * amplitude * envelope;
    return [lat + perpLat * offset, lng + perpLng * offset];
  });
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

// Blends from the crawl's own color toward a "getting drunker" red the
// further along the route a segment is.
function routeColor(wobbleLevel: number, baseColor: string): string {
  const [r0, g0, b0] = hexToRgb(baseColor);
  const [r1, g1, b1] = [220, 38, 38];
  const t = Math.min(wobbleLevel / 8, 1);
  const r = Math.round(r0 + (r1 - r0) * t);
  const g = Math.round(g0 + (g1 - g0) * t);
  const b = Math.round(b0 + (b1 - b0) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function FitBounds({ locations }: { locations: MapLocation[] }) {
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
  locations: MapLocation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  getStatus: (id: string) => LocationStatus;
  routeSegments?: RouteSegment[];
  routeBaseColor?: string;
  homeLocation?: [number, number] | null;
  onHomeClick?: () => void;
  pickMode?: PickMode | null;
  pickFocus?: [number, number] | null;
  onPick?: (lat: number, lng: number) => void;
  onCancelPick?: () => void;
  myLocation?: GeoFix | null;
  myLocationStatus?: GeoStatus;
  sharedPeers?: SharedPeer[];
}

export default function BeerMap({
  locations,
  selectedId,
  onSelect,
  getStatus,
  routeSegments = [],
  routeBaseColor = "#d97706",
  homeLocation = null,
  onHomeClick,
  pickMode = null,
  pickFocus = null,
  onPick,
  onCancelPick,
  myLocation = null,
  myLocationStatus = "idle",
  sharedPeers = [],
}: BeerMapProps) {
  const { hud } = useTheme();

  const icons = useMemo(() => {
    const map = new Map<string, L.DivIcon>();
    for (const loc of locations) {
      const status = getStatus(loc.id);
      const selected = loc.id === selectedId;
      map.set(loc.id, makeIcon(status, selected, loc.kind === "custom" ? "custom" : "beerhouse", hud));
    }
    return map;
  }, [locations, selectedId, getStatus, hud]);

  const homeIcon = useMemo(() => makeHomeIcon(hud), [hud]);
  const myLocationIcon = useMemo(
    () => makeMyLocationIcon(myLocationStatus, hud),
    [myLocationStatus, hud]
  );
  const peerIcons = useMemo(() => {
    const map = new Map<string, L.DivIcon>();
    for (const peer of sharedPeers) {
      map.set(peer.id, makeSharedPeerIcon(peer.label, hud));
    }
    return map;
  }, [sharedPeers, hud]);

  // Real walking-route geometry per segment, fetched best-effort from a
  // public routing service and cached by endpoint pair. Segments fall back
  // to a straight line (still wobbled) until their route arrives or if the
  // request fails.
  const [walkingRoutes, setWalkingRoutes] = useState<Map<string, [number, number][]>>(
    () => new Map()
  );

  useEffect(() => {
    let cancelled = false;
    for (const seg of routeSegments) {
      if (walkingRoutes.has(seg.key)) continue;
      fetchWalkingRoute(seg.from, seg.to).then((points) => {
        if (cancelled || !points) return;
        setWalkingRoutes((prev) => {
          if (prev.has(seg.key)) return prev;
          const next = new Map(prev);
          next.set(seg.key, points);
          return next;
        });
      });
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeSegments]);

  const paths = useMemo(
    () =>
      routeSegments.map((seg) => ({
        key: seg.key,
        color: routeColor(seg.wobbleLevel, routeBaseColor),
        points: wobblyPath(
          walkingRoutes.get(seg.key) ?? [seg.from, seg.to],
          seg.wobbleLevel,
          hashString(seg.key)
        ),
      })),
    [routeSegments, routeBaseColor, walkingRoutes]
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
        {myLocation && (
          <>
            <Marker
              position={[myLocation.lat, myLocation.lng]}
              icon={myLocationIcon}
              interactive={false}
            />
            {myLocationStatus === "active" && (
              <Circle
                center={[myLocation.lat, myLocation.lng]}
                radius={myLocation.accuracy}
                pathOptions={{
                  color: hud ? "#39ff14" : "#2563eb",
                  fillOpacity: 0.08,
                  weight: 1,
                }}
              />
            )}
          </>
        )}
        {sharedPeers.map((peer) => (
          <Marker
            key={peer.id}
            position={[peer.lat, peer.lng]}
            icon={peerIcons.get(peer.id)}
            interactive={false}
          />
        ))}
      </MapContainer>

      {picking && (
        <div className="pointer-events-none absolute inset-x-0 top-3 z-[850] flex justify-center px-4">
          <div className="pointer-events-auto flex items-center gap-3 rounded-full bg-zinc-900/90 px-4 py-2 text-sm text-zinc-50 shadow-lg">
            <span>⬇️ {pickMode?.label}</span>
            <button
              onClick={onCancelPick}
              className="rounded-full bg-zinc-50/15 px-2 py-1 text-xs font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
