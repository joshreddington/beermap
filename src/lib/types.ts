export interface BeerHouse {
  id: string;
  name: string;
  description: string;
  lat: number;
  lng: number;
  address: string;
}

export interface CustomLocation {
  id: string;
  name: string;
  description: string;
  lat: number;
  lng: number;
  address: string;
  createdAt: string;
}

export interface CrawlStop {
  id: string;
  locationId: string | null;
  // Legacy: pre-persistent-custom-location stops embedded their place data
  // directly. Only ever read (for old localStorage data), never written.
  customName?: string;
  customDescription?: string;
  customLat?: number;
  customLng?: number;
  arrivedAt: string;
  departedAt: string | null;
  challenge?: string;
}

export interface Crawl {
  id: string;
  name: string;
  color: string;
  startedAt: string;
  endedAt: string | null;
  stops: CrawlStop[];
}
