/**
 * Voyager Search Configuration
 *
 * This file contains configuration settings for the Voyager search API.
 * Modify these settings to customize search behavior across the application.
 *
 * IMPORTANT: After making changes, restart the server to apply them.
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type FilterType = "checkbox" | "radio" | "dropdown" | "tree" | "range" | "text";

export interface FilterOption {
  value: string;
  label: string;
  description?: string;
}

export interface BaseFilterConfig {
  /** Unique identifier for this filter */
  id: string;
  /** Display label for the filter section */
  label: string;
  /** Whether this filter is visible in the UI */
  enabled: boolean;
  /** Whether the filter section is expanded by default (for accordion-style filters) */
  defaultExpanded?: boolean;
  /** Order in which this filter appears (lower = higher) */
  order: number;
}

export interface DateFilterConfig extends BaseFilterConfig {
  type: "date";
  /** Available date modes */
  modes: {
    range: boolean;  // Enable date range picker
    since: boolean;  // Enable "since X days/weeks/months" option
  };
  /** Default mode when filter is first used */
  defaultMode: "range" | "since";
  /** Default "since" value */
  defaultSinceValue: number;
  /** Default "since" unit */
  defaultSinceUnit: "days" | "weeks" | "months" | "years";
  /** Date field configuration */
  fields: {
    /** Default date field to filter on */
    defaultField: string;
    /** Whether to show field selector dropdown */
    showFieldSelector: boolean;
    /** Available date fields */
    options: FilterOption[];
  };
}

export interface LocationFilterConfig extends BaseFilterConfig {
  type: "tree";
  /** Maximum height of the tree container in pixels */
  maxHeight: number;
  /** Whether to show search input for filtering locations */
  showSearch: boolean;
}

export interface KeywordsFilterConfig extends BaseFilterConfig {
  type: "checkbox";
  /** Maximum height of the keywords container in pixels */
  maxHeight: number;
  /** Whether to show search input for filtering keywords */
  showSearch: boolean;
  /** Whether to group keywords by category */
  groupByCategory: boolean;
  /** Maximum number of keywords to show before "show more" */
  initialDisplayCount: number;
}

export interface PropertiesFilterConfig extends BaseFilterConfig {
  type: "checkbox" | "toggle";
  /** Available property options */
  options: FilterOption[];
}

export interface CustomFacetFilterConfig extends BaseFilterConfig {
  type: "checkbox" | "radio" | "dropdown";
  /** Solr field to facet on */
  solrField: string;
  /** Maximum number of facet values to show */
  limit: number;
  /** Sort order for facet values */
  sort: "count" | "index";
  /** Whether to show search input */
  showSearch: boolean;
}

// Union type for all filter configs
export type FilterConfig =
  | DateFilterConfig
  | LocationFilterConfig
  | KeywordsFilterConfig
  | PropertiesFilterConfig
  | CustomFacetFilterConfig;

export interface FiltersConfig {
  date: DateFilterConfig;
  location: LocationFilterConfig;
  keywords: KeywordsFilterConfig;
  properties: PropertiesFilterConfig;
  // Add custom facet filters here if needed
  // customFacets?: CustomFacetFilterConfig[];
}

export interface VoyagerConfig {
  /** Base URL for the Voyager Solr API */
  baseUrl: string;
  /** Solr display configuration ID */
  displayId: string;
  /** All filter configurations */
  filters: FiltersConfig;
  /** Pagination settings */
  pagination: {
    defaultPageSize: number;
    maxPageSize: number;
  };
  /** Default sort order */
  defaultSort: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export const voyagerConfig: VoyagerConfig = {
  baseUrl: "http://ec2-3-232-18-200.compute-1.amazonaws.com",

  displayId: "D187992491DF",

  filters: {
    // ========================================================================
    // DATE FILTER
    // ========================================================================
    date: {
      id: "date",
      label: "Date",
      type: "date",
      enabled: true,
      order: 1,

      // Date mode options
      modes: {
        range: true,   // Show date range picker (start/end dates)
        since: true,   // Show "since X days/weeks/months" option
      },
      defaultMode: "range",
      defaultSinceValue: 7,
      defaultSinceUnit: "days",

      // Date field configuration
      fields: {
        defaultField: "modified",
        showFieldSelector: false,  // Set to true to show date field dropdown
        options: [
          {
            value: "modified",
            label: "Date Modified",
            description: "Last modified date of the record (most reliable)",
          },
          {
            value: "created",
            label: "Date Created",
            description: "Date the record was created in the system",
          },
          {
            value: "fd_acquisition_date",
            label: "Acquisition Date",
            description: "Date the data was acquired or captured",
          },
          {
            value: "fd_publish_date",
            label: "Publish Date",
            description: "Date the data was published",
          },
        ],
      },
    },

    // ========================================================================
    // LOCATION HIERARCHY FILTER
    // ========================================================================
    location: {
      id: "location",
      label: "Location Hierarchy",
      type: "tree",
      enabled: false,
      order: 2,
      defaultExpanded: true,
      maxHeight: 300,
      showSearch: false, // Set to true to enable location search
    },

    // ========================================================================
    // KEYWORDS FILTER
    // ========================================================================
    keywords: {
      id: "keywords",
      label: "Keywords",
      type: "checkbox",
      enabled: true,
      order: 3,
      defaultExpanded: true,
      maxHeight: 300,
      showSearch: true,
      groupByCategory: true,
      initialDisplayCount: 10,
    },

    // ========================================================================
    // PROPERTIES FILTER
    // ========================================================================
    properties: {
      id: "properties",
      label: "Properties",
      type: "checkbox",  // Can be "checkbox" or "toggle"
      enabled: true,
      order: 4,
      defaultExpanded: true,
      options: [
        {
          value: "has_thumbnail",
          label: "Has Thumbnail",
          description: "Filter to items with preview images",
        },
        {
          value: "has_spatial",
          label: "Has Spatial Info",
          description: "Filter to items with geographic coordinates",
        },
        {
          value: "has_temporal",
          label: "Has Temporal Info",
          description: "Filter to items with date/time information",
        },
        {
          value: "is_downloadable",
          label: "Downloadable",
          description: "Filter to items that can be downloaded",
        },
      ],
    },
  },

  pagination: {
    defaultPageSize: 48,
    maxPageSize: 100,
  },

  defaultSort: "score desc",
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the config for frontend consumption
 * Excludes sensitive backend-only settings
 */
export function getPublicConfig() {
  return {
    filters: voyagerConfig.filters,
    pagination: {
      defaultPageSize: voyagerConfig.pagination.defaultPageSize,
    },
    defaultSort: voyagerConfig.defaultSort,
  };
}

/**
 * Get enabled filters sorted by order
 */
export function getEnabledFilters(): FilterConfig[] {
  const filters = Object.values(voyagerConfig.filters) as FilterConfig[];
  return filters
    .filter(f => f.enabled)
    .sort((a, b) => a.order - b.order);
}

/**
 * Check if a specific filter is enabled
 */
export function isFilterEnabled(filterId: keyof FiltersConfig): boolean {
  return voyagerConfig.filters[filterId]?.enabled ?? false;
}
