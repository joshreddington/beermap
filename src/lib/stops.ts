import { CrawlStop, CustomLocation } from "./types";
import { BEER_HOUSES } from "./beerHouses";

export function stopLocationName(
  stop: CrawlStop,
  customLocations: CustomLocation[] = []
): string {
  if (stop.locationId) {
    const beerHouse = BEER_HOUSES.find((b) => b.id === stop.locationId);
    if (beerHouse) return beerHouse.name;
    const custom = customLocations.find((l) => l.id === stop.locationId);
    if (custom) return custom.name;
    return stop.customName || "Deleted stop";
  }
  return stop.customName || "Custom stop";
}

export function stopCoords(
  stop: CrawlStop,
  customLocations: CustomLocation[] = []
): [number, number] | null {
  if (stop.locationId) {
    const beerHouse = BEER_HOUSES.find((b) => b.id === stop.locationId);
    if (beerHouse) return [beerHouse.lat, beerHouse.lng];
    const custom = customLocations.find((l) => l.id === stop.locationId);
    if (custom) return [custom.lat, custom.lng];
    if (stop.customLat !== undefined && stop.customLng !== undefined) {
      return [stop.customLat, stop.customLng];
    }
    return null;
  }
  if (stop.customLat !== undefined && stop.customLng !== undefined) {
    return [stop.customLat, stop.customLng];
  }
  return null;
}
