import { useQuery, useInfiniteQuery } from "@tanstack/react-query";

// Voyager API configuration
const VOYAGER_CONFIG = {
  disp: "D187992491DF",
  "voyager.config.id": "D187992491DF",
  wt: "json",
};

// Default search fields
const DEFAULT_SEARCH_FIELDS = "id,title,name:[name],format,abstract,fullpath:[absolute],absolute_path:[absolute],thumb:[thumbURL],path_to_thumb,subject,download:[downloadURL],format_type,bytes,modified,shard:[shard],bbox,geo:[geo],format_category,component_files,ags_fused_cache,linkcount__children,contains_name,wms_layer_name,tag_flags,hasMissingData,layerURL:[lyrURL],hasLayerFile,likes,dislikes,grp_Country,fl_views,views,description,keywords,fd_acquisition_date,name,name_alias,tag_tags,fd_publish_date,grp_Agency,fs_english_name,fs_title,fs_product_detail_link";

// Facet fields to request
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

// Display names for facet fields
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

export interface VoyagerSearchFilters {
  q?: string;
  location?: string;
  fq?: string[]; // filter queries for facets
  start?: number;
  rows?: number;
  sort?: string;
  dateFrom?: Date;
  dateTo?: Date;
  dateField?: string; // field to filter on, defaults to 'modified'
  bbox?: [number, number, number, number]; // [west, south, east, north] / [minLng, minLat, maxLng, maxLat]
  place?: string; // text-based place search
}

export interface VoyagerDoc {
  id: string;
  title?: string;
  name?: string;
  format?: string;
  format_type?: string;
  format_category?: string;
  abstract?: string;
  description?: string;
  thumb?: string;
  path_to_thumb?: string;
  bbox?: string;
  geo?: any;
  bytes?: number;
  modified?: string;
  keywords?: string[];
  tag_tags?: string[];
  grp_Country?: string;
  grp_Agency?: string;
  fd_acquisition_date?: string;
  fd_publish_date?: string;
  geometry_type?: string;
  [key: string]: any;
}

export interface VoyagerSearchResponse {
  responseHeader: {
    status: number;
    QTime: number;
    params: Record<string, any>;
  };
  response: {
    numFound: number;
    start: number;
    docs: VoyagerDoc[];
  };
  facet_counts?: {
    facet_fields: Record<string, (string | number)[]>;
  };
}

export interface FacetValue {
  name: string;
  count: number;
}

export interface FacetCategory {
  field: string;
  displayName: string;
  values: FacetValue[];
}

// Internal helper to format date range query for Solr
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

// Parse facet response into structured data
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

// Build search URL with parameters
function buildSearchUrl(filters: VoyagerSearchFilters): string {
  const url = new URL("/api/voyager/search", window.location.origin);

  // Add base config
  Object.entries(VOYAGER_CONFIG).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  // Add search query
  if (filters.q) {
    url.searchParams.append("q", filters.q);
  }

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

// Build facet URL with parameters
function buildFacetUrl(filters: VoyagerSearchFilters): string {
  const url = new URL("/api/voyager/facets", window.location.origin);

  // Add base config
  Object.entries(VOYAGER_CONFIG).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  // Add search query (facets should reflect current search)
  if (filters.q) {
    url.searchParams.append("q", filters.q);
  }

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

// Fetch search results
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

// Fetch facets
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

// React Query hook for Voyager search
export function useVoyagerSearch(filters: VoyagerSearchFilters) {
  return useQuery({
    queryKey: ["voyagerSearch", filters],
    queryFn: () => fetchVoyagerSearch(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// React Query infinite query hook for Voyager search with pagination
const ITEMS_PER_PAGE = 48;

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

// React Query hook for Voyager facets
export function useVoyagerFacets(filters: VoyagerSearchFilters) {
  return useQuery({
    queryKey: ["voyagerFacets", filters],
    queryFn: () => fetchVoyagerFacets(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Helper to build filter query from selected facets
export function buildFilterQuery(
  field: string,
  values: string[]
): string | null {
  if (!values || values.length === 0) return null;

  const escaped = values.map((v) => `"${v.replace(/"/g, '\\"')}"`).join(" OR ");
  return `{!tag=${field}}${field}:(${escaped})`;
}

// Helper to build date range filter query for Solr (exported wrapper)
export function buildDateRangeQuery(
  dateFrom?: Date,
  dateTo?: Date,
  field: string = "modified"
): string | null {
  return formatDateRangeQuery(dateFrom, dateTo, field);
}

// Helper to build keyword filter query for Solr
// Filters on the 'keywords' field which contains an array of keyword strings
export function buildKeywordFilterQuery(
  selectedKeywords: string[],
  field: string = "keywords"
): string | null {
  if (!selectedKeywords || selectedKeywords.length === 0) return null;

  const escaped = selectedKeywords.map((k) => `"${k.replace(/"/g, '\\"')}"`).join(" OR ");
  return `${field}:(${escaped})`;
}

// Mapping of property names to Solr field existence queries
// Using different strategies based on field type:
// - For indexed fields: use field:* or _exists_:field
// - For special cases: use related facetable fields
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

// Helper to build property filter queries for Solr
// Properties filter on field existence (e.g., has thumbnail, has spatial data)
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

// Location mapping type (imported from mock-data or defined here)
interface LocationMapping {
  field: string;
  value: string;
}

// Helper to build location filter queries from selected hierarchy IDs
// Creates a single OR query across all location fields so results match ANY selected location
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

// Convert Voyager doc to a format suitable for the UI
export function toSearchResultFromVoyager(doc: VoyagerDoc) {
  // Parse bbox if available (format: "minLng,minLat,maxLng,maxLat")
  let bounds: [[number, number], [number, number]] | null = null;
  if (doc.bbox) {
    const parts = doc.bbox.split(",").map(Number);
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
    thumbnail: doc.thumb || doc.path_to_thumb || "",
    bounds,
    bytes: doc.bytes,
    modified: doc.modified,
    keywords: doc.keywords || doc.tag_tags || [],
    country: doc.grp_Country,
    agency: doc.grp_Agency,
    acquisitionDate: doc.fd_acquisition_date,
    publishDate: doc.fd_publish_date,
    geometryType: doc.geometry_type,
  };
}
