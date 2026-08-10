import { CrawlStop } from "./types";
import { BEER_HOUSES } from "./beerHouses";

export function stopLocationName(stop: CrawlStop): string {
  if (stop.locationId) {
    return BEER_HOUSES.find((b) => b.id === stop.locationId)?.name ?? "Unknown location";
  }
  return stop.customName || "Custom stop";
}

export function stopCoords(stop: CrawlStop): [number, number] | null {
  if (stop.locationId) {
    const loc = BEER_HOUSES.find((b) => b.id === stop.locationId);
    return loc ? [loc.lat, loc.lng] : null;
  }
  if (stop.customLat !== undefined && stop.customLng !== undefined) {
    return [stop.customLat, stop.customLng];
  }
  return null;
}
