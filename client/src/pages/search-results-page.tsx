import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { 
  Search, MapPin, Filter, ArrowLeft, History, Clock, Star, Share2, Mail, Copy, Info, ArrowUpDown, PanelRightOpen, PanelRightClose, PanelLeftOpen, PanelLeftClose, Map, User, LogIn
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
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

// Feature Imports
import { SearchFilters } from "@/features/search/components/search-filters";
import { SearchResultsList } from "@/features/search/components/search-results-list";
import { SearchMap } from "@/features/search/components/search-map";
import { HIERARCHY_TREE, KEYWORDS } from "@/features/search/mock-data";
import { useSatelliteItems, useSaveSearch } from "@/features/search/api";
import { toSearchResult } from "@/features/search/types";

export default function SearchResultsPage() {
  const [location, setLocation] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  
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
  const [date, setDate] = useState<DateRange | undefined>();
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [keywordSearch, setKeywordSearch] = useState("");
  const [hoveredResultId, setHoveredResultId] = useState<number | null>(null);
  const [previewedResultId, setPreviewedResultId] = useState<number | null>(null);
  const [mapStyle, setMapStyle] = useState<'streets' | 'satellite'>('streets');
  
  // Saved Search State
  const [isSaveSearchOpen, setIsSaveSearchOpen] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState("");
  const [saveSearchNotify, setSaveSearchNotify] = useState(true);
  const [isSearchSaved, setIsSearchSaved] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [savedSearchLink, setSavedSearchLink] = useState("https://voyager.ai/s/a8XkD4");

  const saveSearchMutation = useSaveSearch();

  const handleSaveSearch = () => {
    saveSearchMutation.mutate({
      userId: "demo-user", // In production, get from auth context
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
        setIsSearchSaved(true);
        setIsSaveSearchOpen(false);
        toast.success("Search saved successfully", {
          description: "You will be notified when new results match this query.",
          action: {
            label: "Share",
            onClick: () => setShowShareModal(true),
          },
        });
      },
      onError: () => {
        toast.error("Failed to save search", {
          description: "Please try again later.",
        });
      },
    });
  };

  const copyLink = () => {
    navigator.clipboard.writeText(savedSearchLink);
    toast.success("Link copied to clipboard");
  };

  const PLACE_SUGGESTIONS = [
    "New York, USA",
    "London, UK",
    "Tokyo, Japan",
    "Paris, France",
    "Berlin, Germany",
    "Sydney, Australia",
    "San Francisco, USA",
    "Singapore",
    "Dubai, UAE",
    "Rio de Janeiro, Brazil",
    "California",
    "United States",
    "Africa",
    "Amazon Rainforest",
    "Los Angeles",
    "China",
    "India"
  ];

  const filteredPlaces = PLACE_SUGGESTIONS.filter(p => 
    p.toLowerCase().includes(place.toLowerCase())
  );

  // Reset selection when suggestions change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [place]);

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

  // API call to fetch satellite items
  const { data: satelliteData, isLoading: isApiLoading, error } = useSatelliteItems({
    keyword,
    locationIds: selectedLocationIds.length > 0 ? selectedLocationIds : undefined,
    keywords: selectedKeywords.length > 0 ? selectedKeywords : undefined,
    properties: selectedProperties.length > 0 ? selectedProperties : undefined,
    dateFrom: date?.from?.toISOString(),
    dateTo: date?.to?.toISOString(),
    sortBy: sortBy === 'relevance' ? undefined : sortBy,
    limit: 100,
  });

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  // Convert database results to search results
  const filteredResults = satelliteData ? satelliteData.map(toSearchResult) : [];

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simple "Intelligent" parsing
    let searchKeyword = query;
    let searchLocation = "";

    const lowerQuery = query.toLowerCase();
    
    // Check for "keyword in location" pattern
    if (lowerQuery.includes(" in ")) {
        const parts = query.split(/ in /i);
        searchKeyword = parts[0];
        searchLocation = parts[1];
    } 
    // Check if the whole query is a known place
    else if (PLACE_SUGGESTIONS.some(p => p.toLowerCase().includes(lowerQuery))) {
        searchKeyword = "";
        searchLocation = query;
    }

    setKeyword(searchKeyword);
    setPlace(searchLocation);
    setLocation(`/search?q=${encodeURIComponent(searchKeyword)}&loc=${encodeURIComponent(searchLocation)}`);
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 800);
  };

  const handleLocationFilterSelect = (id: string, label: string) => {
    setSelectedLocationIds(prev => {
      const isSelected = prev.includes(id);
      let newSelection;
      
      if (isSelected) {
        newSelection = prev.filter(locId => locId !== id);
        setActiveFilters(curr => curr.filter(f => f.id !== `loc-${id}`));
      } else {
        newSelection = [...prev, id];
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

  const toggleKeyword = (kw: string) => {
    setSelectedKeywords(prev => {
      if (prev.includes(kw)) {
        setActiveFilters(curr => curr.filter(f => f.id !== `kw-${kw}`));
        return prev.filter(k => k !== kw);
      }
      if (!activeFilters.find(f => f.id === `kw-${kw}`)) {
        setActiveFilters(curr => [...curr, { type: 'keyword', value: kw, id: `kw-${kw}` }]);
      }
      return [...prev, kw];
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
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                className="h-6 px-2 text-xs text-primary hover:text-primary/80 shrink-0"
                onClick={() => setDrawMode('box')}
              >
                <Map className="w-3 h-3 mr-1" />
                Draw
              </Button>
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

          {/* Account / Login */}
          {isAuthenticated && user ? (
            <Button variant="ghost" size="icon" className="rounded-full w-9 h-9 p-0">
              <Avatar className="w-8 h-8">
                <AvatarImage src={user.profileImageUrl || undefined} alt={user.firstName || "User"} />
                <AvatarFallback className="text-xs">
                  {user.firstName?.[0] || user.email?.[0] || "U"}
                </AvatarFallback>
              </Avatar>
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="h-9 gap-2" onClick={() => window.location.href = '/api/login'}>
              <LogIn className="w-4 h-4" />
              <span className="hidden sm:inline">Login</span>
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

            {date?.from && (
              <Badge variant="secondary" className="gap-1 pl-2 pr-1 py-0.5 font-normal text-xs">
                <Clock className="w-3 h-3 opacity-50" />
                {date.to ? (
                  <>{format(date.from, "MMM dd")} - {format(date.to, "MMM dd")}</>
                ) : (
                  format(date.from, "MMM dd")
                )}
                <button onClick={() => setDate(undefined)} className="ml-1 hover:bg-background/20 rounded-full p-0.5">
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

            {(keyword || place || activeFilters.length > 0 || date || selectedProperties.length > 0 || selectedKeywords.length > 0 || spatialFilter) && (
              <button 
                onClick={() => {
                  setKeyword("");
                  setPlace("");
                  setSpatialFilter(null);
                  setActiveFilters([]);
                  setSelectedLocationIds([]);
                  setSelectedProperties([]);
                  setSelectedKeywords([]);
                  setDate(undefined);
                  setLocation("/search");
                }} 
                className="text-xs text-muted-foreground hover:text-destructive transition-colors whitespace-nowrap"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Map Panel Toggle */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant={showMap ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-2 gap-1"
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

          <div className="w-px h-5 bg-border" />

          {/* Results Count */}
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {filteredResults.length} results
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
            </SelectContent>
          </Select>

          {/* Save Search */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant={isSearchSaved ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(
                    "h-7 gap-1.5 text-xs",
                    isSearchSaved && "bg-primary/10 text-primary"
                  )}
                  onClick={() => {
                    if (isSearchSaved) {
                      setShowShareModal(true);
                    } else {
                      setIsSaveSearchOpen(true);
                      setSaveSearchName(keyword || place || "New Search");
                    }
                  }}
                  data-testid="button-save-search"
                >
                  {isSearchSaved ? <Star className="w-3.5 h-3.5 fill-primary" /> : <Star className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{isSearchSaved ? "Saved" : "Save"}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isSearchSaved ? "Manage saved search" : "Save this search"}
              </TooltipContent>
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
                     <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Search Preview</div>
                     <div className="space-y-1">
                        <div className="flex items-start gap-2 text-sm">
                           <Search className="w-3.5 h-3.5 mt-0.5 text-primary" />
                           <span className="text-foreground/80">{keyword || "All keywords"}</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm">
                           <MapPin className="w-3.5 h-3.5 mt-0.5 text-primary" />
                           <span className="text-foreground/80">{place || spatialFilter ? (place || "Custom Area") : "Global"}</span>
                        </div>
                        {(activeFilters.length > 0 || date) && (
                           <div className="flex items-start gap-2 text-sm">
                             <Filter className="w-3.5 h-3.5 mt-0.5 text-primary" />
                             <span className="text-foreground/80">
                               {[
                                 date ? "Date Range" : null,
                                 ...activeFilters.map(f => f.value),
                                 ...selectedProperties.map(p => p.replace('has_', '').replace('is_', ''))
                               ].filter(Boolean).join(", ")}
                             </span>
                           </div>
                        )}
                     </div>
                  </div>

                  <div className="flex items-center justify-between space-x-2 border rounded-lg p-3 bg-muted/10">
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="notify" className="font-medium cursor-pointer">Email Notifications</Label>
                      <span className="text-xs text-muted-foreground">Get notified when new results appear</span>
                    </div>
                    <Switch id="notify" checked={saveSearchNotify} onCheckedChange={setSaveSearchNotify} />
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
      </header>

      {/* Main Split Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Facets Panel (Refactored) */}
        <SearchFilters
          showFacets={showFacets}
          setShowFacets={setShowFacets}
          date={date}
          setDate={setDate}
          hierarchyTree={HIERARCHY_TREE}
          handleLocationFilterSelect={handleLocationFilterSelect}
          selectedLocationIds={selectedLocationIds}
          keywords={KEYWORDS}
          keywordSearch={keywordSearch}
          setKeywordSearch={setKeywordSearch}
          toggleKeyword={toggleKeyword}
          selectedKeywords={selectedKeywords}
          selectedProperties={selectedProperties}
          toggleProperty={toggleProperty}
        />

        {/* Results Grid (Refactored) */}
        <SearchResultsList
          isLoading={isLoading}
          filteredResults={filteredResults}
          setHoveredResultId={setHoveredResultId}
          setPreviewedResultId={setPreviewedResultId}
          setLocation={setLocation}
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
        />
      </div>
    </div>
  );
}
