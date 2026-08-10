import { Capacitor } from "@capacitor/core";

export function directionsHomeUrl(lat: number, lng: number): string {
  const platform = Capacitor.getPlatform();
  if (platform === "android") {
    return `geo:${lat},${lng}?q=${lat},${lng}(Home)`;
  }
  if (platform === "ios") {
    return `http://maps.apple.com/?daddr=${lat},${lng}&dirflg=w`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`;
}
