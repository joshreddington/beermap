import { Crawl } from "./types";

export const CRAWL_COLOR_PALETTE = [
  "#d97706",
  "#7c3aed",
  "#0891b2",
  "#e11d48",
  "#65a30d",
  "#2563eb",
  "#c026d3",
  "#ea580c",
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function getCrawlColor(crawl: Crawl): string {
  if (crawl.color) return crawl.color;
  return CRAWL_COLOR_PALETTE[hashString(crawl.id) % CRAWL_COLOR_PALETTE.length];
}
