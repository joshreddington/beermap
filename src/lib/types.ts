export interface BeerHouse {
  id: string;
  name: string;
  description: string;
  lat: number;
  lng: number;
  address: string;
}

export interface CrawlStop {
  id: string;
  locationId: string | null;
  customName?: string;
  customDescription?: string;
  customLat?: number;
  customLng?: number;
  arrivedAt: string;
  departedAt: string | null;
}

export interface Crawl {
  id: string;
  name: string;
  startedAt: string;
  endedAt: string | null;
  stops: CrawlStop[];
}
