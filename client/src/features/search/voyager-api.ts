/**
 * @fileoverview Voyager Search API integration for satellite imagery search
 * @module client/features/search/voyager-api
 */

import { useQuery, useInfiniteQuery } from "@tanstack/react-query";

/**
 * Voyager API configuration parameters
 * @internal
 */
const VOYAGER_CONFIG = {
  disp: "D187992491DF",
  "voyager.config.id": "D187992491DF",
  wt: "json",
};

/**
 * Default placeholder thumbnail (SVG data URL)
 * Used when no thumbnail is available for a search result
 */
export const DEFAULT_THUMBNAIL = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect fill='%23374151' width='400' height='300'/%3E%3Cg fill='%236b7280'%3E%3Crect x='160' y='100' width='80' height='60' rx='4'/%3E%3Ccircle cx='180' cy='120' r='8'/%3E%3Cpath d='M165 150 L185 130 L205 145 L235 115 L235 155 L165 155Z'/%3E%3C/g%3E%3Ctext x='200' y='190' text-anchor='middle' fill='%239ca3af' font-family='system-ui' font-size='14'%3ENo Preview%3C/text%3E%3C/svg%3E";

/**
 * Solr field list for search results
 * @internal
 */
const DEFAULT_SEARCH_FIELDS = "id,title,name:[name],format,abstract,fullpath:[absolute],absolute_path:[absolute],thumb:[thumbURL],path_to_thumb,subject,download:[downloadURL],format_type,bytes,modified,shard:[shard],bbox,geo:[geo],format_category,component_files,ags_fused_cache,linkcount__children,contains_name,wms_layer_name,tag_flags,hasMissingData,layerURL:[lyrURL],hasLayerFile,likes,dislikes,grp_Country,fl_views,views,description,keywords,fd_acquisition_date,name,name_alias,tag_tags,fd_publish_date,grp_Agency,fs_english_name,fs_title,fs_product_detail_link";

/**
 * Facet fields requested from Voyager API for filtering
 * @internal
 */
const FACET_FIELDS = [
  "fs_Voyager_Lexicon",
  "grp_Data_Theme",
  "tag_flags",
  "grp_Geography",
  "grp_Region",
  "grp_Sub-Region",
  "grp_Country",
  "grp_State",
  "grp_County",
  "grp_City",
  "grp_Sector",
  "grp_Bureau_/_Department",
  "grp_Agency",
  "grp_Academic",
  "organization",
  "fs_event",
  "fi_year",
  "location",
  "tag_tags",
  "keywords",
  "grp_Catalog",
  "grp_data_source",
  "fs_ckan_format",
  "format",
  "format_type",
  "format_keyword",
  "geometry_type",
  "fileExtension",
  "created",
];

/**
 * Human-readable display names for facet fields
 */
export const FACET_DISPLAY_NAMES: Record<string, string> = {
  fs_Voyager_Lexicon: "Voyager Lexicon",
  grp_Data_Theme: "Data Theme",
  tag_flags: "Flags",
  grp_Geography: "Geography",
  grp_Region: "Region",
  "grp_Sub-Region": "Sub-Region",
  grp_Country: "Country",
  grp_State: "State",
  grp_County: "County",
  grp_City: "City",
  grp_Sector: "Sector",
  "grp_Bureau_/_Department": "Bureau/Department",
  grp_Agency: "Agency",
  grp_Academic: "Academic",
  organization: "Organization",
  fs_event: "Event",
  fi_year: "Year",
  location: "Location",
  tag_tags: "Tags",
  keywords: "Keywords",
  grp_Catalog: "Catalog",
  grp_data_source: "Data Source",
  fs_ckan_format: "CKAN Format",
  format: "Format",
  format_type: "Format Type",
  format_keyword: "Format Keyword",
  geometry_type: "Geometry Type",
  fileExtension: "File Extension",
  created: "Created",
};

/**
 * Search filter parameters for Voyager API queries
 */
export interface VoyagerSearchFilters {
  /** Text search query (defaults to *:* for match all) */
  q?: string;
  /** Location text for geocoding */
  location?: string;
  /** Solr filter queries for facet selections */
  fq?: string[];
  /** Pagination start offset */
  start?: number;
  /** Number of results per page */
  rows?: number;
  /** Sort field and direction (e.g., "score desc") */
  sort?: string;
  /** Start date for date range filter */
  dateFrom?: Date;
  /** End date for date range filter */
  dateTo?: Date;
  /** Date field to filter on (defaults to 'modified') */
  dateField?: string;
  /** Bounding box [west, south, east, north] / [minLng, minLat, maxLng, maxLat] */
  bbox?: [number, number, number, number];
  /** Location hierarchy bbox from gazetteer for spatial filtering */
  gazetteerBbox?: [number, number, number, number];
  /** Text-based place search (Voyager's placefinder will geocode) */
  place?: string;
  /** Selected keywords to filter by */
  keywords?: string[];
}

/**
 * Document structure returned from Voyager Solr API
 */
export interface VoyagerDoc {
  /** Unique document identifier */
  id: string;
  /** Document title */
  title?: string;
  /** Document name */
  name?: string;
  /** File format */
  format?: string;
  /** Format type classification */
  format_type?: string;
  /** Format category (GIS, Image, etc.) */
  format_category?: string;
  /** Document abstract/summary */
  abstract?: string;
  /** Document description */
  description?: string;
  /** Thumbnail URL */
  thumb?: string;
  /** Alternative path to thumbnail */
  path_to_thumb?: string;
  /** Bounding box as space-separated string */
  bbox?: string;
  /** GeoJSON geometry */
  geo?: any;
  /** File size in bytes */
  bytes?: number;
  /** Last modified date */
  modified?: string;
  /** Document keywords */
  keywords?: string[];
  /** Document tags */
  tag_tags?: string[];
  /** Country classification */
  grp_Country?: string;
  /** Agency classification */
  grp_Agency?: string;
  /** Data acquisition date */
  fd_acquisition_date?: string;
  /** Publication date */
  fd_publish_date?: string;
  /** Geometry type (Point, Polygon, etc.) */
  geometry_type?: string;
  /** Additional dynamic fields */
  [key: string]: any;
}

/**
 * Response structure from Voyager Solr search API
 */
export interface VoyagerSearchResponse {
  /** Response header with status and timing */
  responseHeader: {
    status: number;
    QTime: number;
    params: Record<string, any>;
  };
  /** Search results */
  response: {
    /** Total number of matching documents */
    numFound: number;
    /** Pagination start offset */
    start: number;
    /** Array of matching documents */
    docs: VoyagerDoc[];
  };
  /** Facet counts for filtering (optional) */
  facet_counts?: {
    facet_fields: Record<string, (string | number)[]>;
  };
}

/**
 * A single facet value with its count
 */
export interface FacetValue {
  /** Facet value name */
  name: string;
  /** Number of documents with this value */
  count: number;
}

/**
 * A category of facet values for a specific field
 */
export interface FacetCategory {
  /** Solr field name */
  field: string;
  /** Human-readable display name */
  displayName: string;
  /** Available values with counts */
  values: FacetValue[];
}

/**
 * Formats a date range query for Solr
 *
 * @param dateFrom - Start date (inclusive)
 * @param dateTo - End date (inclusive)
 * @param field - Solr field to filter on (defaults to "modified")
 * @returns Solr date range query string, or null if no dates provided
 * @internal
 */
function formatDateRangeQuery(
  dateFrom?: Date,
  dateTo?: Date,
  field: string = "modified"
): string | null {
  if (!dateFrom && !dateTo) return null;

  const formatDate = (date: Date, isEnd: boolean = false): string => {
    if (isEnd) {
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      return endOfDay.toISOString();
    }
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    return startOfDay.toISOString();
  };

  const from = dateFrom ? formatDate(dateFrom, false) : "*";
  const to = dateTo ? formatDate(dateTo, true) : "*";

  return `${field}:[${from} TO ${to}]`;
}

/**
 * Parses raw Solr facet response into structured FacetCategory objects
 *
 * @param facetFields - Raw facet fields from Voyager response
 * @returns Array of FacetCategory objects with parsed values
 *
 * @example
 * ```typescript
 * const categories = parseFacetFields(response.facet_counts.facet_fields);
 * // Returns: [{ field: 'format', displayName: 'Format', values: [...] }, ...]
 * ```
 */
export function parseFacetFields(
  facetFields: Record<string, (string | number)[]>
): FacetCategory[] {
  const categories: FacetCategory[] = [];

  for (const field of FACET_FIELDS) {
    const values = facetFields[field];
    if (!values || values.length === 0) continue;

    const parsedValues: FacetValue[] = [];
    for (let i = 0; i < values.length; i += 2) {
      if (values[i] && values[i + 1] !== undefined) {
        parsedValues.push({
          name: String(values[i]),
          count: Number(values[i + 1]),
        });
      }
    }

    if (parsedValues.length > 0) {
      categories.push({
        field,
        displayName: FACET_DISPLAY_NAMES[field] || field,
        values: parsedValues,
      });
    }
  }

  return categories;
}

/**
 * Builds a complete search URL with all parameters for the Voyager API
 *
 * @param filters - Search filter parameters
 * @returns Full URL string for the search request
 * @internal
 */
function buildSearchUrl(filters: VoyagerSearchFilters): string {
  const url = new URL("/api/voyager/search", window.location.origin);

  // Add base config
  Object.entries(VOYAGER_CONFIG).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  // Add search query (default to *:* for match all)
  url.searchParams.append("q", filters.q || "*:*");

  // Add filter queries (facet selections)
  if (filters.fq && filters.fq.length > 0) {
    filters.fq.forEach((fq) => {
      url.searchParams.append("fq", fq);
    });
  }

  // Add date range filter
  if (filters.dateFrom || filters.dateTo) {
    const dateField = filters.dateField || "modified";
    const dateQuery = formatDateRangeQuery(filters.dateFrom, filters.dateTo, dateField);
    if (dateQuery) {
      url.searchParams.append("fq", dateQuery);
    }
  }

  // Add bounding box filter for spatial search
  // Voyager uses place parameter with place.op=within for bbox filtering
  if (filters.bbox) {
    const [west, south, east, north] = filters.bbox;
    url.searchParams.append("place", `${west},${south},${east},${north}`);
    url.searchParams.append("place.op", "within");
  }
  // Add place text search (Voyager's placefinder will geocode location names)
  else if (filters.place) {
    url.searchParams.append("place", filters.place);
    url.searchParams.append("place.op", "within");
  }

  // Add gazetteer bbox as additional spatial filter (uses AND logic with bbox/place)
  if (filters.gazetteerBbox) {
    const [west, south, east, north] = filters.gazetteerBbox;
    // Use filter query (fq) to combine with existing bbox using AND logic
    const gazetteerSpatialFq = `geo:"Intersects(ENVELOPE(${west}, ${east}, ${north}, ${south}))"`;
    url.searchParams.append("fq", gazetteerSpatialFq);
  }

  // Add keywords filter (searches the 'keywords' field which contains keyword strings)
  if (filters.keywords && filters.keywords.length > 0) {
    // Build OR query for multiple keywords: keywords:("keyword1" OR "keyword2")
    const keywordQueries = filters.keywords.map(kw => `"${kw.replace(/"/g, '\\"')}"`).join(" OR ");
    url.searchParams.append("fq", `keywords:(${keywordQueries})`);
  }

  // Add pagination
  url.searchParams.append("start", String(filters.start || 0));
  url.searchParams.append("rows", String(filters.rows || 48));

  // Add sort
  if (filters.sort) {
    url.searchParams.append("sort", filters.sort);
  } else {
    url.searchParams.append("sort", "score desc");
  }

  // Add field list
  url.searchParams.append("fl", DEFAULT_SEARCH_FIELDS);

  // Add extra params
  url.searchParams.append("extent.bbox", "true");
  url.searchParams.append("block", "true");

  return url.toString();
}

/**
 * Builds a URL for fetching facet counts from Voyager API
 *
 * @param filters - Search filter parameters (facets reflect current search context)
 * @returns Full URL string for the facet request
 * @internal
 */
function buildFacetUrl(filters: VoyagerSearchFilters): string {
  const url = new URL("/api/voyager/facets", window.location.origin);

  // Add base config
  Object.entries(VOYAGER_CONFIG).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  // Add search query (facets should reflect current search, default to *:* for match all)
  url.searchParams.append("q", filters.q || "*:*");

  // Add filter queries (facet selections)
  if (filters.fq && filters.fq.length > 0) {
    filters.fq.forEach((fq) => {
      url.searchParams.append("fq", fq);
    });
  }

  // Add date range filter
  if (filters.dateFrom || filters.dateTo) {
    const dateField = filters.dateField || "modified";
    const dateQuery = formatDateRangeQuery(filters.dateFrom, filters.dateTo, dateField);
    if (dateQuery) {
      url.searchParams.append("fq", dateQuery);
    }
  }

  // No results needed, just facets
  url.searchParams.append("rows", "0");

  // Enable faceting
  url.searchParams.append("facet", "true");
  url.searchParams.append("facet.mincount", "1");
  url.searchParams.append("facet.limit", "50");

  // Add all facet fields with exclusion tags
  FACET_FIELDS.forEach((field) => {
    url.searchParams.append("facet.field", `{!ex=${field}}${field}`);
    url.searchParams.append(`f.${field}.facet.mincount`, "1");
    // Sort some fields alphabetically
    if (
      field.includes("grp_") ||
      field === "format" ||
      field === "format_type"
    ) {
      url.searchParams.append(`f.${field}.facet.sort`, "index");
    }
  });

  return url.toString();
}

/**
 * Fetches search results from the Voyager API
 *
 * @param filters - Search filter parameters
 * @returns Promise resolving to VoyagerSearchResponse
 * @throws Error if request fails
 *
 * @remarks
 * Automatically switches to POST if URL exceeds 2000 characters
 * @internal
 */
async function fetchVoyagerSearch(
  filters: VoyagerSearchFilters
): Promise<VoyagerSearchResponse> {
  const url = buildSearchUrl(filters);

  // Use POST if URL is too long
  if (url.length > 2000) {
    const response = await fetch("/api/voyager/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        Object.fromEntries(new URL(url).searchParams.entries())
      ),
    });
    if (!response.ok) throw new Error("Failed to fetch search results");
    return response.json();
  }

  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch search results");
  return response.json();
}

/**
 * Fetches facet counts from the Voyager API
 *
 * @param filters - Search filter parameters (facets reflect current search context)
 * @returns Promise resolving to VoyagerSearchResponse with facet_counts
 * @throws Error if request fails
 *
 * @remarks
 * Automatically switches to POST if URL exceeds 2000 characters
 * @internal
 */
async function fetchVoyagerFacets(
  filters: VoyagerSearchFilters
): Promise<VoyagerSearchResponse> {
  const url = buildFacetUrl(filters);

  // Use POST if URL is too long
  if (url.length > 2000) {
    const response = await fetch("/api/voyager/facets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        Object.fromEntries(new URL(url).searchParams.entries())
      ),
    });
    if (!response.ok) throw new Error("Failed to fetch facets");
    return response.json();
  }

  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch facets");
  return response.json();
}

/**
 * React Query hook for fetching Voyager search results
 *
 * @param filters - Search filter parameters
 * @returns React Query result with data, loading state, and error handling
 *
 * @example
 * ```typescript
 * const { data, isLoading, error } = useVoyagerSearch({ q: 'satellite' });
 * ```
 */
export function useVoyagerSearch(filters: VoyagerSearchFilters) {
  return useQuery({
    queryKey: ["voyagerSearch", filters],
    queryFn: () => fetchVoyagerSearch(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/** Number of items per page for infinite scroll */
const ITEMS_PER_PAGE = 48;

/**
 * React Query infinite query hook for paginated Voyager search
 *
 * @param filters - Search filter parameters (start/rows handled automatically)
 * @returns React Query infinite query result with fetchNextPage, hasNextPage, etc.
 *
 * @remarks
 * Uses infinite scroll pattern - call fetchNextPage() to load more results.
 * Results are cached for 5 minutes.
 *
 * @example
 * ```typescript
 * const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteVoyagerSearch({ q: 'satellite' });
 * ```
 */
export function useInfiniteVoyagerSearch(filters: Omit<VoyagerSearchFilters, 'start' | 'rows'>) {
  return useInfiniteQuery({
    queryKey: ["voyagerSearchInfinite", filters],
    queryFn: ({ pageParam = 0 }) => fetchVoyagerSearch({
      ...filters,
      start: pageParam,
      rows: ITEMS_PER_PAGE,
    }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const totalLoaded = allPages.length * ITEMS_PER_PAGE;
      const totalAvailable = lastPage.response.numFound;
      // Return next start offset if more results available
      return totalLoaded < totalAvailable ? totalLoaded : undefined;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * React Query hook for fetching Voyager facet counts
 *
 * @param filters - Search filter parameters (facets reflect current search context)
 * @returns React Query result with facet data
 *
 * @example
 * ```typescript
 * const { data } = useVoyagerFacets({ q: 'satellite' });
 * const categories = parseFacetFields(data?.facet_counts?.facet_fields || {});
 * ```
 */
export function useVoyagerFacets(filters: VoyagerSearchFilters) {
  return useQuery({
    queryKey: ["voyagerFacets", filters],
    queryFn: () => fetchVoyagerFacets(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Builds a Solr filter query from selected facet values
 *
 * @param field - Solr field name
 * @param values - Array of selected values
 * @returns Solr filter query string with tag, or null if no values
 *
 * @example
 * ```typescript
 * const fq = buildFilterQuery('format', ['GeoTIFF', 'Shapefile']);
 * // Returns: '{!tag=format}format:("GeoTIFF" OR "Shapefile")'
 * ```
 */
export function buildFilterQuery(
  field: string,
  values: string[]
): string | null {
  if (!values || values.length === 0) return null;

  const escaped = values.map((v) => `"${v.replace(/"/g, '\\"')}"`).join(" OR ");
  return `{!tag=${field}}${field}:(${escaped})`;
}

/**
 * Builds a Solr date range filter query
 *
 * @param dateFrom - Start date (inclusive, start of day)
 * @param dateTo - End date (inclusive, end of day)
 * @param field - Date field to filter on (defaults to "modified")
 * @returns Solr date range query string, or null if no dates provided
 *
 * @example
 * ```typescript
 * const fq = buildDateRangeQuery(new Date('2024-01-01'), new Date('2024-12-31'));
 * // Returns: 'modified:[2024-01-01T00:00:00.000Z TO 2024-12-31T23:59:59.999Z]'
 * ```
 */
export function buildDateRangeQuery(
  dateFrom?: Date,
  dateTo?: Date,
  field: string = "modified"
): string | null {
  return formatDateRangeQuery(dateFrom, dateTo, field);
}

/**
 * Builds a Solr filter query for keyword filtering
 *
 * @param selectedKeywords - Array of keywords to filter by
 * @param field - Solr field containing keywords (defaults to "keywords")
 * @returns Solr filter query string, or null if no keywords selected
 *
 * @example
 * ```typescript
 * const fq = buildKeywordFilterQuery(['climate', 'weather']);
 * // Returns: 'keywords:("climate" OR "weather")'
 * ```
 */
export function buildKeywordFilterQuery(
  selectedKeywords: string[],
  field: string = "keywords"
): string | null {
  if (!selectedKeywords || selectedKeywords.length === 0) return null;

  const escaped = selectedKeywords.map((k) => `"${k.replace(/"/g, '\\"')}"`).join(" OR ");
  return `${field}:(${escaped})`;
}

/**
 * Mapping of property filter names to Solr field existence queries
 *
 * @remarks
 * Uses different strategies based on field type:
 * - For indexed fields: use field:* or _exists_:field
 * - For special cases: use related facetable fields
 * @internal
 */
const PROPERTY_TO_SOLR_QUERY: Record<string, string> = {
  // Has Thumbnail - filter by format types that typically have thumbnails
  "has_thumbnail": "format_category:(GIS OR Image OR Map OR Document)",
  // Has Spatial Info - filter by geometry_type existing
  "has_spatial": "geometry_type:*",
  // Has Temporal Info - filter by year field existing
  "has_temporal": "fi_year:*",
  // Is Downloadable - filter by format types that are downloadable
  "is_downloadable": "format_type:(File OR Dataset OR Record OR Layer)",
};

/**
 * Builds Solr filter queries for property-based filtering
 *
 * @param selectedProperties - Array of property IDs (e.g., "has_thumbnail", "has_spatial")
 * @returns Array of Solr filter query strings
 *
 * @remarks
 * Properties filter on field existence or specific field values.
 * Supported properties: has_thumbnail, has_spatial, has_temporal, is_downloadable
 *
 * @example
 * ```typescript
 * const fqs = buildPropertyFilterQueries(['has_spatial', 'has_thumbnail']);
 * // Returns: ['geometry_type:*', '(format_category:(GIS OR Image OR Map OR Document))']
 * ```
 */
export function buildPropertyFilterQueries(
  selectedProperties: string[]
): string[] {
  if (!selectedProperties || selectedProperties.length === 0) return [];

  const queries: string[] = [];
  for (const prop of selectedProperties) {
    const solrQuery = PROPERTY_TO_SOLR_QUERY[prop];
    if (solrQuery) {
      // Wrap in parentheses if it contains OR
      queries.push(solrQuery.includes(" OR ") ? `(${solrQuery})` : solrQuery);
    }
  }

  return queries;
}

/**
 * Mapping of location hierarchy ID to Voyager field/value
 * @internal
 */
interface LocationMapping {
  /** Voyager field name (e.g., "grp_Country", "grp_State") */
  field: string;
  /** Field value to match */
  value: string;
}

/**
 * Builds Solr filter queries for location hierarchy filtering
 *
 * @param selectedIds - Array of location hierarchy IDs
 * @param locationMapping - Map of IDs to Voyager field/value pairs
 * @returns Array containing a single combined OR query across all location fields
 *
 * @remarks
 * Creates a single OR query across all location fields so results match ANY selected location,
 * not ALL of them. This allows filtering by multiple non-overlapping locations.
 *
 * @example
 * ```typescript
 * const fqs = buildLocationFilterQueries(
 *   ['us', 'uk'],
 *   { us: { field: 'grp_Country', value: 'United States' }, uk: { field: 'grp_Country', value: 'United Kingdom' } }
 * );
 * // Returns: ['(grp_Country:("United States" OR "United Kingdom"))']
 * ```
 */
export function buildLocationFilterQueries(
  selectedIds: string[],
  locationMapping: Record<string, LocationMapping>
): string[] {
  if (!selectedIds || selectedIds.length === 0) return [];

  // Group selected locations by their Voyager field
  const groupedByField: Record<string, string[]> = {};

  for (const id of selectedIds) {
    const mapping = locationMapping[id];
    if (mapping) {
      if (!groupedByField[mapping.field]) {
        groupedByField[mapping.field] = [];
      }
      groupedByField[mapping.field].push(mapping.value);
    }
  }

  // Build a single combined OR query across all fields
  // This ensures results match ANY of the selected locations, not ALL
  const fieldQueries: string[] = [];
  for (const [field, values] of Object.entries(groupedByField)) {
    if (values.length > 0) {
      const escaped = values.map((v) => `"${v.replace(/"/g, '\\"')}"`).join(" OR ");
      fieldQueries.push(`${field}:(${escaped})`);
    }
  }

  if (fieldQueries.length === 0) return [];

  // Combine all field queries with OR and return as single filter query
  const combinedQuery = fieldQueries.join(" OR ");
  return [`(${combinedQuery})`];
}

/**
 * Converts a Voyager document to a UI-friendly search result format
 *
 * @param doc - Raw VoyagerDoc from the API response
 * @returns Normalized search result object with parsed bounds and formatted fields
 *
 * @remarks
 * - Parses bbox string to [[minLat, minLng], [maxLat, maxLng]] format
 * - Falls back to alternative field names (e.g., name if title missing)
 * - Combines keywords and tag_tags into single keywords array
 */
export function toSearchResultFromVoyager(doc: VoyagerDoc) {
  // Parse bbox if available (format: "minLng minLat maxLng maxLat" - space separated)
  let bounds: [[number, number], [number, number]] | null = null;

  if (doc.bbox) {
    // Voyager returns bbox as space-separated: "minLng minLat maxLng maxLat"
    // Handle both space and comma separators for flexibility
    const parts = doc.bbox.trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts.every((p) => !isNaN(p))) {
      bounds = [
        [parts[1], parts[0]], // [minLat, minLng]
        [parts[3], parts[2]], // [maxLat, maxLng]
      ];
    }
  }

  return {
    id: doc.id,
    title: doc.title || doc.name || "Untitled",
    format: doc.format || doc.format_type || "Unknown",
    formatType: doc.format_type,
    formatCategory: doc.format_category,
    description: doc.abstract || doc.description || "",
    thumbnail: doc.thumb || doc.path_to_thumb || DEFAULT_THUMBNAIL,
    bounds,
    bytes: doc.bytes,
    modified: doc.modified,
    keywords: doc.keywords || doc.tag_tags || [],
    country: doc.grp_Country,
    agency: doc.grp_Agency,
    acquisitionDate: doc.fd_acquisition_date,
    publishDate: doc.fd_publish_date,
    geometryType: doc.geometry_type,
    download: doc.download,
    fullpath: doc.fullpath || doc.absolute_path,
  };
}

/**
 * Fetches a single document by ID from the Voyager API
 *
 * @param id - Document ID to retrieve
 * @returns Promise resolving to VoyagerDoc or null if not found
 * @throws Error if request fails
 * @internal
 */
async function fetchVoyagerItem(id: string): Promise<VoyagerDoc | null> {
  const params = new URLSearchParams({
    ...VOYAGER_CONFIG,
    q: `id:"${id}"`,
    rows: "1",
    // Request all fields plus computed fields (thumbURL, absolute path, etc.)
    fl: "*,thumb:[thumbURL],fullpath:[absolute],download:[downloadURL],geo:[geo]",
  });

  const response = await fetch(`/api/voyager/search?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Failed to fetch item");
  }

  const data: VoyagerSearchResponse = await response.json();
  if (data.response.docs.length === 0) {
    return null;
  }

  return data.response.docs[0];
}

/**
 * React Query hook for fetching a single Voyager item by ID
 *
 * @param id - Document ID to retrieve, or null to skip
 * @returns React Query result with normalized item data including raw doc
 *
 * @remarks
 * Query is disabled when id is null. Result includes both normalized fields
 * and the raw VoyagerDoc for access to additional fields.
 *
 * @example
 * ```typescript
 * const { data, isLoading } = useVoyagerItem('doc-123');
 * if (data) {
 *   console.log(data.title, data.raw.geo);
 * }
 * ```
 */
export function useVoyagerItem(id: string | null) {
  return useQuery({
    queryKey: ["voyagerItem", id],
    queryFn: async () => {
      if (!id) return null;
      const doc = await fetchVoyagerItem(id);
      if (!doc) return null;
      return {
        ...toSearchResultFromVoyager(doc),
        // Include raw doc data for additional fields
        raw: doc,
      };
    },
    enabled: !!id,
  });
}
