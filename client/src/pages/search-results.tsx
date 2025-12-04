import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { motion } from "framer-motion";
import { Search, MapPin, Filter, ArrowLeft, Calendar, Layers, Download, MoreVertical, ChevronDown } from "lucide-react";
import { MapContainer, TileLayer, Rectangle } from 'react-leaflet';
import { LatLngBoundsExpression } from 'leaflet';
import { LocationPicker } from "@/components/location-picker";

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
];

export default function SearchResults() {
  const [location, setLocation] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  
  const [keyword, setKeyword] = useState(params.get("q") || "");
  const [place, setPlace] = useState(params.get("loc") || "");
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // Mock loading state
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Update URL with new params without reloading page (wouter setLocation does this)
    setLocation(`/search?q=${encodeURIComponent(keyword)}&loc=${encodeURIComponent(place)}`);
    // Re-trigger loading for effect
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 800);
  };

  return (
    <div className="flex flex-col h-screen w-full bg-background text-foreground overflow-hidden">
      {/* Header / Search Bar */}
      <header className="h-16 border-b border-white/10 bg-black/40 backdrop-blur-md flex items-center px-4 gap-4 z-20 shrink-0">
        <button 
          onClick={() => setLocation("/")}
          className="p-2 rounded-full hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        <div className="flex items-center gap-2 mr-4">
           <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
              <Layers className="w-3 h-3 text-primary" />
           </div>
           <span className="font-display font-bold text-lg tracking-tight hidden md:block">Voyager</span>
        </div>

        <form onSubmit={handleSearch} className="flex-1 max-w-3xl flex items-center gap-2">
          <div className="flex items-center flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 focus-within:border-primary/50 transition-colors">
             <Search className="w-4 h-4 text-muted-foreground mr-2" />
             <input 
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="bg-transparent border-none outline-none text-sm w-full placeholder:text-muted-foreground/50"
                placeholder="Keywords..."
             />
          </div>
          <div className="flex items-center flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 focus-within:border-primary/50 transition-colors relative">
             <MapPin className="w-4 h-4 text-muted-foreground mr-2" />
             <input 
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                className="bg-transparent border-none outline-none text-sm w-full placeholder:text-muted-foreground/50"
                placeholder="Location..."
             />
             <button 
                type="button"
                onClick={() => setIsPickerOpen(true)}
                className="ml-2 p-1 rounded hover:bg-white/10 text-primary text-xs font-mono border border-primary/20 bg-primary/5"
             >
               AOI
             </button>
          </div>
          <button type="submit" className="p-2 bg-primary rounded-lg text-primary-foreground hover:bg-primary/90">
            <Search className="w-4 h-4" />
          </button>
        </form>

        <div className="ml-auto flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-secondary border border-white/10" />
        </div>
      </header>

      {/* Main Content Split View */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Left Panel: Results List */}
        <div className="w-full md:w-[450px] border-r border-white/10 bg-background/50 flex flex-col z-10">
          {/* Filters Bar */}
          <div className="h-12 border-b border-white/10 flex items-center px-4 gap-2 overflow-x-auto no-scrollbar shrink-0">
             <button className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs hover:bg-white/10 whitespace-nowrap">
               <Filter className="w-3 h-3" /> Filters
             </button>
             <button className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs hover:bg-white/10 whitespace-nowrap">
               <Calendar className="w-3 h-3" /> Date Range
             </button>
             <button className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs hover:bg-white/10 whitespace-nowrap">
               Cloud Cover &lt; 20%
             </button>
             <div className="ml-auto text-xs text-muted-foreground">
               {MOCK_RESULTS.length} results
             </div>
          </div>

          {/* Results List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
             {isLoading ? (
               // Loading Skeletons
               Array.from({ length: 4 }).map((_, i) => (
                 <div key={i} className="h-32 rounded-xl bg-white/5 animate-pulse" />
               ))
             ) : (
               MOCK_RESULTS.map((result) => (
                 <motion.div 
                   key={result.id}
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="group relative bg-card/50 border border-white/5 hover:border-primary/50 rounded-xl p-3 transition-all cursor-pointer hover:shadow-lg hover:bg-card"
                 >
                    <div className="flex gap-3">
                       <div className="w-24 h-24 rounded-lg overflow-hidden shrink-0 bg-black/50 relative">
                          <img src={result.thumbnail} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="" />
                          <div className="absolute bottom-0 left-0 right-0 p-1 bg-gradient-to-t from-black/80 to-transparent text-[10px] text-white font-mono text-center">
                            Preview
                          </div>
                       </div>
                       <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                             <h3 className="font-medium text-sm text-primary truncate pr-2">{result.title}</h3>
                             <button className="text-muted-foreground hover:text-foreground">
                               <MoreVertical className="w-4 h-4" />
                             </button>
                          </div>
                          
                          <div className="mt-2 space-y-1">
                             <div className="flex items-center text-xs text-muted-foreground">
                               <Calendar className="w-3 h-3 mr-1.5" />
                               {result.date}
                             </div>
                             <div className="flex items-center text-xs text-muted-foreground">
                               <Layers className="w-3 h-3 mr-1.5" />
                               {result.platform}
                             </div>
                             <div className="flex items-center gap-2 mt-2">
                                <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-muted-foreground">
                                  {result.provider}
                                </span>
                                {result.cloudCover !== "N/A" && (
                                  <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-muted-foreground">
                                    ☁ {result.cloudCover}
                                  </span>
                                )}
                             </div>
                          </div>
                       </div>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-white/5 flex justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                       <button className="p-1.5 rounded hover:bg-white/10 text-muted-foreground hover:text-primary" title="Zoom to">
                         <MapPin className="w-4 h-4" />
                       </button>
                       <button className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground text-xs font-medium transition-colors">
                         <Download className="w-3 h-3" />
                         Download
                       </button>
                    </div>
                 </motion.div>
               ))
             )}
          </div>
        </div>

        {/* Right Panel: Map View */}
        <div className="flex-1 bg-black/20 relative hidden md:block">
           <MapContainer 
               center={[34.05, -118.25]} 
               zoom={10} 
               style={{ height: '100%', width: '100%' }}
               className="z-0"
             >
               <TileLayer
                 attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                 url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
               />
               {!isLoading && MOCK_RESULTS.map(result => (
                 <Rectangle 
                    key={result.id}
                    bounds={result.bounds} 
                    pathOptions={{ color: '#00ffff', weight: 1, fillOpacity: 0.1 }} 
                 />
               ))}
           </MapContainer>
           
           {/* Map Controls Overlay */}
           <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2">
              <button className="w-8 h-8 bg-black/60 backdrop-blur rounded-md border border-white/10 flex items-center justify-center text-white hover:bg-white/10">
                <Layers className="w-4 h-4" />
              </button>
           </div>
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