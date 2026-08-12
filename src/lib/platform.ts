export function isApplePlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  // iPadOS 13+ Safari reports as "Macintosh" in the UA string even on a
  // touch device, but real Macs don't have touch points -- doesn't matter
  // here since both are Apple platforms and should see the button either way.
  return /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent);
}

export function isSafariBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // Chrome, Edge, and Firefox on iOS all embed "Safari" in their UA string
  // (they're required to use WebKit there) but aren't actually Safari, so
  // those need excluding explicitly.
  return /safari/i.test(ua) && !/chrome|crios|fxios|edgios|edg\//i.test(ua);
}
