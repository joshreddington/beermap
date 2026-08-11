export function isApplePlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  // iPadOS 13+ Safari reports as "Macintosh" in the UA string even on a
  // touch device, but real Macs don't have touch points -- doesn't matter
  // here since both are Apple platforms and should see the button either way.
  return /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent);
}
