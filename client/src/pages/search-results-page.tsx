import { useState, useEffect, useMemo } from "react";
import { useLocation, useSearch } from "wouter";
import {
  Search, MapPin, Filter, Clock, Star, Share2, Mail, Copy, Info, ArrowUpDown, PanelRightOpen, PanelRightClose, PanelLeftOpen, PanelLeftClose, Map, User, LogIn, Check, Tag, X, Bookmark, Settings, LogOut
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { SearchFilters, DateFilterMode, SinceUnit } from "@/features/search/components/search-filters";
import { useConfig, DEFAULT_CONFIG, type FiltersConfig } from "@/hooks/useConfig";
import { SearchResultsList } from "@/features/search/components/search-results-list";
import { SearchMap } from "@/features/search/components/search-map";
import { HIERARCHY_TREE, getAllDescendantIds, getAllAncestorIds, areAllChildrenSelected, findNodeById, LOCATION_TO_VOYAGER } from "@/features/search/location-hierarchy";
import { useSaveSearch, useSavedSearches, useLoadSavedSearch } from "@/features/search/api";
import { useInfiniteVoyagerSearch, toSearchResultFromVoyager, buildPropertyFilterQueries, buildLocationFilterQueries } from "@/features/search/voyager-api";
import type { VoyagerSearchResult } from "@/features/search/types";
import { queryGazetteer, type GazetteerResult } from "@/features/search/gazetteer-api";


export default function SearchResultsPage() {
  const [location, setLocation] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const { user, isAuthenticated, isLoading: authLoading, login, logout } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Fetch app config from backend
  const { data: appConfig, isLoading: configLoading } = useConfig();
  const config = appConfig || DEFAULT_CONFIG;
  
  const [query, setQuery] = useState(() => {
    const q = params.get("q") || "";
    const l = params.get("loc") || "";
    if (q && l) return `${q} in ${l}`;
    if (l) return l;
    return q;
  });
  const [detectedType, setDetectedType] = useState<'keyword' | 'place' | 'mixed'>('keyword');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Search State
  const [keyword, setKeyword] = useState(params.get("q") || "");
  const [place, setPlace] = useState(params.get("loc") || "");
  
  // UI State
  const [showMap, setShowMap] = useState(true);
  const [showFacets, setShowFacets] = useState(true);
  const [sortBy, setSortBy] = useState("relevance");
  const [isLoading, setIsLoading] = useState(true);
  const [isLocationFocused, setIsLocationFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Filter States
  const [activeFilters, setActiveFilters] = useState<{type: string, value: string, id: string}[]>([]);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [topLevelSelectionIds, setTopLevelSelectionIds] = useState<string[]>([]); // Track which items were directly clicked
  const [date, setDate] = useState<DateRange | undefined>();
  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>(config.filters.date.defaultMode);
  const [sinceValue, setSinceValue] = useState<number>(config.filters.date.defaultSinceValue);
  const [sinceUnit, setSinceUnit] = useState<SinceUnit>(config.filters.date.defaultSinceUnit);
  const [dateField, setDateField] = useState<string>(config.filters.date.fields.defaultField);
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>(() => {
    const keywordsParam = params.get("keywords");
    return keywordsParam ? [keywordsParam] : [];
  });
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [keywordSearch, setKeywordSearch] = useState("");
  const [hoveredResultId, setHoveredResultId] = useState<number | string | null>(null);
  const [previewedResultId, setPreviewedResultId] = useState<number | string | null>(null);
  const [mapStyle, setMapStyle] = useState<'streets' | 'satellite'>('streets');

  // Gazetteer State
  const [gazetteerGeometries, setGazetteerGeometries] = useState<GazetteerResult[]>([]);

  // Saved Search State
  const [isSaveSearchOpen, setIsSaveSearchOpen] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState("");
  const [saveSearchNotify, setSaveSearchNotify] = useState(false);
  const [saveSearchEmail, setSaveSearchEmail] = useState("");
  const [saveSearchFrequency, setSaveSearchFrequency] = useState<"hourly" | "daily" | "weekly">("daily");
  const [isSearchSaved, setIsSearchSaved] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [savedSearchLink, setSavedSearchLink] = useState("https://voyager.ai/s/a8XkD4");
  const [showAllSavedSearches, setShowAllSavedSearches] = useState(false);
  
  // Fetch saved searches from API (use authenticated user ID or fetch anonymous searches)
  const { data: savedSearchesData, isLoading: savedSearchesLoading } = useSavedSearches(
    isAuthenticated && user ? user.id : undefined
  );
  const saveSearchMutation = useSaveSearch();
  const loadSavedSearchMutation = useLoadSavedSearch();

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await login();
    } catch (error) {
      console.error('Login failed:', error);
      toast.error('Login failed. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleSaveSearch = () => {
    // Require authentication - no anonymous saves
    if (!isAuthenticated || !user) {
      toast.error("Please log in to save searches", {
        description: "Saved searches require authentication.",
      });
      setIsSaveSearchOpen(false);
      return;
    }

    saveSearchMutation.mutate({
      userId: user.id, // Always include userId (required)
      name: saveSearchName,
      keyword,
      location: place,
      locationIds: selectedLocationIds.length > 0 ? selectedLocationIds : undefined,
      keywords: selectedKeywords.length > 0 ? selectedKeywords : undefined,
      properties: selectedProperties.length > 0 ? selectedProperties : undefined,
      dateFrom: date?.from,
      dateTo: date?.to,
      spatialFilter,
      notifyOnNewResults: saveSearchNotify ? 1 : 0,
    }, {
      onSuccess: () => {
        setIsSaveSearchOpen(false);
        toast.success("Search saved successfully", {
          description: "You can create multiple saved searches.",
          action: {
            label: "View Saved",
            onClick: () => setShowShareModal(true),
          },
        });
      },
      onError: (error: any) => {
        console.error("Save search error:", error);
        const errorMessage = error?.message || "An unknown error occurred";
        console.log("Showing error toast with message:", errorMessage);
        toast.error("Failed to save search", {
          description: errorMessage,
        });
      },
    });
  };

  const copyLink = () => {
    navigator.clipboard.writeText(savedSearchLink);
    toast.success("Link copied to clipboard");
  };

  const PLACE_SUGGESTIONS = [
    // Major Cities
    "New York, USA",
    "Los Angeles, USA",
    "Chicago, USA",
    "Houston, USA",
    "Phoenix, USA",
    "San Francisco, USA",
    "Seattle, USA",
    "Miami, USA",
    "Boston, USA",
    "Denver, USA",
    "Atlanta, USA",
    "London, UK",
    "Manchester, UK",
    "Edinburgh, UK",
    "Tokyo, Japan",
    "Osaka, Japan",
    "Kyoto, Japan",
    "Paris, France",
    "Lyon, France",
    "Marseille, France",
    "Berlin, Germany",
    "Munich, Germany",
    "Frankfurt, Germany",
    "Sydney, Australia",
    "Melbourne, Australia",
    "Brisbane, Australia",
    "Perth, Australia",
    "Singapore",
    "Dubai, UAE",
    "Abu Dhabi, UAE",
    "Rio de Janeiro, Brazil",
    "São Paulo, Brazil",
    "Toronto, Canada",
    "Vancouver, Canada",
    "Montreal, Canada",
    "Mexico City, Mexico",
    "Mumbai, India",
    "Delhi, India",
    "Bangalore, India",
    "Beijing, China",
    "Shanghai, China",
    "Hong Kong, China",
    "Seoul, South Korea",
    "Bangkok, Thailand",
    "Jakarta, Indonesia",
    "Moscow, Russia",
    "Cape Town, South Africa",
    "Cairo, Egypt",
    "Lagos, Nigeria",
    // US States
    "California, USA",
    "Texas, USA",
    "Florida, USA",
    "New York State, USA",
    "Alaska, USA",
    "Hawaii, USA",
    "Arizona, USA",
    "Colorado, USA",
    "Washington, USA",
    "Oregon, USA",
    "Nevada, USA",
    "Utah, USA",
    "Montana, USA",
    "Wyoming, USA",
    "Iowa, USA",
    "Louisiana, USA",
    // Countries
    "United States",
    "United Kingdom",
    "Canada",
    "Australia",
    "Germany",
    "France",
    "Japan",
    "China",
    "India",
    "Brazil",
    "Mexico",
    "Italy",
    "Spain",
    "South Korea",
    "Russia",
    "Indonesia",
    "Thailand",
    "Vietnam",
    "Philippines",
    "Egypt",
    "South Africa",
    "Nigeria",
    "Kenya",
    "Morocco",
    // Continents & Regions
    "North America",
    "South America",
    "Europe",
    "Asia",
    "Africa",
    "Australia",
    "Antarctica",
    "Middle East",
    "Southeast Asia",
    "Central America",
    "Caribbean",
    "Scandinavia",
    // Natural Features
    "Amazon Rainforest, Brazil",
    "Sahara Desert, Africa",
    "Great Barrier Reef, Australia",
    "Himalayas, Nepal",
    "Mount Everest, Nepal",
    "Grand Canyon, USA",
    "Yellowstone, USA",
    "Yosemite, USA",
    "Rocky Mountains, USA",
    "Alps, Europe",
    "Andes Mountains, South America",
    "Great Lakes, USA",
    "Mississippi River, USA",
    "Nile River, Egypt",
    "Amazon River, Brazil",
    "Arctic Circle",
    "Antarctic Peninsula",
    "Greenland",
    "Iceland",
    "Galapagos Islands, Ecuador",
    "Madagascar",
    "Borneo, Indonesia",
    "Congo Rainforest, Africa",
    "Serengeti, Tanzania",
    "Great Rift Valley, Africa"
  ];

  const filteredPlaces = PLACE_SUGGESTIONS.filter(p => 
    p.toLowerCase().includes(place.toLowerCase())
  );

  // Reset selection when suggestions change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [place]);

  // Handle URL param changes (e.g., when navigating from item detail page with keyword filter)
  useEffect(() => {
    const currentParams = new URLSearchParams(searchString);
    const keywordsParam = currentParams.get("keywords");
    if (keywordsParam) {
      // Set the keyword from URL (replacing any existing URL-based keywords)
      setSelectedKeywords([keywordsParam]);
      // Clear the URL param after applying to avoid it persisting
      setLocation("/search", { replace: true });
    }
  }, [searchString, setLocation]);

  const { theme } = useTheme();
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const checkTheme = () => {
      if (theme === 'system') {
        setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
      } else {
        setIsDark(theme === 'dark');
      }
    };
    checkTheme();
    
    // Listener for system changes if theme is system
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') checkTheme();
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Drawing State
  const [drawMode, setDrawMode] = useState<'none' | 'box' | 'point' | 'polygon'>('none');
  const [spatialFilter, setSpatialFilter] = useState<{type: 'box' | 'point' | 'polygon', data: any} | null>(null);

  // Build filter queries from selected properties (has_spatial, has_thumbnail, etc.)
  const propertyFilterQueries: string[] = useMemo(() => {
    return buildPropertyFilterQueries(selectedProperties);
  }, [selectedProperties]);

  // Build location filter queries from selected locations (grp_Region, grp_Country, grp_State)
  // NOTE: Disabled for now - Voyager data may not have these facet fields indexed.
  // The gazetteerBbox spatial filter provides geographic filtering instead.
  const locationFilterQueries: string[] = useMemo(() => {
    // TODO: Re-enable when Voyager facet fields are confirmed:
    // return buildLocationFilterQueries(topLevelSelectionIds, LOCATION_TO_VOYAGER);
    console.log('Location selection IDs:', topLevelSelectionIds);
    return []; // Rely on gazetteerBbox spatial filter instead
  }, [topLevelSelectionIds]);

  // Combine all filter queries
  const filterQueries: string[] = useMemo(() => {
    return [...propertyFilterQueries, ...locationFilterQueries];
  }, [propertyFilterQueries, locationFilterQueries]);

  // Build search query from keyword
  const searchQuery = keyword ? keyword : undefined;

  // Calculate effective date range based on filter mode
  const effectiveDateRange = useMemo((): DateRange | undefined => {
    if (dateFilterMode === "range") {
      return date;
    }

    // Calculate "since" date range
    if (dateFilterMode === "since" && sinceValue > 0) {
      const now = new Date();
      const from = new Date();

      switch (sinceUnit) {
        case "days":
          from.setDate(now.getDate() - sinceValue);
          break;
        case "weeks":
          from.setDate(now.getDate() - (sinceValue * 7));
          break;
        case "months":
          from.setMonth(now.getMonth() - sinceValue);
          break;
        case "years":
          from.setFullYear(now.getFullYear() - sinceValue);
          break;
      }

      return { from, to: now };
    }

    return undefined;
  }, [dateFilterMode, date, sinceValue, sinceUnit]);

  // Helper to extract bounding box from GeoJSON geometry
  const extractBoundsFromGeoJSON = (geo: any): [number, number, number, number] | null => {
    if (!geo || !geo.coordinates) return null;

    let allCoords: number[][] = [];

    if (geo.type === 'MultiPolygon') {
      // Flatten all polygons
      geo.coordinates.forEach((polygon: any) => {
        polygon.forEach((ring: any) => {
          allCoords.push(...ring);
        });
      });
    } else if (geo.type === 'Polygon') {
      geo.coordinates.forEach((ring: any) => {
        allCoords.push(...ring);
      });
    }

    if (allCoords.length === 0) return null;

    const lngs = allCoords.map(c => c[0]);
    const lats = allCoords.map(c => c[1]);

    return [
      Math.min(...lngs),
      Math.min(...lats),
      Math.max(...lngs),
      Math.max(...lats)
    ];
  };

  // Helper to convert gazetteer geometries to combined bounding box
  const convertGeometriesToBbox = (geometries: GazetteerResult[]): [number, number, number, number] | undefined => {
    if (geometries.length === 0) return undefined;

    let minLng = Infinity, minLat = Infinity;
    let maxLng = -Infinity, maxLat = -Infinity;

    geometries.forEach(result => {
      const bounds = extractBoundsFromGeoJSON(result.geo);
      if (bounds) {
        minLng = Math.min(minLng, bounds[0]);
        minLat = Math.min(minLat, bounds[1]);
        maxLng = Math.max(maxLng, bounds[2]);
        maxLat = Math.max(maxLat, bounds[3]);
      }
    });

    if (minLng === Infinity) return undefined;
    return [minLng, minLat, maxLng, maxLat];
  };

  // Query gazetteer for top-level location selections
  const queryGazetteerForLocations = async (topLevelIds: string[]) => {
    if (topLevelIds.length === 0) {
      setGazetteerGeometries([]);
      return;
    }

    // Get labels for top-level IDs
    const locationLabels = topLevelIds.map(id => {
      const node = findNodeById(id, HIERARCHY_TREE);
      return node?.label;
    }).filter(Boolean) as string[];

    try {
      const results = await queryGazetteer(locationLabels);
      setGazetteerGeometries(results);
    } catch (error) {
      console.error('Gazetteer query error:', error);
      setGazetteerGeometries([]);
    }
  };

  // Extract bbox from spatialFilter for map-based search
  // spatialFilter.data is a Leaflet LatLngBounds object with methods getWest(), getSouth(), getEast(), getNorth()
  const bboxFilter: [number, number, number, number] | undefined =
    spatialFilter?.type === 'box' && spatialFilter.data
      ? [
          spatialFilter.data.getWest(), // west (minLng)
          spatialFilter.data.getSouth(), // south (minLat)
          spatialFilter.data.getEast(), // east (maxLng)
          spatialFilter.data.getNorth(), // north (maxLat)
        ]
      : undefined;

  // Calculate bbox from gazetteer geometries (location hierarchy)
  const gazetteerBbox = gazetteerGeometries.length > 0
    ? convertGeometriesToBbox(gazetteerGeometries)
    : undefined;

  // Voyager API calls with infinite pagination
  const {
    data: searchData,
    isLoading: isSearchLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteVoyagerSearch({
    q: searchQuery,
    fq: filterQueries,
    sort: sortBy === 'relevance' ? 'score desc'
        : sortBy === 'date_desc' ? 'modified desc'
        : sortBy === 'date_asc' ? 'modified asc'
        : sortBy === 'name_asc' ? 'title_sort asc'
        : sortBy === 'name_desc' ? 'title_sort desc'
        : 'score desc',
    dateFrom: effectiveDateRange?.from,
    dateTo: effectiveDateRange?.to,
    dateField: dateField, // Use selected date field from config
    bbox: bboxFilter,           // Map-drawn bbox (if exists)
    gazetteerBbox: gazetteerBbox, // Location hierarchy bbox (if exists)
    place: place || undefined,
    keywords: selectedKeywords.length > 0 ? selectedKeywords : undefined, // Selected keywords filter
  });

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  // Convert Voyager results to UI format (flatten all pages)
  const filteredResults: VoyagerSearchResult[] = searchData?.pages
    ? searchData.pages.flatMap(page => page.response.docs.map(toSearchResultFromVoyager))
    : [];

  // Track available keywords - accumulate from results, don't reset when filtering
  // This prevents keywords from disappearing when a keyword filter is applied
  const [availableKeywords, setAvailableKeywords] = useState<string[]>([]);

  // Update available keywords when results change, but preserve existing ones
  // Only fully reset when base search criteria (not keywords) change
  useEffect(() => {
    if (filteredResults.length > 0) {
      const keywordSet = new Set<string>(availableKeywords);
      filteredResults.forEach(result => {
        if (result.keywords && Array.isArray(result.keywords)) {
          result.keywords.forEach(kw => {
            const normalized = typeof kw === 'string' ? kw.trim() : '';
            if (normalized) {
              keywordSet.add(normalized);
            }
          });
        }
      });
      const sorted = Array.from(keywordSet).sort((a, b) =>
        a.toLowerCase().localeCompare(b.toLowerCase())
      );
      // Only update if there are new keywords
      if (sorted.length > availableKeywords.length) {
        setAvailableKeywords(sorted);
      }
    }
  }, [filteredResults]);

  // Reset available keywords when base search changes (not keyword selection)
  const baseSearchKey = useMemo(() =>
    JSON.stringify({ q: searchQuery, fq: filterQueries, dateFrom: date?.from, dateTo: date?.to, bbox: bboxFilter, gazetteerBbox, place }),
    [searchQuery, filterQueries, date?.from, date?.to, bboxFilter, gazetteerBbox, place]
  );

  useEffect(() => {
    // Clear keywords when base search changes so they refresh from new results
    setAvailableKeywords([]);
  }, [baseSearchKey]);

  // Total results count from Voyager (from first page)
  const totalResults = searchData?.pages?.[0]?.response?.numFound || 0;

  const [searchHistory, setSearchHistory] = useState<string[]>([
    "Vegetation in California",
    "Urban Growth in Tokyo",
    "Deforestation in Amazon",
    "Floods in Pakistan"
  ]);

  const handleHistorySelect = (historyItem: string) => {
      setQuery(historyItem);
      
      // Trigger search logic
      let searchKeyword = historyItem;
      let searchLocation = "";
      const lowerQuery = historyItem.toLowerCase();
      
      if (lowerQuery.includes(" in ")) {
          const parts = historyItem.split(/ in /i);
          searchKeyword = parts[0];
          searchLocation = parts[1];
      } else if (PLACE_SUGGESTIONS.some(p => p.toLowerCase().includes(lowerQuery))) {
          searchKeyword = "";
          searchLocation = historyItem;
      }

      setKeyword(searchKeyword);
      setPlace(searchLocation);
      setLocation(`/search?q=${encodeURIComponent(searchKeyword)}&loc=${encodeURIComponent(searchLocation)}`);
      setIsSearchFocused(false);
      setIsLoading(true);
      setTimeout(() => setIsLoading(false), 800);
  };

  // Detect input type for visual feedback
  useEffect(() => {
    const lowerQuery = query.toLowerCase();
    if (lowerQuery.includes(" in ")) {
      setDetectedType('mixed');
    } else if (PLACE_SUGGESTIONS.some(p => p.toLowerCase().includes(lowerQuery)) && query.length > 2) {
      setDetectedType('place');
    } else {
      setDetectedType('keyword');
    }
  }, [query]);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Use the current keyword and place values directly
    setLocation(`/search?q=${encodeURIComponent(keyword)}&loc=${encodeURIComponent(place)}`);
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 800);
  };

  const handleLocationFilterSelect = (id: string, label: string) => {
    setSelectedLocationIds(prev => {
      const isSelected = prev.includes(id);
      let newSelection = [...prev];

      if (isSelected) {
        // Unchecking: remove this node, all descendants, and all ancestors
        const descendantIds = getAllDescendantIds(id, HIERARCHY_TREE);
        const ancestorIds = getAllAncestorIds(id, HIERARCHY_TREE);
        const idsToRemove = new Set([...descendantIds, ...ancestorIds]);

        newSelection = newSelection.filter(locId => !idsToRemove.has(locId));

        // Remove from top-level selections - but keep any ancestor that's in topLevel
        setTopLevelSelectionIds(curr => {
          // Check if any ancestor is in topLevel
          const ancestorInTopLevel = ancestorIds.find(ancestorId => curr.includes(ancestorId));

          if (ancestorInTopLevel) {
            // Keep the ancestor, only remove this node and its descendants
            return curr.filter(locId => locId !== id && !descendantIds.includes(locId));
          }

          // No ancestor in topLevel, remove everything
          return curr.filter(locId => !idsToRemove.has(locId));
        });

        // Remove all affected filter badges
        setActiveFilters(curr => curr.filter(f => !idsToRemove.has(f.id.replace('loc-', ''))));
      } else {
        // Checking: add this node and all descendants
        const descendantIds = getAllDescendantIds(id, HIERARCHY_TREE);
        descendantIds.forEach(descId => {
          if (!newSelection.includes(descId)) {
            newSelection.push(descId);
          }
        });

        // Check if we should auto-check ancestors
        const ancestorIds = getAllAncestorIds(id, HIERARCHY_TREE);
        ancestorIds.forEach(ancestorId => {
          if (areAllChildrenSelected(ancestorId, newSelection, HIERARCHY_TREE)) {
            if (!newSelection.includes(ancestorId)) {
              newSelection.push(ancestorId);
            }
          }
        });

        // Mark this as a top-level selection (the one that should be highlighted)
        setTopLevelSelectionIds(curr => {
          // First, remove any descendants from top-level (if Asia is clicked, remove Japan from top-level)
          const descendantsToRemove = new Set(descendantIds);
          let filtered = curr.filter(locId => !descendantsToRemove.has(locId) || locId === id);

          // Check if any ancestor is already in topLevel
          const hasAncestorInTopLevel = ancestorIds.some(ancestorId => curr.includes(ancestorId));

          if (hasAncestorInTopLevel) {
            // Don't change topLevel - keep the ancestor highlighted
            return curr;
          }

          // Remove any ancestors from top-level (if California is clicked first, then NA)
          filtered = filtered.filter(locId => !ancestorIds.includes(locId));

          // Add this as the new top-level (if not already there)
          if (!filtered.includes(id)) {
            return [...filtered, id];
          }
          return filtered;
        });

        // Add filter badge only for the clicked node
        if (!activeFilters.find(f => f.id === `loc-${id}`)) {
          setActiveFilters(curr => [...curr, { type: 'location', value: label, id: `loc-${id}` }]);
        }
      }

      return newSelection;
    });
  };

  const toggleProperty = (prop: string) => {
    setSelectedProperties(prev => {
      if (prev.includes(prop)) return prev.filter(p => p !== prop);
      return [...prev, prop];
    });
  };

  // Query gazetteer when top-level selections change
  useEffect(() => {
    queryGazetteerForLocations(topLevelSelectionIds);
  }, [topLevelSelectionIds]);

  const toggleKeyword = (kw: string) => {
    setSelectedKeywords(prev => {
      if (prev.includes(kw)) {
        return prev.filter(k => k !== kw);
      }
      return [...prev, kw];
    });
  };

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev => {
      if (prev.includes(platform)) return prev.filter(p => p !== platform);
      return [...prev, platform];
    });
  };

  const removeFilter = (id: string) => {
    if (id.startsWith('loc-')) {
      const locId = id.replace('loc-', '');
      setSelectedLocationIds(prev => prev.filter(lid => locId !== lid));
    } else if (id.startsWith('kw-')) {
      const kw = id.replace('kw-', '');
      setSelectedKeywords(prev => prev.filter(k => k !== kw));
    }
    setActiveFilters(prev => prev.filter(f => f.id !== id));
  };

  const clearLocation = () => {
    setPlace("");
    setSpatialFilter(null);
    setLocation(`/search?q=${encodeURIComponent(keyword)}&loc=`);
  };

  return (
    <div 
      className="flex flex-col h-screen w-full bg-background text-foreground overflow-hidden"
    >
      
      {/* Row 1: Search Bar Row */}
      <header className="border-b border-border bg-background/95 backdrop-blur-md z-20 shrink-0">
        <div className="h-14 flex items-center px-4 gap-3">
          {/* Logo */}
          <button 
            onClick={() => setLocation("/")}
            className="flex items-center gap-2 shrink-0 hover:opacity-80 transition-opacity"
          >
            <span className="font-display font-bold text-lg tracking-tight">
              <span className="text-[#3b82f6]">V</span>
              <span className="text-[#0c3a6d] dark:text-white">o</span>
              <span className="text-[#3b82f6]">yager</span>
            </span>
          </button>

          {/* Keyword Search Bar */}
          <form onSubmit={handleSearch} className="flex-1 max-w-md relative">
            <div className="relative flex items-center bg-muted/50 dark:bg-black/50 border border-border rounded-lg px-3 h-9 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <input 
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="bg-transparent border-none outline-none text-sm w-full placeholder:text-muted-foreground/70 text-foreground font-medium ml-2"
                placeholder="Search keywords..."
                data-testid="input-keyword-search"
              />
            </div>
          </form>

          {/* Place Search Bar */}
          <div className="flex-1 max-w-sm relative">
            <div className={`relative flex items-center bg-muted/50 dark:bg-black/50 border border-border rounded-lg px-3 h-9 transition-all ${isLocationFocused ? 'ring-2 ring-primary/20 border-primary/50' : ''}`}>
              <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
              <input 
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                onFocus={() => setIsLocationFocused(true)}
                onBlur={() => setTimeout(() => setIsLocationFocused(false), 150)}
                className="bg-transparent border-none outline-none text-sm w-full placeholder:text-muted-foreground/70 text-foreground font-medium ml-2"
                placeholder="Location..."
                data-testid="input-location-search"
              />
            </div>
            {/* Location Suggestions */}
            {isLocationFocused && place.length > 0 && filteredPlaces.length > 0 && (
              <div className="absolute top-full left-0 w-full mt-1 bg-background border border-border rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                {filteredPlaces.slice(0, 6).map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => { setPlace(p); setIsLocationFocused(false); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2"
                  >
                    <MapPin className="w-3 h-3 text-muted-foreground" />
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search Button */}
          <Button type="submit" size="sm" className="h-9 px-4" onClick={handleSearch}>
            <Search className="w-4 h-4" />
          </Button>

          {/* Spacer to push right items */}
          <div className="flex-1" />

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Saved Searches Button */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-9 gap-2"
            onClick={() => setShowAllSavedSearches(true)}
            data-testid="button-saved-searches"
          >
            <Bookmark className="w-4 h-4" />
            <span className="hidden sm:inline">Saved</span>
          </Button>

          {/* Account / Login */}
          {isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full w-9 h-9 p-0" data-testid="button-account">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user.profileImageUrl || undefined} alt={user.firstName || user.name || user.username || "User"} />
                    <AvatarFallback className="text-xs">
                      {user.firstName?.[0] || user.name?.[0] || user.username?.[0] || user.email?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5 text-sm font-medium">{user.firstName || user.name || user.username || user.email || "User"}</div>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer gap-2">
                  <User className="w-4 h-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer gap-2">
                  <Settings className="w-4 h-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-2"
              onClick={handleLogin}
              disabled={isLoggingIn}
              data-testid="button-login"
            >
              <LogIn className="w-4 h-4" />
              <span className="hidden sm:inline">{isLoggingIn ? 'Opening...' : 'Login'}</span>
            </Button>
          )}
        </div>

        {/* Row 2: Toolbar Row */}
        <div className="h-10 flex items-center px-4 gap-3 border-t border-border/50 bg-muted/30">
          {/* Filter Panel Toggle - Left Side */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant={showFacets ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-2 gap-1 shrink-0"
                  onClick={() => setShowFacets(!showFacets)}
                  data-testid="button-toggle-filters"
                >
                  {showFacets ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
                  <Filter className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{showFacets ? 'Collapse Filters' : 'Expand Filters'}</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Active Filters Breadcrumb */}
          <div className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar">
            {keyword && (
              <Badge variant="secondary" className="gap-1 pl-2 pr-1 py-0.5 font-normal text-xs">
                <Search className="w-3 h-3 opacity-50" />
                {keyword}
                <button onClick={() => setKeyword("")} className="ml-1 hover:bg-background/20 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            
            {place && (
              <Badge variant="secondary" className="gap-1 pl-2 pr-1 py-0.5 font-normal text-xs">
                <MapPin className="w-3 h-3 opacity-50" />
                {place}
                <button onClick={clearLocation} className="ml-1 hover:bg-background/20 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}

            {effectiveDateRange?.from && (
              <Badge variant="secondary" className="gap-1 pl-2 pr-1 py-0.5 font-normal text-xs">
                <Clock className="w-3 h-3 opacity-50" />
                {dateFilterMode === "since" ? (
                  <>Last {sinceValue} {sinceUnit}</>
                ) : effectiveDateRange.to ? (
                  <>{format(effectiveDateRange.from, "MMM dd")} - {format(effectiveDateRange.to, "MMM dd")}</>
                ) : (
                  format(effectiveDateRange.from, "MMM dd")
                )}
                <button onClick={() => {
                  setDate(undefined);
                  setDateFilterMode("range");
                  setSinceValue(7);
                  setSinceUnit("days");
                }} className="ml-1 hover:bg-background/20 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}

            {activeFilters.map(filter => (
              <Badge key={filter.id} variant="secondary" className="gap-1 pl-2 pr-1 py-0.5 font-normal text-xs">
                <span className="opacity-50 capitalize">{filter.type}:</span>
                {filter.value}
                <button onClick={() => removeFilter(filter.id)} className="ml-1 hover:bg-background/20 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}

            {selectedProperties.map(prop => {
              const label = prop === 'has_thumbnail' ? 'Has Thumbnail' : 
                           prop === 'has_spatial' ? 'Has Spatial' : 
                           prop === 'has_temporal' ? 'Has Temporal' : 
                           prop === 'is_downloadable' ? 'Downloadable' : prop;
              return (
                <Badge key={prop} variant="secondary" className="gap-1 pl-2 pr-1 py-0.5 font-normal text-xs">
                  <Check className="w-3 h-3 opacity-50" />
                  {label}
                  <button onClick={() => toggleProperty(prop)} className="ml-1 hover:bg-background/20 rounded-full p-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              );
            })}

            {selectedKeywords.map(kw => (
              <Badge key={kw} variant="secondary" className="gap-1 pl-2 pr-1 py-0.5 font-normal text-xs">
                <Tag className="w-3 h-3 opacity-50" />
                {kw}
                <button onClick={() => toggleKeyword(kw)} className="ml-1 hover:bg-background/20 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}

            {selectedPlatforms.map(platform => (
              <Badge key={platform} variant="secondary" className="gap-1 pl-2 pr-1 py-0.5 font-normal text-xs">
                <Check className="w-3 h-3 opacity-50" />
                {platform}
                <button onClick={() => togglePlatform(platform)} className="ml-1 hover:bg-background/20 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}

            {(keyword || place || activeFilters.length > 0 || effectiveDateRange?.from || selectedProperties.length > 0 || selectedKeywords.length > 0 || selectedPlatforms.length > 0 || spatialFilter) && (
              <button
                onClick={() => {
                  setKeyword("");
                  setPlace("");
                  setSpatialFilter(null);
                  setActiveFilters([]);
                  setSelectedLocationIds([]);
                  setSelectedProperties([]);
                  setSelectedKeywords([]);
                  setSelectedPlatforms([]);
                  setDate(undefined);
                  setDateFilterMode(config.filters.date.defaultMode);
                  setSinceValue(config.filters.date.defaultSinceValue);
                  setSinceUnit(config.filters.date.defaultSinceUnit);
                  setDateField(config.filters.date.fields.defaultField);
                  setIsSearchSaved(false);
                  setLocation("/search");
                }}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors whitespace-nowrap"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="w-px h-5 bg-border" />

          {/* Results Count */}
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {totalResults.toLocaleString()} results
          </span>

          {/* Sort Options */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[140px] h-7 text-xs bg-transparent border-border">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-3 h-3" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">Relevance</SelectItem>
              <SelectItem value="date_desc">Newest first</SelectItem>
              <SelectItem value="date_asc">Oldest first</SelectItem>
              <SelectItem value="name_asc">Name A-Z</SelectItem>
              <SelectItem value="name_desc">Name Z-A</SelectItem>
            </SelectContent>
          </Select>

          {/* Save Search */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  onClick={() => {
                    if (!isAuthenticated) {
                      toast.error("Please log in to save searches", {
                        description: "Saved searches require authentication.",
                      });
                      return;
                    }
                    setIsSaveSearchOpen(true);
                    setSaveSearchName(keyword || place || "New Search");
                  }}
                  disabled={!isAuthenticated}
                  data-testid="button-save-search"
                >
                  <Star className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Save</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {!isAuthenticated
                  ? "Log in to save searches"
                  : "Save this search"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Map Panel Toggle - Right Side */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant={showMap ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-2 gap-1 shrink-0"
                  onClick={() => setShowMap(!showMap)}
                  data-testid="button-toggle-map"
                >
                  <Map className="w-3.5 h-3.5" />
                  {showMap ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{showMap ? 'Collapse Map' : 'Expand Map'}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

           {/* Save Search Modal */}
           <Dialog open={isSaveSearchOpen} onOpenChange={setIsSaveSearchOpen}>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-primary fill-primary/20" />
                    Save Search
                  </DialogTitle>
                  <DialogDescription>
                    Save this search configuration to easily access it later and receive updates.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Search Name</Label>
                    <Input 
                      id="name" 
                      value={saveSearchName} 
                      onChange={(e) => setSaveSearchName(e.target.value)} 
                      className="col-span-3" 
                    />
                  </div>
                  
                  {/* Search Preview Summary */}
                  <div className="bg-muted/30 rounded-lg p-3 space-y-2 border border-border/50">
                     <div className="flex items-center justify-between mb-2">
                       <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Search Preview</div>
                       <Badge variant="secondary" className="text-xs font-medium">
                         {totalResults.toLocaleString()} results
                       </Badge>
                     </div>
                     <div className="space-y-1">
                        <div className="flex items-start gap-2 text-sm">
                           <Search className="w-3.5 h-3.5 mt-0.5 text-primary" />
                           <span className="text-foreground/80">{keyword || "All keywords"}</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm">
                           <MapPin className="w-3.5 h-3.5 mt-0.5 text-primary" />
                           <span className="text-foreground/80">{place || spatialFilter ? (place || "Custom Area") : "Global"}</span>
                        </div>
                        {(activeFilters.length > 0 || date || selectedKeywords.length > 0) && (
                           <div className="flex items-start gap-2 text-sm">
                             <Filter className="w-3.5 h-3.5 mt-0.5 text-primary" />
                             <span className="text-foreground/80">
                               {[
                                 date ? `${format(date.from!, "MMM d")}${date.to ? ` - ${format(date.to, "MMM d")}` : ""}` : null,
                                 ...activeFilters.map(f => f.value),
                                 ...selectedKeywords,
                                 ...selectedProperties.map(p => p.replace('has_', '').replace('is_', ''))
                               ].filter(Boolean).join(", ")}
                             </span>
                           </div>
                        )}
                     </div>
                  </div>

                  <div className="border rounded-lg p-3 bg-muted/10 space-y-3">
                    <div className="flex items-center justify-between space-x-2">
                      <div className="flex flex-col gap-1">
                        <Label htmlFor="notify" className="font-medium cursor-pointer">Email Notifications</Label>
                        <span className="text-xs text-muted-foreground">Get notified when new results appear</span>
                      </div>
                      <Switch id="notify" checked={saveSearchNotify} onCheckedChange={setSaveSearchNotify} />
                    </div>

                    {saveSearchNotify && (
                      <div className="space-y-3 pt-2 border-t border-border/50">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Info className="w-4 h-4" />
                          <span>Email notifications have not been enabled.</span>
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor="notify-email" className="text-sm text-muted-foreground">Email when new content is indexed:</Label>
                          <Input
                            id="notify-email"
                            type="email"
                            placeholder="your@email.com"
                            value={saveSearchEmail}
                            onChange={(e) => setSaveSearchEmail(e.target.value)}
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor="notify-frequency" className="text-sm text-muted-foreground">Frequency:</Label>
                          <Select value={saveSearchFrequency} onValueChange={(v) => setSaveSearchFrequency(v as "hourly" | "daily" | "weekly")}>
                            <SelectTrigger id="notify-frequency">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="hourly">Hourly</SelectItem>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                  <Button variant="outline" onClick={() => setIsSaveSearchOpen(false)}>Cancel</Button>
                  <Button onClick={handleSaveSearch}>Save Search</Button>
                </DialogFooter>
              </DialogContent>
           </Dialog>

           {/* Share Modal */}
           <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
             <DialogContent className="sm:max-w-md">
               <DialogHeader>
                 <DialogTitle className="flex items-center gap-2">
                   <Share2 className="w-5 h-5 text-primary" />
                   Share Search
                 </DialogTitle>
                 <DialogDescription>
                   Anyone with this link can view these search results.
                 </DialogDescription>
               </DialogHeader>
               <div className="flex items-center space-x-2 mt-2">
                 <div className="grid flex-1 gap-2">
                   <Label htmlFor="link" className="sr-only">
                     Link
                   </Label>
                   <Input
                     id="link"
                     defaultValue={savedSearchLink}
                     readOnly
                     className="bg-muted/30 font-mono text-xs"
                   />
                 </div>
                 <Button type="submit" size="sm" className="px-3" onClick={copyLink}>
                   <span className="sr-only">Copy</span>
                   <Copy className="h-4 w-4" />
                 </Button>
               </div>
               <div className="flex flex-col gap-2 mt-4">
                  <Button variant="outline" className="w-full justify-start text-muted-foreground hover:text-foreground">
                    <Mail className="w-4 h-4 mr-2" />
                    Email to colleague
                  </Button>
               </div>
               <DialogFooter className="sm:justify-start">
                 <div className="flex items-center space-x-2">
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      Results may vary based on user permissions
                    </div>
                 </div>
               </DialogFooter>
             </DialogContent>
           </Dialog>

           {/* All Saved Searches Dialog */}
           <Dialog open={showAllSavedSearches} onOpenChange={setShowAllSavedSearches}>
             <DialogContent className="sm:max-w-lg">
               <DialogHeader>
                 <DialogTitle className="flex items-center gap-2">
                   <Bookmark className="w-5 h-5" />
                   Saved Searches
                 </DialogTitle>
                 <DialogDescription>
                   Select a saved search to load its results.
                 </DialogDescription>
               </DialogHeader>
               <div className="max-h-[400px] overflow-y-auto">
                 {savedSearchesLoading ? (
                   <div className="flex items-center justify-center py-8 text-muted-foreground">
                     Loading saved searches...
                   </div>
                 ) : !savedSearchesData || savedSearchesData.filter(s => user?.id && s.userId && s.userId === user.id).length === 0 ? (
                   <div className="flex flex-col items-center justify-center py-8 text-center">
                     <Bookmark className="w-10 h-10 text-muted-foreground/50 mb-3" />
                     <p className="text-sm text-muted-foreground">No saved searches yet</p>
                     <p className="text-xs text-muted-foreground/70 mt-1">Save a search to quickly access it later</p>
                   </div>
                 ) : (
                   <div className="flex flex-col gap-1">
                     {savedSearchesData.filter(s => user?.id && s.userId && s.userId === user.id).map((search) => (
                       <div
                         key={search.id}
                         className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors flex items-center justify-between group"
                       >
                         <button
                           className="flex-1 text-left"
                           disabled={loadSavedSearchMutation.isPending}
                           onClick={() => {
                             // Prevent multiple clicks
                             if (loadSavedSearchMutation.isPending) return;

                             // Fetch the full saved search by ID and apply it
                             loadSavedSearchMutation.mutate(search.id, {
                               onSuccess: (savedSearch) => {
                                 console.log('Loaded saved search:', savedSearch);
                                 console.log('Keywords to apply:', savedSearch.keywords);
                                 console.log('LocationIds to apply:', savedSearch.locationIds);

                                 // Clear all previous state first
                                 setActiveFilters([]);
                                 setSelectedLocationIds([]);
                                 setTopLevelSelectionIds([]);
                                 setSelectedKeywords([]);
                                 setSelectedProperties([]);
                                 setDate(undefined);
                                 setSpatialFilter(null);
                                 setGazetteerGeometries([]);

                                 // Apply saved search values
                                 const newKeyword = savedSearch.keyword || "";
                                 const newPlace = savedSearch.location || "";

                                 setKeyword(newKeyword);
                                 setPlace(newPlace);

                                 if (savedSearch.keywords && savedSearch.keywords.length > 0) {
                                   setSelectedKeywords(savedSearch.keywords);
                                 }
                                 if (savedSearch.locationIds && savedSearch.locationIds.length > 0) {
                                   setSelectedLocationIds(savedSearch.locationIds);
                                   setTopLevelSelectionIds(savedSearch.locationIds);
                                   // Query gazetteer to get geometries for map zoom
                                   queryGazetteerForLocations(savedSearch.locationIds);
                                 }
                                 if (savedSearch.properties && savedSearch.properties.length > 0) {
                                   setSelectedProperties(savedSearch.properties);
                                 }
                                 if (savedSearch.dateFrom || savedSearch.dateTo) {
                                   setDate({
                                     from: savedSearch.dateFrom ? new Date(savedSearch.dateFrom) : undefined,
                                     to: savedSearch.dateTo ? new Date(savedSearch.dateTo) : undefined,
                                   });
                                 }
                                 if (savedSearch.spatialFilter) {
                                   setSpatialFilter(savedSearch.spatialFilter);
                                 }

                                 // Update URL to trigger search
                                 setLocation(`/search?q=${encodeURIComponent(newKeyword)}&loc=${encodeURIComponent(newPlace)}`);

                                 setShowAllSavedSearches(false);
                                 toast.success(`Loaded "${savedSearch.name}"`);
                               },
                               onError: (error) => {
                                 console.error("Failed to load saved search:", error);
                                 toast.error("Failed to load saved search");
                               },
                             });
                           }}
                           data-testid={`saved-search-${search.id}`}
                         >
                           <div className="flex flex-col gap-0.5">
                             <span className="font-medium text-sm">{search.name}</span>
                             <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                               {search.keyword && (
                                 <span className="flex items-center gap-1">
                                   <Search className="w-3 h-3" />
                                   {search.keyword}
                                 </span>
                               )}
                               {search.location && (
                                 <span className="flex items-center gap-1">
                                   <MapPin className="w-3 h-3" />
                                   {search.location}
                                 </span>
                               )}
                               {search.keywords && search.keywords.length > 0 && (
                                 <span className="flex items-center gap-1">
                                   <Tag className="w-3 h-3" />
                                   {search.keywords.length} keywords
                                 </span>
                               )}
                             </div>
                           </div>
                         </button>
                         <span className="text-xs text-muted-foreground">
                           {search.createdAt ? new Date(search.createdAt).toLocaleDateString() : ""}
                         </span>
                       </div>
                     ))}
                   </div>
                 )}
               </div>
             </DialogContent>
           </Dialog>
      </header>

      {/* Main Split Layout */}
      <div className="flex-1 flex overflow-hidden relative min-h-0">
        {/* Facets Panel (Refactored) */}
        <SearchFilters
          showFacets={showFacets}
          filtersConfig={config.filters}
          date={date}
          setDate={setDate}
          dateFilterMode={dateFilterMode}
          setDateFilterMode={setDateFilterMode}
          sinceValue={sinceValue}
          setSinceValue={setSinceValue}
          sinceUnit={sinceUnit}
          setSinceUnit={setSinceUnit}
          dateField={dateField}
          setDateField={setDateField}
          hierarchyTree={HIERARCHY_TREE}
          handleLocationFilterSelect={handleLocationFilterSelect}
          selectedLocationIds={selectedLocationIds}
          topLevelSelectionIds={topLevelSelectionIds}
          keywords={availableKeywords}
          keywordSearch={keywordSearch}
          setKeywordSearch={setKeywordSearch}
          toggleKeyword={toggleKeyword}
          selectedKeywords={selectedKeywords}
          selectedProperties={selectedProperties}
          toggleProperty={toggleProperty}
        />

        {/* Results Grid (Refactored) */}
        <SearchResultsList
          isLoading={isLoading || isSearchLoading}
          filteredResults={filteredResults}
          setHoveredResultId={setHoveredResultId}
          setPreviewedResultId={setPreviewedResultId}
          setLocation={setLocation}
          onFilterByFormat={(format) => setKeyword(format)}
          onFilterByProvider={(provider) => setKeyword(provider)}
          showFacets={showFacets}
          showMap={showMap}
          onLoadMore={fetchNextPage}
          hasMore={hasNextPage}
          isLoadingMore={isFetchingNextPage}
        />

        {/* Right Panel - Map (Refactored) */}
        <SearchMap
           showMap={showMap}
           setShowMap={setShowMap}
           mapStyle={mapStyle}
           setMapStyle={setMapStyle}
           isDark={isDark}
           filteredResults={filteredResults}
           hoveredResultId={hoveredResultId}
           previewedResultId={previewedResultId}
           drawMode={drawMode}
           setDrawMode={setDrawMode}
           setSpatialFilter={setSpatialFilter}
           setPlace={setPlace}
           spatialFilter={spatialFilter}
           locationBbox={gazetteerBbox}
        />
      </div>
    </div>
  );
}
