import { getGazetteerBaseUrl } from '@/lib/config';

// Types
export interface GazetteerResult {
  name: string;
  geo: {
    type: string;
    coordinates: any;
  };
}

interface GazetteerResponse {
  response: {
    docs: Array<{
      name: string;
      geo: any;
    }>;
  };
}

/**
 * Build gazetteer query URL for location names
 * @param locationNames Array of location names to query
 * @returns URL string for gazetteer query
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
 * Query gazetteer for location geometries
 * @param locationNames Array of location names to query
 * @returns Promise resolving to array of gazetteer results
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
