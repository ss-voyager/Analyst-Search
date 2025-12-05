import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, MapPin, Filter, ArrowLeft, Calendar, Layers, 
  Download, MoreVertical, ChevronDown, X, Map as MapIcon, 
  List, ArrowUpDown, Info, Check
} from "lucide-react";
import { MapContainer, TileLayer, Rectangle } from 'react-leaflet';
import { LatLngBoundsExpression, LatLngBounds, LatLng } from 'leaflet';
import { LocationPicker } from "@/components/location-picker";
import { MapDrawControl, SpatialFilterLayer } from "@/components/map-draw-control";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

// Mock Data
const MOCK_RESULTS = [
  {
    id: 1,
    title: "Sentinel-2B MSI Level-2A",
    date: "2024-03-15",
    cloudCover: "12%",
    platform: "Sentinel-2",
    provider: "ESA",
    thumbnail: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=300&auto=format&fit=crop",
    bounds: [[34.0, -118.3], [34.1, -118.2]] as LatLngBoundsExpression
  },
  {
    id: 2,
    title: "Landsat 9 OLI/TIRS C2 L2",
    date: "2024-03-12",
    cloudCover: "2%",
    platform: "Landsat 9",
    provider: "USGS",
    thumbnail: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=300&auto=format&fit=crop",
    bounds: [[33.9, -118.4], [34.0, -118.3]] as LatLngBoundsExpression
  },
  {
    id: 3,
    title: "Sentinel-1A SAR GRD",
    date: "2024-03-10",
    cloudCover: "N/A",
    platform: "Sentinel-1",
    provider: "ESA",
    thumbnail: "https://images.unsplash.com/photo-1541185933-710f50746b95?q=80&w=300&auto=format&fit=crop",
    bounds: [[34.1, -118.5], [34.2, -118.4]] as LatLngBoundsExpression
  },
  {
    id: 4,
    title: "MODIS Terra Surface Reflectance",
    date: "2024-03-15",
    cloudCover: "5%",
    platform: "Terra",
    provider: "NASA",
    thumbnail: "https://images.unsplash.com/photo-1529788295308-1eace6f67388?q=80&w=300&auto=format&fit=crop",
    bounds: [[33.8, -118.2], [33.9, -118.1]] as LatLngBoundsExpression
  },
  {
    id: 5,
    title: "Landsat 8 OLI/TIRS C2 L1",
    date: "2024-03-08",
    cloudCover: "0%",
    platform: "Landsat 8",
    provider: "USGS",
    thumbnail: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=300&auto=format&fit=crop",
    bounds: [[34.2, -118.6], [34.3, -118.5]] as LatLngBoundsExpression
  },
];

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

  // Drawing State
  const [drawMode, setDrawMode] = useState<'none' | 'box' | 'point'>('none');
  const [spatialFilter, setSpatialFilter] = useState<{type: 'box' | 'point', data: any} | null>(null);

  // Active Filters State (Mock)
  const [activeFilters, setActiveFilters] = useState<{type: string, value: string, id: string}[]>([
    { type: 'platform', value: 'Sentinel-2', id: 'f1' },
    { type: 'cloud', value: '< 20%', id: 'f2' }
  ]);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setLocation(`/search?q=${encodeURIComponent(keyword)}&loc=${encodeURIComponent(place)}`);
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 800);
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
    setActiveFilters(prev => prev.filter(f => f.id !== id));
  };

  const clearLocation = () => {
    setPlace("");
    setSpatialFilter(null);
    setLocation(`/search?q=${encodeURIComponent(keyword)}&loc=`);
  };

  return (
    <div className="flex flex-col h-screen w-full bg-background text-foreground overflow-hidden">
      
      {/* 1. Header / Search Bar */}
      <header className="h-16 border-b border-white/10 bg-black/40 backdrop-blur-md flex items-center px-4 gap-4 z-20 shrink-0 justify-between">
        <div className="flex items-center gap-4 flex-1">
          <button 
            onClick={() => setLocation("/")}
            className="p-2 rounded-full hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2 mr-4 shrink-0">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                <Layers className="w-3 h-3 text-primary" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight hidden lg:block">
              <span className="text-[#3b82f6]">V</span>
              <span className="text-[#0c3a6d] dark:text-white">o</span>
              <span className="text-[#3b82f6]">yager</span>
            </span>
          </div>

          <form onSubmit={handleSearch} className="flex-1 max-w-2xl flex items-center gap-2">
            <div className="flex items-center flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 focus-within:border-primary/50 transition-colors hover:bg-white/10">
              <Search className="w-4 h-4 text-foreground mr-2" />
              <input 
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="bg-transparent border-none outline-none text-sm w-full placeholder:text-muted-foreground/50"
                  placeholder="Search keywords..."
              />
            </div>
            <div className="hidden md:flex items-center flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 focus-within:border-primary/50 transition-colors relative hover:bg-white/10">
              <div className="flex items-center mr-2 shrink-0">
                <Select defaultValue="intersects">
                  <SelectTrigger className="h-7 w-[100px] text-[10px] bg-white/5 border-white/10 rounded focus:ring-0 focus:ring-offset-0 px-2">
                    <SelectValue placeholder="Rel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="intersects">Intersects</SelectItem>
                    <SelectItem value="within">Within</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <MapPin className="w-4 h-4 text-foreground mr-2 shrink-0" />
              <input 
                  value={place}
                  onChange={(e) => setPlace(e.target.value)}
                  className="bg-transparent border-none outline-none text-sm w-full placeholder:text-muted-foreground/50 min-w-0"
                  placeholder="Where is it located?"
              />
            </div>
            <button type="submit" className="hidden md:flex p-2 bg-primary rounded-lg text-primary-foreground hover:bg-primary/90">
              <Search className="w-4 h-4" />
            </button>
          </form>
        </div>

        <div className="flex items-center gap-3">
           <ThemeToggle />
           <div className="w-8 h-8 rounded-full bg-secondary border border-white/10" />
        </div>
      </header>

      {/* 2. Current Query / Facets Bar */}
      <div className="border-b border-white/10 bg-background/95 backdrop-blur flex flex-col md:flex-row md:items-center px-4 py-2 gap-3 z-10">
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
                <button onClick={() => {setKeyword(""); handleSearch({preventDefault:()=>{}} as any)}} className="ml-1 hover:bg-white/20 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            
            {place && (
              <Badge variant="secondary" className="gap-1 pl-2 pr-1 py-1 font-normal border-primary/30 bg-primary/5 text-primary">
                <MapPin className="w-3 h-3 opacity-50" />
                Location
                <button onClick={clearLocation} className="ml-1 hover:bg-primary/20 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}

            {activeFilters.map(filter => (
              <Badge key={filter.id} variant="secondary" className="gap-1 pl-2 pr-1 py-1 font-normal">
                <span className="opacity-50 capitalize">{filter.type}:</span>
                {filter.value}
                <button onClick={() => removeFilter(filter.id)} className="ml-1 hover:bg-white/20 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            
            {(keyword || place || activeFilters.length > 0) && (
              <button 
                onClick={() => {
                  setKeyword("");
                  setPlace("");
                  setActiveFilters([]);
                  setLocation("/search");
                }} 
                className="text-xs text-muted-foreground hover:text-destructive transition-colors whitespace-nowrap px-2"
              >
                Clear all
              </button>
            )}
         </div>

         <div className="flex items-center gap-2 md:ml-auto">
            <span className="text-xs text-muted-foreground whitespace-nowrap">{MOCK_RESULTS.length} results</span>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[140px] h-8 text-xs bg-transparent border-white/10">
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
             className={`hidden md:flex gap-2 h-8 border border-white/10 ${!showMap ? 'bg-accent text-accent-foreground' : ''}`}
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
              transition={{ duration: 0.2 }}
              className="border-r border-white/10 bg-card/30 hidden md:flex flex-col overflow-hidden shrink-0"
            >
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-6 pr-4">
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Calendar className="w-4 h-4" /> Date Range
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                       <input type="date" className="text-xs bg-black/20 border border-white/10 rounded p-1.5 text-muted-foreground" />
                       <input type="date" className="text-xs bg-black/20 border border-white/10 rounded p-1.5 text-muted-foreground" />
                    </div>
                  </div>

                  <Separator className="bg-white/5" />

                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Layers className="w-4 h-4" /> Platform
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

                  <Separator className="bg-white/5" />

                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-foreground">Cloud Cover</h3>
                    <div className="space-y-2">
                      {['0-10%', '10-20%', '20-50%', '50%+'].map(c => (
                        <div key={c} className="flex items-center space-x-2">
                          <Checkbox id={`c-${c}`} />
                          <Label htmlFor={`c-${c}`} className="text-xs font-normal text-muted-foreground">{c}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Map Panel (Left - Movable) */}
        {showMap && (
          <div className="w-full md:w-[400px] lg:w-[500px] bg-black/20 relative hidden md:block border-r border-white/10 shrink-0">
             <MapContainer 
                 center={[34.05, -118.25]} 
                 zoom={9} 
                 style={{ height: '100%', width: '100%' }}
                 className="z-0 bg-[#1a1a1a]"
               >
                 <TileLayer
                   attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                   url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                 />
                 {!isLoading && MOCK_RESULTS.map(result => (
                   <Rectangle 
                      key={result.id}
                      bounds={result.bounds} 
                      pathOptions={{ 
                        color: '#00ffff', 
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

        {/* Results Grid (Right) */}
        <div className="flex-1 flex flex-col min-w-0 bg-background/50">
           <ScrollArea className="flex-1">
             <div className="p-4">
               {isLoading ? (
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                   {Array.from({ length: 8 }).map((_, i) => (
                     <div key={i} className="aspect-[3/4] rounded-xl bg-white/5 animate-pulse border border-white/5" />
                   ))}
                 </div>
               ) : (
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                   {MOCK_RESULTS.map((result) => (
                     <motion.div 
                       key={result.id}
                       layout
                       initial={{ opacity: 0, scale: 0.95 }}
                       animate={{ opacity: 1, scale: 1 }}
                       className="group flex flex-col bg-card border border-white/10 hover:border-primary/50 rounded-sm overflow-hidden transition-all hover:shadow-xl hover:bg-card/80"
                     >
                        {/* Thumbnail Area - Square aspect ratio like reference */}
                        <div className="aspect-square bg-black/50 relative group-hover:brightness-110 transition-all">
                          <img src={result.thumbnail} className="w-full h-full object-cover" alt="" />
                          
                          {/* Selection Checkbox Overlay */}
                          <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-5 h-5 rounded border border-white/50 bg-black/50 flex items-center justify-center hover:bg-primary hover:border-primary cursor-pointer">
                              <Check className="w-3 h-3 text-white" />
                            </div>
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
                           <div className="mt-auto pt-3 border-t border-white/5 flex items-center justify-between">
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

      </div>

      <LocationPicker 
        isOpen={isPickerOpen} 
        onClose={() => setIsPickerOpen(false)} 
        onSelect={(bounds) => setPlace(bounds)} 
      />
    </div>
  );
}