import { LatLngBoundsExpression } from 'leaflet';
import type { SatelliteItem } from '@shared/schema';

export interface TreeNode {
  id: string;
  label: string;
  children?: TreeNode[];
}

// Extend database type with UI-specific fields
export interface SearchResult extends Omit<SatelliteItem, 'bounds' | 'acquisitionDate'> {
  bounds: LatLngBoundsExpression;
  date: string; // formatted date for display
}

export interface FilterState {
  date?: { from: Date; to?: Date };
  locationIds: string[];
  properties: string[];
  keywords: string[];
}

// Helper function to convert DB item to search result
export function toSearchResult(item: SatelliteItem): SearchResult {
  return {
    ...item,
    bounds: item.bounds as LatLngBoundsExpression,
    date: new Date(item.acquisitionDate).toISOString().split('T')[0],
  };
}
