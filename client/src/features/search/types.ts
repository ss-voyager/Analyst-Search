import { LatLngBoundsExpression } from 'leaflet';

export interface TreeNode {
  id: string;
  label: string;
  children?: TreeNode[];
}

export interface SearchResult {
  id: number;
  title: string;
  date: string;
  cloudCover: string;
  platform: string;
  provider: string;
  thumbnail: string;
  bounds: LatLngBoundsExpression;
  locationId?: string;
  properties?: string[];
  keywords?: string[];
  format?: string;
}

export interface FilterState {
  date?: { from: Date; to?: Date };
  locationIds: string[];
  properties: string[];
  keywords: string[];
}
