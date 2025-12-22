import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Search, Copy, Check, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl } from "@/lib/queryClient";

// Voyager API configuration
const VOYAGER_CONFIG = {
  disp: "D187992491DF",
  "voyager.config.id": "D187992491DF",
  wt: "json",
};

// Default search fields
const DEFAULT_SEARCH_FIELDS = "id,title,name:[name],format,abstract,fullpath:[absolute],absolute_path:[absolute],thumb:[thumbURL],path_to_thumb,subject,download:[downloadURL],format_type,bytes,modified,shard:[shard],bbox,geo:[geo],format_category,component_files,ags_fused_cache,linkcount__children,contains_name,wms_layer_name,tag_flags,hasMissingData,layerURL:[lyrURL],hasLayerFile,likes,dislikes,grp_Country,fl_views,views,description,keywords,fd_acquisition_date,name,name_alias,tag_tags,fd_publish_date,grp_Agency,fs_english_name,fs_title,fs_product_detail_link";

// Facet fields configuration
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
const FACET_DISPLAY_NAMES: Record<string, string> = {
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

interface FacetValue {
  name: string;
  count: number;
  selected: boolean;
}

interface FacetCategory {
  field: string;
  displayName: string;
  values: FacetValue[];
  isOpen: boolean;
}

export default function VoyagerSearchPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [facets, setFacets] = useState<FacetCategory[]>([]);
  const [searchResponse, setSearchResponse] = useState<any>(null);
  const [facetResponse, setFacetResponse] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isFetchingFacets, setIsFetchingFacets] = useState(false);
  const [copiedSearch, setCopiedSearch] = useState(false);
  const [copiedFacets, setCopiedFacets] = useState(false);
  const { toast } = useToast();

  // Parse facet response into structured data
  const parseFacetResponse = useCallback((data: any): FacetCategory[] => {
    if (!data?.facet_counts?.facet_fields) return [];

    const facetFields = data.facet_counts.facet_fields;
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
            selected: false,
          });
        }
      }

      if (parsedValues.length > 0) {
        categories.push({
          field,
          displayName: FACET_DISPLAY_NAMES[field] || field,
          values: parsedValues,
          isOpen: false,
        });
      }
    }

    return categories;
  }, []);

  // Build facet query parameters
  const buildFacetQueryParams = useCallback(() => {
    const params: Record<string, string> = {
      ...VOYAGER_CONFIG,
      rows: "0",
      facet: "true",
      "facet.mincount": "1",
      "facet.limit": "50",
    };

    for (const field of FACET_FIELDS) {
      params[`facet.field`] = field; // This will be handled specially
      params[`f.${field}.facet.mincount`] = "1";
      if (field.includes("grp_") || field === "format" || field === "format_type") {
        params[`f.${field}.facet.sort`] = "index";
      }
    }

    return params;
  }, []);

  // Build search query parameters
  const buildSearchQueryParams = useCallback(() => {
    const params: Record<string, string> = {
      ...VOYAGER_CONFIG,
      rows: "48",
      start: "0",
      fl: DEFAULT_SEARCH_FIELDS,
      "extent.bbox": "true",
      block: "true",
      sort: "bytes desc",
    };

    if (searchQuery.trim()) {
      params.q = searchQuery.trim();
    }

    // Add selected facet filters
    const filterQueries: string[] = [];
    for (const category of facets) {
      const selectedValues = category.values.filter((v) => v.selected);
      if (selectedValues.length > 0) {
        const escaped = selectedValues.map((v) => `"${v.name}"`).join(" OR ");
        filterQueries.push(`${category.field}:(${escaped})`);
      }
    }

    if (filterQueries.length > 0) {
      params.fq = filterQueries.join(" AND ");
    }

    return params;
  }, [searchQuery, facets]);

  // Fetch facets from API
  const fetchFacets = useCallback(async (additionalParams?: Record<string, string>) => {
    setIsFetchingFacets(true);
    try {
      const baseParams = buildFacetQueryParams();
      const params = { ...baseParams, ...additionalParams };

      // Build URL with multiple facet.field params
      const url = new URL(getApiUrl("/api/voyager/facets"), window.location.origin);
      for (const [key, value] of Object.entries(params)) {
        if (key !== "facet.field") {
          url.searchParams.append(key, value);
        }
      }
      // Add all facet fields
      for (const field of FACET_FIELDS) {
        url.searchParams.append("facet.field", `{!ex=${field}}${field}`);
      }

      // If URL is too long, use POST
      if (url.toString().length > 2000) {
        const response = await fetch(getApiUrl("/api/voyager/facets"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(Object.fromEntries(url.searchParams)),
        });
        const data = await response.json();
        setFacetResponse(data);
        const parsedFacets = parseFacetResponse(data);
        setFacets(parsedFacets);
      } else {
        const response = await fetch(url.toString());
        const data = await response.json();
        setFacetResponse(data);
        const parsedFacets = parseFacetResponse(data);
        setFacets(parsedFacets);
      }
    } catch (error) {
      console.error("Error fetching facets:", error);
      toast({
        title: "Error",
        description: "Failed to fetch facets from Voyager API",
        variant: "destructive",
      });
    } finally {
      setIsFetchingFacets(false);
    }
  }, [buildFacetQueryParams, parseFacetResponse, toast]);

  // Fetch search results from API
  const fetchSearch = useCallback(async () => {
    setIsSearching(true);
    try {
      const params = buildSearchQueryParams();

      const url = new URL(getApiUrl("/api/voyager/search"), window.location.origin);
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.append(key, value);
      }

      // If URL is too long, use POST
      if (url.toString().length > 2000) {
        const response = await fetch(getApiUrl("/api/voyager/search"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });
        const data = await response.json();
        setSearchResponse(data);
      } else {
        const response = await fetch(url.toString());
        const data = await response.json();
        setSearchResponse(data);
      }
    } catch (error) {
      console.error("Error fetching search results:", error);
      toast({
        title: "Error",
        description: "Failed to fetch search results from Voyager API",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  }, [buildSearchQueryParams, toast]);

  // Perform both search and facet queries
  const performSearch = useCallback(async () => {
    await Promise.all([fetchSearch(), fetchFacets()]);
  }, [fetchSearch, fetchFacets]);

  // Initial load - fetch facets and search
  useEffect(() => {
    performSearch();
  }, []);

  // Handle search button click
  const handleSearch = () => {
    performSearch();
  };

  // Handle facet selection
  const handleFacetToggle = (categoryIndex: number, valueIndex: number) => {
    setFacets((prev) => {
      const updated = [...prev];
      updated[categoryIndex] = {
        ...updated[categoryIndex],
        values: updated[categoryIndex].values.map((v, i) =>
          i === valueIndex ? { ...v, selected: !v.selected } : v
        ),
      };
      return updated;
    });
  };

  // Handle category expand/collapse
  const handleCategoryToggle = (categoryIndex: number) => {
    setFacets((prev) => {
      const updated = [...prev];
      updated[categoryIndex] = {
        ...updated[categoryIndex],
        isOpen: !updated[categoryIndex].isOpen,
      };
      return updated;
    });
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string, type: "search" | "facets") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "search") {
        setCopiedSearch(true);
        setTimeout(() => setCopiedSearch(false), 2000);
      } else {
        setCopiedFacets(true);
        setTimeout(() => setCopiedFacets(false), 2000);
      }
      toast({
        title: "Copied!",
        description: `${type === "search" ? "Search" : "Facet"} results copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  // Get selected facets summary
  const getSelectedFacetsSummary = () => {
    const selected: string[] = [];
    for (const category of facets) {
      const selectedValues = category.values.filter((v) => v.selected);
      if (selectedValues.length > 0) {
        selected.push(`${category.displayName}: ${selectedValues.map((v) => v.name).join(", ")}`);
      }
    }
    return selected;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Voyager Search</h1>
          <p className="text-muted-foreground">Query the Voyager Solr API</p>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Search Bar */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Enter search query..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="w-full"
                />
              </div>
              <Button onClick={handleSearch} disabled={isSearching || isFetchingFacets}>
                {isSearching ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Search
              </Button>
            </div>

            {/* Selected Facets Summary */}
            {getSelectedFacetsSummary().length > 0 && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Active Filters:</p>
                <div className="flex flex-wrap gap-2">
                  {getSelectedFacetsSummary().map((summary, i) => (
                    <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                      {summary}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-12 gap-6">
          {/* Facets Sidebar */}
          <div className="col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Facets</span>
                  {isFetchingFacets && <Loader2 className="h-4 w-4 animate-spin" />}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                  {facets.length === 0 && !isFetchingFacets && (
                    <p className="text-sm text-muted-foreground">No facets available</p>
                  )}
                  {facets.map((category, categoryIndex) => (
                    <Collapsible
                      key={category.field}
                      open={category.isOpen}
                      onOpenChange={() => handleCategoryToggle(categoryIndex)}
                      className="mb-3"
                    >
                      <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted rounded-lg text-left">
                        <span className="font-medium text-sm">{category.displayName}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            ({category.values.length})
                          </span>
                          {category.isOpen ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pl-2 pt-2">
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {category.values.map((value, valueIndex) => (
                            <label
                              key={`${category.field}-${value.name}`}
                              className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted p-1 rounded"
                            >
                              <Checkbox
                                checked={value.selected}
                                onCheckedChange={() => handleFacetToggle(categoryIndex, valueIndex)}
                              />
                              <span className="flex-1 truncate" title={value.name}>
                                {value.name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                ({value.count.toLocaleString()})
                              </span>
                            </label>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Results Area */}
          <div className="col-span-9 space-y-6">
            {/* Search Results */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>
                    Search Results
                    {searchResponse?.response?.numFound !== undefined && (
                      <span className="ml-2 text-sm font-normal text-muted-foreground">
                        ({searchResponse.response.numFound.toLocaleString()} total)
                      </span>
                    )}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(JSON.stringify(searchResponse, null, 2), "search")}
                    disabled={!searchResponse}
                  >
                    {copiedSearch ? (
                      <Check className="h-4 w-4 mr-2" />
                    ) : (
                      <Copy className="h-4 w-4 mr-2" />
                    )}
                    Copy
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto whitespace-pre-wrap">
                    {isSearching ? (
                      <span className="text-muted-foreground">Loading search results...</span>
                    ) : searchResponse ? (
                      JSON.stringify(searchResponse, null, 2)
                    ) : (
                      <span className="text-muted-foreground">No search results yet</span>
                    )}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Facet Results */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Facet Query Results</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(JSON.stringify(facetResponse, null, 2), "facets")}
                    disabled={!facetResponse}
                  >
                    {copiedFacets ? (
                      <Check className="h-4 w-4 mr-2" />
                    ) : (
                      <Copy className="h-4 w-4 mr-2" />
                    )}
                    Copy
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto whitespace-pre-wrap">
                    {isFetchingFacets ? (
                      <span className="text-muted-foreground">Loading facet results...</span>
                    ) : facetResponse ? (
                      JSON.stringify(facetResponse, null, 2)
                    ) : (
                      <span className="text-muted-foreground">No facet results yet</span>
                    )}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
