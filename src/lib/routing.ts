// Free public OSRM foot-routing instance (no API key required). Best-effort:
// callers should fall back to a straight line if this fails or is slow.
const FOOT_ROUTE_URL = "https://routing.openstreetmap.de/routed-foot/route/v1/foot";

function routeKey(from: [number, number], to: [number, number]): string {
  return `${from[0]},${from[1]}|${to[0]},${to[1]}`;
}

const routeCache = new Map<string, [number, number][]>();
const pending = new Map<string, Promise<[number, number][] | null>>();

export function fetchWalkingRoute(
  from: [number, number],
  to: [number, number]
): Promise<[number, number][] | null> {
  const key = routeKey(from, to);
  const cached = routeCache.get(key);
  if (cached) return Promise.resolve(cached);

  const inFlight = pending.get(key);
  if (inFlight) return inFlight;

  const url = `${FOOT_ROUTE_URL}/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
  const promise = fetch(url)
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      const coords = data?.routes?.[0]?.geometry?.coordinates;
      if (!Array.isArray(coords) || coords.length < 2) return null;
      const points: [number, number][] = coords.map((c: [number, number]) => [c[1], c[0]]);
      routeCache.set(key, points);
      return points;
    })
    .catch(() => null)
    .finally(() => {
      pending.delete(key);
    });

  pending.set(key, promise);
  return promise;
}
