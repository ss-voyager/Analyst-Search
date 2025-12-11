import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { 
  Search, MapPin, Filter, ArrowLeft, History, Clock, Star, Share2, Mail, Copy, Info, ArrowUpDown, PanelRightOpen, PanelRightClose
} from "lucide-react";
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
  const [showFacets, setShowFacets] = useState(false);
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
      
      {/* 1. Header / Search Bar */}
      <header className="h-16 border-b border-border bg-background/95 backdrop-blur-md flex items-center px-4 gap-4 z-20 shrink-0 justify-between">
        <div className="flex items-center gap-4 flex-1">
          <button 
            onClick={() => setLocation("/")}
            className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2 mr-4 shrink-0">
            <span className="font-display font-bold text-lg tracking-tight hidden lg:block">
              <span className="text-[#3b82f6]">V</span>
              <span className="text-[#0c3a6d] dark:text-white">o</span>
              <span className="text-[#3b82f6]">yager</span>
            </span>
          </div>

          <form onSubmit={handleSearch} className="flex-1 max-w-2xl relative group ml-4">
            <div className={`relative flex items-center bg-muted/50 dark:bg-black/50 backdrop-blur-xl border border-border rounded-xl p-1 shadow-sm transition-all duration-300 ${isSearchFocused ? 'ring-2 ring-primary/20 border-primary/50 bg-background dark:bg-black/80' : 'hover:border-primary/30'}`}>
              
              {/* Intelligent Input */}
              <div className="flex items-center flex-1 px-3 relative">
                <label htmlFor="unified-search-input" className="sr-only">Search keywords or location</label>
                <div className="mr-3 text-muted-foreground transition-colors duration-300">
                   {detectedType === 'place' ? <MapPin className="w-4 h-4 text-primary" /> : <Search className="w-4 h-4" />}
                </div>
                <input 
                    id="unified-search-input"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                    className="bg-transparent border-none outline-none text-sm w-full placeholder:text-muted-foreground/70 h-9 text-foreground font-medium"
                    placeholder="Search keywords or location (e.g. 'Vegetation in California')"
                    aria-label="Search keywords or location"
                    autoComplete="off"
                />
                
                {/* Intelligent Labels */}
                {detectedType === 'mixed' && (
                    <div className="hidden md:flex items-center gap-1 pointer-events-none mr-2">
                        <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono font-semibold">KEYWORD</span>
                        <span className="text-[9px] text-muted-foreground px-0.5">+</span>
                        <span className="text-[9px] bg-green-500/10 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded font-mono font-semibold">LOCATION</span>
                    </div>
                )}
                {detectedType === 'keyword' && query.length > 0 && (
                    <div className="hidden md:flex items-center gap-1 pointer-events-none mr-2">
                        <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono font-semibold">KEYWORD</span>
                    </div>
                )}
                {detectedType === 'place' && (
                    <div className="hidden md:flex items-center gap-1 pointer-events-none mr-2">
                        <span className="text-[9px] bg-green-500/10 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded font-mono font-semibold">LOCATION</span>
                    </div>
                )}
              </div>

              <div className="p-0.5">
                <button type="submit" className="p-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-colors flex items-center justify-center">
                  <Search className="w-4 h-4" />
                </button>
              </div>

              {/* Search History Dropdown */}
              {isSearchFocused && searchHistory.length > 0 && (
                 <div 
                    className="absolute top-full left-0 w-full mt-2 bg-background/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2"
                    onMouseDown={(e) => e.preventDefault()} // Prevent blur when clicking
                 >
                    <div className="px-3 py-2 text-xs font-medium text-muted-foreground flex items-center gap-2 border-b border-border/50">
                        <History className="w-3 h-3" />
                        Recent Searches
                    </div>
                    <div className="p-1">
                      {searchHistory.map((item, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleHistorySelect(item)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/80 text-left group transition-colors"
                        >
                          <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center group-hover:bg-background transition-colors border border-transparent group-hover:border-border">
                             <Clock className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                          <span className="text-sm text-foreground group-hover:text-primary transition-colors">{item}</span>
                        </button>
                      ))}
                    </div>
                 </div>
              )}

            </div>
          </form>

          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setShowFacets(!showFacets)}>
            <Filter className="w-5 h-5" />
          </Button>

          {/* Active Filters Bar (Mobile/Desktop) */}
          <div className="hidden md:flex items-center gap-2 overflow-x-auto no-scrollbar max-w-[300px] xl:max-w-none">
            {keyword && (
              <Badge variant="secondary" className="gap-1 pl-2 pr-1 py-1 font-normal border-primary/30 bg-primary/5 text-primary">
                <Search className="w-3 h-3 opacity-50" />
                {keyword}
                <button onClick={() => {setKeyword(""); handleSearch({preventDefault:()=>{}} as any)}} className="ml-1 hover:bg-background/20 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            
            {place && (
              <Badge variant="secondary" className="gap-1 pl-2 pr-1 py-1 font-normal border-primary/30 bg-primary/5 text-primary">
                <MapPin className="w-3 h-3 opacity-50" />
                {place}
                <button onClick={clearLocation} className="ml-1 hover:bg-primary/20 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}

            {date?.from && (
              <Badge variant="secondary" className="gap-1 pl-2 pr-1 py-1 font-normal">
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
              <Badge key={filter.id} variant="secondary" className="gap-1 pl-2 pr-1 py-1 font-normal">
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
                className="text-xs text-muted-foreground hover:text-destructive transition-colors whitespace-nowrap px-2"
              >
                Clear all
              </button>
            )}
         </div>
         </div>

         <div className="flex items-center gap-2 md:ml-auto">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {filteredResults.length} results
              {spatialFilter && <span className="hidden lg:inline"> within your AOI</span>}
            </span>
            
            {spatialFilter && (
                <Button 
                 variant="outline" 
                 size="sm" 
                 className="h-8 text-xs border-dashed border-primary/50 text-primary bg-primary/5 hover:bg-primary/10"
                 onClick={() => setDrawMode('box')}
               >
                 Modify AOI
               </Button>
            )}

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[160px] h-8 text-xs bg-transparent border-border">
                <div className="flex items-center gap-2">
                   <ArrowUpDown className="w-3 h-3" />
                   <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="date_desc">Newest → Oldest</SelectItem>
                <SelectItem value="date_asc">Oldest → Newest</SelectItem>
                <SelectItem value="name_asc">Name A–Z</SelectItem>
              </SelectContent>
            </Select>

           <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                   <Button 
                    variant={isSearchSaved ? "secondary" : "outline"}
                    size="sm"
                    className={cn(
                      "h-8 gap-2 border-dashed border-primary/40",
                      isSearchSaved ? "bg-primary/10 text-primary border-primary hover:bg-primary/20" : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => {
                      if (isSearchSaved) {
                        setShowShareModal(true);
                      } else {
                        setIsSaveSearchOpen(true);
                        setSaveSearchName(keyword || place || "New Search");
                      }
                    }}
                   >
                     {isSearchSaved ? <Star className="w-3.5 h-3.5 fill-primary" /> : <Star className="w-3.5 h-3.5" />}
                     <span className="hidden sm:inline text-xs font-medium">
                       {isSearchSaved ? "Saved" : "Save Search"}
                     </span>
                   </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isSearchSaved ? "Manage or share this saved search" : "Save this search to get notifications"}
                </TooltipContent>
              </Tooltip>
           </TooltipProvider>

            <Button 
             variant="ghost" 
             size="sm" 
             className={`hidden md:flex gap-2 h-8 border border-border ${!showMap ? 'bg-accent text-accent-foreground' : ''}`}
             onClick={() => setShowMap(!showMap)}
           >
             {showMap ? <PanelRightClose className="w-3 h-3" /> : <PanelRightOpen className="w-3 h-3" />}
             <span className="hidden lg:inline text-xs">{showMap ? 'Hide Map' : 'Show Map'}</span>
           </Button>

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
         </div>
      </header>

      {/* Main Split Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Facets Panel (Refactored) */}
        <SearchFilters
          showFacets={showFacets}
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
