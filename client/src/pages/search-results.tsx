import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, MapPin, Filter, ArrowLeft, Calendar as CalendarIcon, Layers, 
  Download, MoreVertical, ChevronDown, X, Map as MapIcon, 
  List, ArrowUpDown, Info, Check, User, Globe, Tag,
  Folder, FolderOpen, File
} from "lucide-react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { MapContainer, TileLayer, Rectangle } from 'react-leaflet';
import { LatLngBoundsExpression, LatLngBounds, LatLng } from 'leaflet';
import { LocationPicker } from "@/components/location-picker";
import { MapDrawControl, SpatialFilterLayer } from "@/components/map-draw-control";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

import stockImage from '@assets/stock_images/satellite_radar_imag_5d3e79b8.jpg';
import desertImage from '@assets/stock_images/satellite_view_of_de_09a0f404.jpg';
import oceanImage from '@assets/stock_images/satellite_view_of_oc_86576cd8.jpg';
import forestImage from '@assets/stock_images/satellite_view_of_de_03f9764a.jpg';
import agriImage from '@assets/stock_images/satellite_view_of_ag_ebac3a20.jpg';
import snowImage from '@assets/stock_images/satellite_view_of_sn_8f021214.jpg';
import cityImage from '@assets/stock_images/satellite_view_of_ci_093e163a.jpg';
import sarImage from '@assets/stock_images/satellite_radar_sar__0ff421fd.jpg';

// Mock Data Generators
const PLATFORMS = [
  { name: "Sentinel-2", provider: "ESA", type: "Optical" },
  { name: "Landsat 8", provider: "USGS", type: "Optical" },
  { name: "Landsat 9", provider: "USGS", type: "Optical" },
  { name: "WorldView-3", provider: "Maxar", type: "Optical" },
  { name: "PlanetScope", provider: "Planet", type: "Optical" },
  { name: "BlackSky Global", provider: "BlackSky", type: "Optical" },
  { name: "Capella-2", provider: "Capella Space", type: "SAR" },
  { name: "ICEYE-X", provider: "ICEYE", type: "SAR" },
  { name: "SPOT 7", provider: "Airbus", type: "Optical" },
  { name: "Pleiades Neo", provider: "Airbus", type: "Optical" }
];

const THUMBNAILS = [
  stockImage,
  desertImage,
  oceanImage,
  forestImage,
  agriImage,
  snowImage,
  cityImage,
  sarImage,
  "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=300&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=300&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1529788295308-1eace6f67388?q=80&w=300&auto=format&fit=crop"
];

const TITLES: Record<string, string[]> = {
  "Sentinel-2": ["MSI Level-1C", "MSI Level-2A"],
  "Landsat 8": ["OLI/TIRS C2 L1", "OLI/TIRS C2 L2"],
  "Landsat 9": ["OLI/TIRS C2 L1", "OLI/TIRS C2 L2"],
  "WorldView-3": ["SWIR", "Pan-Sharpened", "Multispectral"],
  "PlanetScope": ["3m Imagery", "Ortho Scene"],
  "BlackSky Global": ["Spectra AI", "Standard Imagery"],
  "Capella-2": ["SAR SLC", "SAR GEO"],
  "ICEYE-X": ["SAR X-band", "SAR SLC"],
  "SPOT 7": ["1.5m Imagery", "Panchromatic"],
  "Pleiades Neo": ["30cm Imagery", "Panchromatic"]
};

// Tree View Component
interface TreeNode {
  id: string;
  label: string;
  children?: TreeNode[];
}

const FolderTree = ({ nodes, level = 0, onSelect, selectedIds = [] }: { nodes: TreeNode[], level?: number, onSelect?: (id: string, label: string) => void, selectedIds?: string[] }) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSelect = (e: React.MouseEvent, node: TreeNode) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect(node.id, node.label);
    }
  };

  return (
    <div className="space-y-0.5">
      {nodes.map(node => {
        const hasChildren = node.children && node.children.length > 0;
        const isExpanded = expanded[node.id];
        const isSelected = selectedIds.includes(node.id);
        
        return (
          <div key={node.id}>
            <div 
              className={cn(
                "flex items-center py-1.5 px-2 rounded-md group transition-colors cursor-pointer select-none",
                isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
              )}
              style={{ paddingLeft: `${level * 16 + 8}px` }}
              onClick={() => hasChildren && toggleExpand(node.id)}
            >
              <div className={cn("mr-2 transition-colors", isSelected ? "text-primary" : "text-muted-foreground/70 group-hover:text-primary")}>
                {hasChildren ? (
                  isExpanded ? <FolderOpen className="w-3.5 h-3.5" /> : <Folder className="w-3.5 h-3.5" />
                ) : (
                  <File className="w-3.5 h-3.5 opacity-50" />
                )}
              </div>
              
              <span className={cn("text-xs font-medium flex-1 truncate", isSelected ? "text-primary" : "text-foreground/90")}>
                {node.label}
              </span>
              
              <Checkbox 
                id={`tree-check-${node.id}`} 
                checked={isSelected}
                className={cn(
                  "w-3.5 h-3.5 ml-2 border-muted-foreground/40 group-hover:border-primary/60",
                  isSelected ? "data-[state=checked]:bg-primary border-primary" : ""
                )} 
                onClick={(e) => handleSelect(e, node)} 
              />
            </div>
            
            {hasChildren && isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <FolderTree nodes={node.children!} level={level + 1} onSelect={onSelect} selectedIds={selectedIds} />
              </motion.div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const HIERARCHY_TREE: TreeNode[] = [
  {
    id: "na",
    label: "North America",
    children: [
      { 
        id: "usa", 
        label: "United States",
        children: [
          { id: "ca", label: "California" },
          { id: "ny", label: "New York" },
          { id: "tx", label: "Texas" },
          { id: "fl", label: "Florida" }
        ]
      },
      { id: "can", label: "Canada" },
      { id: "mex", label: "Mexico" }
    ]
  },
  {
    id: "eu",
    label: "Europe",
    children: [
      { 
        id: "uk", 
        label: "United Kingdom",
        children: [
          { id: "eng", label: "England" },
          { id: "sct", label: "Scotland" },
          { id: "wls", label: "Wales" }
        ]
      },
      { id: "fr", label: "France" },
      { id: "de", label: "Germany" },
      { id: "it", label: "Italy" },
      { id: "es", label: "Spain" }
    ]
  },
  {
    id: "as",
    label: "Asia",
    children: [
      { id: "jp", label: "Japan" },
      { id: "cn", label: "China" },
      { id: "in", label: "India" },
      { id: "sg", label: "Singapore" }
    ]
  },
  {
    id: "sa",
    label: "South America",
    children: [
      { id: "br", label: "Brazil" },
      { id: "ar", label: "Argentina" },
      { id: "cl", label: "Chile" }
    ]
  },
  {
    id: "af",
    label: "Africa",
    children: [
      { id: "eg", label: "Egypt" },
      { id: "za", label: "South Africa" },
      { id: "ng", label: "Nigeria" },
      { id: "ke", label: "Kenya" }
    ]
  }
];

const KEYWORDS = [
  "Vegetation", "Water", "Urban", "Agriculture", "Disaster", 
  "Snow/Ice", "Clouds", "Desert", "Forest", "Ocean",
  "Infrastructure", "Mining", "Oil & Gas", "Renewable Energy"
];

const LEAF_IDS = [
  "ca", "ny", "tx", "fl", "can", "mex",
  "eng", "sct", "wls", "fr", "de", "it", "es",
  "jp", "cn", "in", "sg",
  "br", "ar", "cl",
  "eg", "za", "ng", "ke"
];

const generateMockResults = (count: number) => {
  return Array.from({ length: count }, (_, i) => {
    const platform = PLATFORMS[i % PLATFORMS.length];
    const titles = TITLES[platform.name] || ["Imagery"];
    const title = `${platform.name} ${titles[i % titles.length]}`;
    
    // Random date within last 30 days
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 30));
    const dateStr = date.toISOString().split('T')[0];
    
    // Random cloud cover (0-100% or N/A for SAR)
    const isSAR = platform.type === "SAR";
    const cloudCover = isSAR ? "N/A" : `${Math.floor(Math.random() * 30)}%`;
    
    // Random bounds near Los Angeles for demo
    const lat = 34.0522 + (Math.random() - 0.5) * 1.0;
    const lng = -118.2437 + (Math.random() - 0.5) * 1.0;
    
    // Random location ID assignment
    const locationId = LEAF_IDS[Math.floor(Math.random() * LEAF_IDS.length)];

    // Random properties
    const possibleProps = ["has_thumbnail", "has_spatial", "has_temporal", "is_downloadable"];
    const properties = possibleProps.filter(() => Math.random() > 0.5);
    
    // Random keywords
    const itemKeywords = KEYWORDS.filter(() => Math.random() > 0.95);
    
    return {
      id: i + 1,
      title,
      date: dateStr,
      cloudCover,
      platform: platform.name,
      provider: platform.provider,
      thumbnail: THUMBNAILS[i % THUMBNAILS.length],
      bounds: [[lat, lng], [lat + 0.05, lng + 0.05]] as LatLngBoundsExpression,
      locationId,
      properties,
      keywords: itemKeywords
    };
  });
};

const MOCK_RESULTS = generateMockResults(100);

export default function SearchResults() {
  const [location, setLocation] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  
  // Search State
  const [keyword, setKeyword] = useState(params.get("q") || "");
  const [place, setPlace] = useState(params.get("loc") || "");
  
  // UI State
  const [showMap, setShowMap] = useState(true);
  const [showFacets, setShowFacets] = useState(false); // Hidden by default on mobile/desktop init maybe?
  const [sortBy, setSortBy] = useState("relevance");
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocationFocused, setIsLocationFocused] = useState(false);
  const [showLocationOptions, setShowLocationOptions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Filter States
  const [activeFilters, setActiveFilters] = useState<{type: string, value: string, id: string}[]>([]);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [date, setDate] = useState<DateRange | undefined>();
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [keywordSearch, setKeywordSearch] = useState("");

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
    "Rio de Janeiro, Brazil"
  ];

  const filteredPlaces = PLACE_SUGGESTIONS.filter(p => 
    p.toLowerCase().includes(place.toLowerCase())
  );

  // Reset selection when suggestions change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [place]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isLocationFocused || filteredPlaces.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredPlaces.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredPlaces.length) % filteredPlaces.length);
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0) {
        e.preventDefault();
        setPlace(filteredPlaces[selectedIndex]);
        setIsLocationFocused(false);
        setSelectedIndex(-1);
      }
    } else if (e.key === 'Escape') {
      setIsLocationFocused(false);
    }
  };

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
  const [drawMode, setDrawMode] = useState<'none' | 'box' | 'point'>('none');
  const [spatialFilter, setSpatialFilter] = useState<{type: 'box' | 'point', data: any} | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  // Filter mock results
  const filteredResults = MOCK_RESULTS.filter(item => {
    // Location Filter
    if (selectedLocationIds.length > 0 && (!item.locationId || !selectedLocationIds.includes(item.locationId))) {
      return false;
    }

    // Properties Filter
    if (selectedProperties.length > 0) {
      const hasAllProps = selectedProperties.every(prop => item.properties?.includes(prop));
      if (!hasAllProps) return false;
    }

    // Keywords Filter
    if (selectedKeywords.length > 0) {
      const hasAllKeywords = selectedKeywords.every(kw => item.keywords?.includes(kw));
      if (!hasAllKeywords) return false;
    }

    // Date Filter
    if (date?.from) {
      const itemDate = new Date(item.date);
      // Reset time for comparison
      const fromDate = new Date(date.from);
      fromDate.setHours(0,0,0,0);
      
      const itemDateObj = new Date(itemDate);
      itemDateObj.setHours(0,0,0,0);

      if (itemDateObj < fromDate) return false;
      
      if (date.to) {
        const toDate = new Date(date.to);
        toDate.setHours(23,59,59,999);
        if (itemDateObj > toDate) return false;
      }
    }
    
    return true;
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setLocation(`/search?q=${encodeURIComponent(keyword)}&loc=${encodeURIComponent(place)}`);
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

  const handleDrawBox = (bounds: LatLngBounds) => {
    setSpatialFilter({ type: 'box', data: bounds });
    setDrawMode('none');
    setPlace(`[${bounds.getWest().toFixed(2)}, ${bounds.getSouth().toFixed(2)}, ${bounds.getEast().toFixed(2)}, ${bounds.getNorth().toFixed(2)}]`);
  };

  const handleDrawPoint = (point: LatLng) => {
    setSpatialFilter({ type: 'point', data: point });
    setDrawMode('none');
    setPlace(`${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}`);
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
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
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
            <div className="flex items-center bg-muted/50 dark:bg-black/50 backdrop-blur-xl border border-border rounded-xl p-1 shadow-sm transition-all duration-300 focus-within:border-primary/50 focus-within:bg-background dark:focus-within:bg-black/80 divide-x divide-border">
              
              <div className="flex items-center flex-1 px-3">
                <label htmlFor="keyword-input-results" className="sr-only">Search keywords</label>
                <input 
                    id="keyword-input-results"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    className="bg-transparent border-none outline-none text-sm w-full placeholder:text-muted-foreground/70 h-8 text-foreground"
                    placeholder="Search keywords..."
                    aria-label="Search keywords"
                />
              </div>

              <div className="hidden md:flex items-center flex-[0.8] px-3 relative">
                <div className="flex items-center flex-1 w-full relative">
                   <div className="mr-2 text-muted-foreground">
                       <MapPin className="w-4 h-4" />
                   </div>
                  
                  <label htmlFor="loc-input-results" className="sr-only">Location</label>
                  <input
                    id="loc-input-results"
                    value={place}
                    onChange={(e) => {
                      setPlace(e.target.value);
                      setShowLocationOptions(false);
                      setSelectedIndex(-1);
                    }}
                    onKeyDown={handleKeyDown}
                    onFocus={() => {
                      setIsLocationFocused(true);
                    }}
                    onBlur={() => setTimeout(() => setIsLocationFocused(false), 200)}
                    className="bg-transparent border-none outline-none text-sm w-full placeholder:text-muted-foreground/70 min-w-0 h-8 text-foreground"
                    placeholder="Enter place name"
                    aria-label="Location"
                    autoComplete="off"
                    aria-autocomplete="list"
                    aria-controls="location-results-suggestions"
                    aria-activedescendant={selectedIndex >= 0 ? `result-suggestion-${selectedIndex}` : undefined}
                  />
                  {isLocationFocused && !showLocationOptions && filteredPlaces.length > 0 && (
                     <div 
                        id="location-results-suggestions"
                        role="listbox"
                        className="absolute top-full left-0 w-full mt-2 bg-background/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2"
                     >
                        <div className="p-2 space-y-1">
                          {filteredPlaces.map((p, i) => (
                            <button
                              key={i}
                              id={`result-suggestion-${i}`}
                              role="option"
                              aria-selected={i === selectedIndex}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setPlace(p);
                                setIsLocationFocused(false);
                              }}
                              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left group ${
                                i === selectedIndex 
                                  ? 'bg-primary/10 text-primary' 
                                  : 'hover:bg-muted text-foreground'
                              }`}
                            >
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors ${
                                i === selectedIndex
                                  ? 'bg-primary/20 border-primary/30'
                                  : 'bg-muted border-border group-hover:border-primary/30'
                              }`}>
                                <MapPin className={`w-4 h-4 ${
                                  i === selectedIndex ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                                }`} />
                              </div>
                              <div>
                                <div className={`text-sm font-medium ${
                                  i === selectedIndex ? 'text-primary' : 'text-foreground'
                                }`}>{p}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                     </div>
                  )}
                </div>
              </div>

              <div className="p-0.5">
                <button type="submit" className="p-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-colors flex items-center justify-center">
                  <Search className="w-4 h-4" />
                </button>
              </div>

            </div>
          </form>
        </div>

        <div className="flex items-center gap-3">
           <ThemeToggle />
           <button className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center hover:bg-muted transition-colors">
             <User className="w-4 h-4 text-muted-foreground" />
           </button>
        </div>
      </header>

      {/* 2. Current Query / Facets Bar */}
      <div className="border-b border-border bg-background/95 backdrop-blur flex flex-col md:flex-row md:items-center px-4 py-2 gap-3 z-10">
         <div className="flex items-center gap-2 overflow-x-auto no-scrollbar flex-1">
            
            <Button 
              variant="outline" 
              size="sm" 
              className={`gap-2 border-dashed ${showFacets ? 'bg-accent' : ''}`}
              onClick={() => setShowFacets(!showFacets)}
            >
              <Filter className="w-3 h-3" /> Filters
            </Button>
            
            <Separator orientation="vertical" className="h-6 hidden md:block" />

            {/* Query Chips */}
            {keyword && (
              <Badge variant="secondary" className="gap-1 pl-2 pr-1 py-1 font-normal">
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
                <CalendarIcon className="w-3 h-3 opacity-50" />
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
            
            {selectedProperties.map(prop => (
              <Badge key={`prop-${prop}`} variant="secondary" className="gap-1 pl-2 pr-1 py-1 font-normal">
                <Tag className="w-3 h-3 opacity-50" />
                {prop.replace('has_', '').replace('is_', '')}
                <button onClick={() => toggleProperty(prop)} className="ml-1 hover:bg-background/20 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            
            {selectedKeywords.map(kw => (
               // Only render if not already in activeFilters (to avoid duplicates if logic overlaps)
               !activeFilters.find(f => f.id === `kw-${kw}`) && (
                <Badge key={`kw-chip-${kw}`} variant="secondary" className="gap-1 pl-2 pr-1 py-1 font-normal">
                  <Tag className="w-3 h-3 opacity-50" />
                  {kw}
                  <button onClick={() => toggleKeyword(kw)} className="ml-1 hover:bg-background/20 rounded-full p-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
               )
            ))}
            
            {(keyword || place || activeFilters.length > 0 || date || selectedProperties.length > 0 || selectedKeywords.length > 0) && (
              <button 
                onClick={() => {
                  setKeyword("");
                  setPlace("");
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

         <div className="flex items-center gap-2 md:ml-auto">
            <span className="text-xs text-muted-foreground whitespace-nowrap">{filteredResults.length} results</span>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[140px] h-8 text-xs bg-transparent border-border">
                <div className="flex items-center gap-2">
                   <ArrowUpDown className="w-3 h-3" />
                   <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="date_desc">Newest First</SelectItem>
                <SelectItem value="date_asc">Oldest First</SelectItem>
                <SelectItem value="cloud_asc">Least Cloud Cover</SelectItem>
              </SelectContent>
            </Select>

            <Button 
             variant="ghost" 
             size="sm" 
             className={`hidden md:flex gap-2 h-8 border border-border ${!showMap ? 'bg-accent text-accent-foreground' : ''}`}
             onClick={() => setShowMap(!showMap)}
           >
             {showMap ? <List className="w-3 h-3" /> : <MapIcon className="w-3 h-3" />}
             <span className="hidden lg:inline text-xs">{showMap ? 'Hide Map' : 'Show Map'}</span>
           </Button>
         </div>
      </div>

      {/* Main Split Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Facets Panel (Expandable) */}
        <AnimatePresence mode="wait">
          {showFacets && (
            <motion.div 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="border-r border-border/50 bg-background/95 backdrop-blur-xl hidden md:flex flex-col overflow-hidden shrink-0 z-10 shadow-lg"
            >
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-6 pr-4">
                  {/* Date Range Filter */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-display font-bold text-foreground flex items-center gap-2 tracking-wide">
                      <CalendarIcon className="w-4 h-4 text-primary" /> Date Range
                    </h3>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id="date"
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal text-xs",
                            !date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {date?.from ? (
                            date.to ? (
                              <>
                                {format(date.from, "LLL dd, y")} -{" "}
                                {format(date.to, "LLL dd, y")}
                              </>
                            ) : (
                              format(date.from, "LLL dd, y")
                            )
                          ) : (
                            <span>Pick a date range</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          initialFocus
                          mode="range"
                          defaultMonth={date?.from}
                          selected={date}
                          onSelect={setDate}
                          numberOfMonths={2}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <Separator className="bg-border/50" />

                  <div className="space-y-3">
                    <h3 className="text-sm font-display font-bold text-foreground flex items-center gap-2 tracking-wide">
                      <Globe className="w-4 h-4 text-primary" /> Location Hierarchy
                    </h3>
                    <div className="border border-border/60 rounded-lg bg-muted/10 p-2 max-h-[300px] overflow-y-auto">
                      <FolderTree nodes={HIERARCHY_TREE} onSelect={handleLocationFilterSelect} selectedIds={selectedLocationIds} />
                    </div>
                  </div>

                  <Separator className="bg-border/50" />

                  {/* Keywords Filter - Command style */}
                  <div className="space-y-1">
                    <Accordion type="single" collapsible defaultValue="keywords" className="w-full">
                      <AccordionItem value="keywords" className="border-none">
                        <AccordionTrigger className="py-3 text-xs font-bold text-muted-foreground hover:text-foreground hover:no-underline uppercase tracking-wider">
                          Keywords
                        </AccordionTrigger>
                        <AccordionContent>
                           <Command className="border rounded-md">
                              <CommandInput placeholder="Filter keywords..." value={keywordSearch} onValueChange={setKeywordSearch} className="h-8 text-xs" />
                              <CommandList className="max-h-[200px]">
                                <CommandEmpty>No keywords found.</CommandEmpty>
                                <CommandGroup>
                                  {KEYWORDS.map(k => (
                                    <CommandItem
                                      key={k}
                                      value={k}
                                      onSelect={() => toggleKeyword(k)}
                                      className="text-xs cursor-pointer"
                                    >
                                      <div className={cn(
                                        "mr-2 flex h-3 w-3 items-center justify-center rounded-sm border border-primary",
                                        selectedKeywords.includes(k) ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible"
                                      )}>
                                        <Check className={cn("h-3 w-3")} />
                                      </div>
                                      {k}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                           </Command>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>

                  <Separator className="bg-border/50" />

                  {/* Properties Filter - Clickable */}
                  <div className="space-y-1">
                    <Accordion type="single" collapsible defaultValue="properties" className="w-full">
                      <AccordionItem value="properties" className="border-none">
                        <AccordionTrigger className="py-3 text-xs font-bold text-muted-foreground hover:text-foreground hover:no-underline uppercase tracking-wider">
                          Properties
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-1 pb-2">
                             {[
                               { name: "has_thumbnail", label: "Has Thumbnail" },
                               { name: "has_spatial", label: "Has Spatial Info" },
                               { name: "has_temporal", label: "Has Temporal Info" },
                               { name: "is_downloadable", label: "Downloadable" }
                             ].map(prop => {
                               const isSelected = selectedProperties.includes(prop.name);
                               return (
                                <button 
                                  key={prop.name} 
                                  onClick={() => toggleProperty(prop.name)}
                                  className={cn(
                                    "w-full flex items-center justify-between py-1.5 px-2 text-sm rounded-md group transition-colors text-left",
                                    isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted/50 text-foreground/80"
                                  )}
                                >
                                  <span className="font-medium">{prop.label}</span>
                                  {isSelected && <Check className="w-3 h-3" />}
                                </button>
                               )
                             })}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>

                  <Separator className="bg-border/50" />

                  <div className="space-y-3">
                    <h3 className="text-sm font-display font-bold text-foreground flex items-center gap-2 tracking-wide mt-3">
                      <Layers className="w-4 h-4 text-primary" /> Platform
                    </h3>
                    <div className="space-y-2">
                      {['Sentinel-1', 'Sentinel-2', 'Landsat 8', 'Landsat 9', 'Terra', 'Aqua'].map(p => (
                        <div key={p} className="flex items-center space-x-2">
                          <Checkbox id={`p-${p}`} />
                          <Label htmlFor={`p-${p}`} className="text-xs font-normal text-muted-foreground">{p}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator className="bg-border" />

                  {/* Cloud Cover Removed */}
                </div>
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results Grid (Left) */}
        <div className="flex-1 flex flex-col min-w-0 bg-muted/30 dark:bg-background/50">
           <ScrollArea className="flex-1">
             <div className="p-4">
               {isLoading ? (
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                   {Array.from({ length: 8 }).map((_, i) => (
                     <div key={i} className="aspect-[3/4] rounded-xl bg-muted animate-pulse border border-border" />
                   ))}
                 </div>
               ) : (
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                   {filteredResults.map((result, i) => (
                     <motion.div
                       key={result.id}
                       initial={{ opacity: 0, scale: 0.95 }}
                       animate={{ opacity: 1, scale: 1 }}
                       transition={{ delay: i * 0.05, duration: 0.3 }}
                       className="group relative aspect-[3/4] bg-card dark:bg-black/40 border border-border rounded-xl overflow-hidden hover:shadow-xl hover:border-primary/50 transition-all cursor-pointer"
                     >
                        {/* Thumbnail Area - Square aspect ratio like reference */}
                        <div className="aspect-square bg-muted relative group-hover:brightness-110 transition-all">
                          <img src={result.thumbnail} className="w-full h-full object-cover" alt="" />
                          
                          {/* Selection Checkbox Overlay */}
                          <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-5 h-5 rounded border border-white/50 bg-black/50 flex items-center justify-center hover:bg-primary hover:border-primary cursor-pointer">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          </div>

                          {/* Properties Badges (On Hover) */}
                          <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {result.properties?.includes("has_spatial") && <Badge variant="secondary" className="h-4 text-[9px] px-1 bg-black/60 text-white border-none">Spatial</Badge>}
                            {result.properties?.includes("is_downloadable") && <Badge variant="secondary" className="h-4 text-[9px] px-1 bg-black/60 text-white border-none">Download</Badge>}
                          </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 p-3 flex flex-col min-w-0 bg-card cursor-pointer" onClick={() => setLocation(`/item/${result.id}`)}>
                           <h3 className="font-display font-semibold text-sm text-primary truncate mb-1 hover:underline" title={result.title}>
                             {result.title}
                           </h3>
                           
                           <div className="text-[10px] text-muted-foreground space-y-1 mb-4">
                              <p>Format: <span className="text-foreground/80">GeoTIFF</span></p>
                              <p>Date: <span className="text-foreground/80">{result.date}</span></p>
                              <p>Provider: <span className="text-foreground/80">{result.platform}</span></p>
                           </div>

                           {/* Action Footer */}
                           <div className="mt-auto pt-3 border-t border-border flex items-center justify-between">
                              <button className="flex items-center gap-1.5 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors">
                                <div className="w-3 h-3 rounded-full border border-current flex items-center justify-center">
                                  <span className="text-[8px] leading-none">+</span>
                                </div>
                                Add to Cart
                              </button>
                              
                              <button className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                                Tools
                                <ChevronDown className="w-3 h-3" />
                              </button>
                           </div>
                        </div>
                     </motion.div>
                   ))}
                 </div>
               )}
               
               <div className="h-8" />
             </div>
           </ScrollArea>
        </div>

        {/* Map Panel (Right - Movable) */}
        {showMap && (
          <div className="w-full md:w-[400px] lg:w-[500px] bg-muted/20 dark:bg-black/20 relative hidden md:block border-l border-border shrink-0">
             <MapContainer 
                 key={isDark ? 'dark' : 'light'}
                 center={[34.05, -118.25]} 
                 zoom={9} 
                 style={{ height: '100%', width: '100%' }}
                 className="z-0 bg-muted/20 dark:bg-[#1a1a1a]"
               >
                 <TileLayer
                   attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                   url={isDark 
                     ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                     : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                   }
                 />
                 {!isLoading && filteredResults.map(result => (
                   <Rectangle 
                      key={result.id}
                      bounds={result.bounds} 
                      pathOptions={{ 
                        color: '#3b82f6', 
                        weight: 1, 
                        fillOpacity: 0.1,
                        className: 'hover:fill-opacity-30 transition-all cursor-pointer'
                      }} 
                   />
                 ))}
             
             {/* Map Controls Overlay */}
             <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2">
                <div className="bg-black/80 backdrop-blur rounded-lg border border-white/10 p-1 flex flex-col gap-1">
                  <button 
                    className={`p-2 hover:bg-white/10 rounded transition-colors ${drawMode === 'none' ? 'text-white' : 'text-white/60'}`} 
                    title="Pan/Select"
                    onClick={() => setDrawMode('none')}
                  >
                    <Layers className="w-4 h-4" />
                  </button>
                  <button 
                    className={`p-2 hover:bg-white/10 rounded transition-colors ${drawMode === 'box' ? 'bg-primary text-white' : 'text-white/80'}`}
                    title="Draw Box"
                    onClick={() => setDrawMode('box')}
                  >
                    <div className="w-4 h-4 border-2 border-current rounded-sm" />
                  </button>
                  <button 
                    className={`p-2 hover:bg-white/10 rounded transition-colors ${drawMode === 'point' ? 'bg-primary text-white' : 'text-white/80'}`}
                    title="Select Point"
                    onClick={() => setDrawMode('point')}
                  >
                    <MapPin className="w-4 h-4" />
                  </button>
                </div>
                
                {drawMode !== 'none' && (
                  <div className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded shadow-lg animate-in fade-in slide-in-from-left-2">
                    {drawMode === 'box' ? 'Click & Drag to draw box' : 'Click to select point'}
                  </div>
                )}
             </div>

             <MapDrawControl 
               mode={drawMode} 
               onDrawBox={handleDrawBox} 
               onDrawPoint={handleDrawPoint} 
             />
             
             {spatialFilter && (
               <SpatialFilterLayer 
                 type={spatialFilter.type} 
                 data={spatialFilter.data} 
               />
             )}
          </MapContainer>
          </div>
        )}

      </div>

      <LocationPicker 
        isOpen={isPickerOpen} 
        onClose={() => setIsPickerOpen(false)} 
        onSelect={(bounds) => setPlace(bounds)} 
      />
    </motion.div>
  );
}