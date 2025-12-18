import { LatLngBoundsExpression } from "leaflet";
import type { SatelliteItem } from "@shared/schema";

export interface TreeNode {
  id: string;
  label: string;
  children?: TreeNode[];
}

// Extend database type with UI-specific fields
export interface SearchResult
  extends Omit<SatelliteItem, "bounds" | "acquisitionDate"> {
  bounds: LatLngBoundsExpression;
  date: string; // formatted date for display
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

// Helper function to validate bounds data
function isValidBounds(
  bounds: unknown,
): bounds is [[number, number], [number, number]] {
  if (!Array.isArray(bounds) || bounds.length !== 2) return false;
  return bounds.every(
    (coord) =>
      Array.isArray(coord) &&
      coord.length === 2 &&
      typeof coord[0] === "number" &&
      typeof coord[1] === "number" &&
      isFinite(coord[0]) &&
      isFinite(coord[1]),
  );
}

// Default bounds (world view) when bounds are invalid
const DEFAULT_BOUNDS: [[number, number], [number, number]] = [
  [0, 0],
  [0, 0],
];

// Helper function to convert DB item to search result
// Database stores bounds as [[lng, lat], [lng, lat]] (GeoJSON format)
// Leaflet expects [[lat, lng], [lat, lng]]
export function toSearchResult(item: SatelliteItem): SearchResult {
  let leafletBounds: [[number, number], [number, number]] = DEFAULT_BOUNDS;

  if (isValidBounds(item.bounds)) {
    leafletBounds = [
      [item.bounds[0][1], item.bounds[0][0]], // swap lat/lng
      [item.bounds[1][1], item.bounds[1][0]], // swap lat/lng
    ];
  }

  return {
    ...item,
    bounds: leafletBounds,
    date: new Date(item.acquisitionDate).toISOString().split("T")[0],
  };
}
