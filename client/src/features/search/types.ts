import { LatLngBoundsExpression } from "leaflet";

export interface TreeNode {
  id: string;
  label: string;
  children?: TreeNode[];
}

// Local search result type for mock data and legacy support
export interface SearchResult {
  id: number;
  title: string;
  date: string;
  cloudCover: string;
  platform: string;
  provider: string;
  thumbnail: string;
  bounds: LatLngBoundsExpression;
  locationId: string;
  properties: string[];
  keywords: string[];
  format: string;
}

// Voyager search result type for UI display
export interface VoyagerSearchResult {
  id: string;
  title: string;
  format: string;
  formatType?: string;
  formatCategory?: string;
  description: string;
  thumbnail: string;
  bounds: LatLngBoundsExpression | null;
  bytes?: number;
  modified?: string;
  keywords: string[];
  country?: string;
  agency?: string;
  acquisitionDate?: string;
  publishDate?: string;
  geometryType?: string;
  download?: string;
  fullpath?: string;
}

export interface FilterState {
  date?: { from: Date; to?: Date };
  locationIds: string[];
  properties: string[];
  keywords: string[];
}
