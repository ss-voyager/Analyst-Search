/**
 * @fileoverview Gazetteer API client for geocoding location names
 * @module client/features/search/gazetteer-api
 */

import { getGazetteerBaseUrl } from '@/lib/config';

/**
 * Result from a gazetteer query containing location name and geometry
 */
export interface GazetteerResult {
  /** Location name */
  name: string;
  /** GeoJSON geometry object */
  geo: {
    /** Geometry type (e.g., "Polygon", "MultiPolygon") */
    type: string;
    /** GeoJSON coordinates array */
    coordinates: any;
  };
}

/**
 * Raw response structure from the Gazetteer Solr API
 * @internal
 */
interface GazetteerResponse {
  response: {
    docs: Array<{
      name: string;
      geo: any;
    }>;
  };
}

/**
 * Builds a Solr query URL for the gazetteer API
 *
 * @param locationNames - Array of location names to search for
 * @returns Fully-formed URL string for the gazetteer query
 * @throws Error if locationNames array is empty
 *
 * @example
 * ```typescript
 * const url = buildGazetteerUrl(['New York', 'California']);
 * // Returns: "http://host/solr/gazetteer/select?q=name:"New York" || name:"California"&..."
 * ```
 */
export function buildGazetteerUrl(locationNames: string[]): string {
  if (locationNames.length === 0) {
    throw new Error('At least one location name is required');
  }

  const baseUrl = getGazetteerBaseUrl();
  const url = new URL(`${baseUrl}/solr/gazetteer/select`);

  // Build query: name:"Location1" || name:"Location2" || ...
  const nameQueries = locationNames.map(name => `name:"${name}"`).join(' || ');

  url.searchParams.append('q', nameQueries);
  url.searchParams.append('fl', 'geo:[geo], name');
  url.searchParams.append('wt', 'json');

  return url.toString();
}

/**
 * Queries the gazetteer API for location geometries
 *
 * @param locationNames - Array of location names to look up
 * @returns Promise resolving to array of GazetteerResult objects with geometries
 *
 * @remarks
 * - Returns empty array if locationNames is empty
 * - Returns empty array on network or API errors (fails silently)
 * - Filters out results that don't have valid geo data
 *
 * @example
 * ```typescript
 * const results = await queryGazetteer(['United States']);
 * // Returns: [{ name: 'United States', geo: { type: 'MultiPolygon', coordinates: [...] } }]
 * ```
 */
export async function queryGazetteer(locationNames: string[]): Promise<GazetteerResult[]> {
  if (locationNames.length === 0) {
    return [];
  }

  try {
    const url = buildGazetteerUrl(locationNames);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Gazetteer query failed: ${response.status} ${response.statusText}`);
      return [];
    }

    const data: GazetteerResponse = await response.json();

    // Extract results, silently filtering out any without geo data
    const results: GazetteerResult[] = data.response.docs
      .filter(doc => doc.geo && doc.name)
      .map(doc => ({
        name: doc.name,
        geo: doc.geo,
      }));

    return results;
  } catch (error) {
    console.error('Gazetteer query error:', error);
    return [];
  }
}
