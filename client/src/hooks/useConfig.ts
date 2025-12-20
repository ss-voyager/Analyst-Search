import { useQuery } from "@tanstack/react-query";

// ============================================================================
// TYPE DEFINITIONS (must match server/voyager-config.ts)
// ============================================================================

export type FilterType = "checkbox" | "radio" | "dropdown" | "tree" | "range" | "text";

export interface FilterOption {
  value: string;
  label: string;
  description?: string;
}

export interface BaseFilterConfig {
  id: string;
  label: string;
  enabled: boolean;
  defaultExpanded?: boolean;
  order: number;
}

export interface DateFilterConfig extends BaseFilterConfig {
  type: "date";
  modes: {
    range: boolean;
    since: boolean;
  };
  defaultMode: "range" | "since";
  defaultSinceValue: number;
  defaultSinceUnit: "days" | "weeks" | "months" | "years";
  fields: {
    defaultField: string;
    showFieldSelector: boolean;
    options: FilterOption[];
  };
}

export interface LocationFilterConfig extends BaseFilterConfig {
  type: "tree";
  maxHeight: number;
  showSearch: boolean;
}

export interface KeywordsFilterConfig extends BaseFilterConfig {
  type: "checkbox";
  maxHeight: number;
  showSearch: boolean;
  groupByCategory: boolean;
  initialDisplayCount: number;
}

export interface PropertiesFilterConfig extends BaseFilterConfig {
  type: "checkbox" | "toggle";
  options: FilterOption[];
}

export interface FiltersConfig {
  date: DateFilterConfig;
  location: LocationFilterConfig;
  keywords: KeywordsFilterConfig;
  properties: PropertiesFilterConfig;
}

export interface AppConfig {
  filters: FiltersConfig;
  pagination: {
    defaultPageSize: number;
  };
  defaultSort: string;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

async function fetchConfig(): Promise<AppConfig> {
  const response = await fetch("/api/config");
  if (!response.ok) {
    throw new Error("Failed to fetch config");
  }
  return response.json();
}

/**
 * Hook to fetch application configuration from the backend
 * This config includes all filter settings and app-wide settings
 */
export function useConfig() {
  return useQuery({
    queryKey: ["appConfig"],
    queryFn: fetchConfig,
    staleTime: Infinity, // Config rarely changes, no need to refetch
    gcTime: Infinity, // Keep in cache forever
  });
}

// ============================================================================
// DEFAULT CONFIG (used while loading or if fetch fails)
// ============================================================================

export const DEFAULT_CONFIG: AppConfig = {
  filters: {
    date: {
      id: "date",
      label: "Date",
      type: "date",
      enabled: true,
      order: 1,
      modes: { range: true, since: true },
      defaultMode: "range",
      defaultSinceValue: 7,
      defaultSinceUnit: "days",
      fields: {
        defaultField: "modified",
        showFieldSelector: false,
        options: [
          { value: "modified", label: "Date Modified", description: "Last modified date" },
        ],
      },
    },
    location: {
      id: "location",
      label: "Location Hierarchy",
      type: "tree",
      enabled: false,
      order: 2,
      defaultExpanded: true,
      maxHeight: 300,
      showSearch: false,
    },
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
    properties: {
      id: "properties",
      label: "Properties",
      type: "checkbox",
      enabled: true,
      order: 4,
      defaultExpanded: true,
      options: [
        { value: "has_thumbnail", label: "Has Thumbnail" },
        { value: "has_spatial", label: "Has Spatial Info" },
        { value: "has_temporal", label: "Has Temporal Info" },
        { value: "is_downloadable", label: "Downloadable" },
      ],
    },
  },
  pagination: {
    defaultPageSize: 48,
  },
  defaultSort: "score desc",
};
