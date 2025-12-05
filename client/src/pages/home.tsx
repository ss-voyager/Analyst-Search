import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Search, MapPin, Globe, Navigation, ArrowRight, Command, Upload, Crosshair, Map as MapIcon } from "lucide-react";
import heroBg from "@assets/generated_images/dark_earth_night_view.png";
import { LocationPicker } from "@/components/location-picker";
import { ThemeToggle } from "@/components/theme-toggle";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function Home() {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const [place, setPlace] = useState(""); // Keep place state for Map picker
  const [detectedType, setDetectedType] = useState<'keyword' | 'place' | 'mixed'>('keyword');

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isLocationFocused, setIsLocationFocused] = useState(false);
  const [showLocationOptions, setShowLocationOptions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simple "Intelligent" parsing for the mockup
    let searchKeyword = query;
    let searchLocation = place;

    // If place is empty (because we removed the separate input), try to extract from query
    if (!searchLocation) {
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
    }

    console.log("Searching for:", searchKeyword, "in", searchLocation);
    setLocation(`/search?q=${encodeURIComponent(searchKeyword)}&loc=${encodeURIComponent(searchLocation)}`);
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

  const openPicker = () => {
    setIsPickerOpen(true);
  };

  const handleLocationSelect = (bounds: string) => {
    setPlace(bounds);
  };

  const suggestions = [
    "Satellite Imagery",
    "Urban Density",
    "Climate Data",
    "Ocean Currents"
  ];

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
  useState(() => {
     setSelectedIndex(-1);
  });

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

  return (
    <div className="min-h-screen w-full bg-background text-foreground overflow-hidden relative selection:bg-primary/30">
      {/* Background Asset */}
      <div 
        className={`absolute inset-0 z-0 pointer-events-none transition-all duration-500 ease-out ${isSearchFocused ? 'opacity-0 dark:opacity-30 scale-105' : 'opacity-0 dark:opacity-100 scale-100'}`}
        style={{
          backgroundImage: `url(${heroBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className={`absolute inset-0 z-0 bg-background/20 pointer-events-none transition-opacity duration-500 ${isSearchFocused ? 'bg-background/40' : 'bg-background/20'}`} />

      {/* Overlay Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none z-0" />

      {/* Navbar */}
      <nav className="relative z-10 w-full px-6 py-6 flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="font-display font-bold text-3xl tracking-tight">
            <span className="text-[#3b82f6]">V</span>
            <span className="text-[#0c3a6d] dark:text-white">o</span>
            <span className="text-[#3b82f6]">yager</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-sm px-4 py-2 rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/10 transition-all font-medium backdrop-blur-sm">
            Sign In
          </button>
          <ThemeToggle />
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] px-4 w-full max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl md:text-7xl font-display font-bold mb-6 tracking-tight text-foreground drop-shadow-2xl">
            Find. Map. Discover.
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="w-full max-w-3xl"
        >
          <form onSubmit={handleSearch} className="relative group">
            <div className={`absolute inset-0 bg-primary/20 rounded-2xl blur-xl transition-opacity duration-500 ${isSearchFocused ? 'opacity-50' : 'opacity-0 group-hover:opacity-30'}`} />
            
            <div className={`relative flex flex-col md:flex-row items-center bg-white/80 dark:bg-black/80 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-2xl p-2 shadow-2xl transition-all duration-500 ease-out ${isSearchFocused ? 'scale-[1.02] border-primary/50 bg-white/90 dark:bg-black/90' : 'scale-100'} divide-y md:divide-y-0 md:divide-x divide-black/10 dark:divide-white/10`}>
              
              {/* Intelligent Input */}
              <div className="flex items-center flex-1 w-full px-2 relative">
                <label htmlFor="query-input" className="sr-only">Search keywords or location</label>
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors duration-300">
                   {detectedType === 'place' ? <MapPin className="w-5 h-5 text-primary" /> : <Search className="w-5 h-5" />}
                </div>
                <input
                  id="query-input"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  placeholder="Search for vegetation in California..."
                  className="w-full bg-transparent border-none text-base md:text-lg pl-10 pr-3 py-3 text-foreground placeholder:text-muted-foreground/70 focus:outline-none font-medium"
                  data-testid="input-search-query"
                  autoFocus
                  aria-label="Search keywords or location"
                />
                {detectedType === 'mixed' && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden md:flex gap-1 pointer-events-none">
                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">KEYWORD</span>
                        <span className="text-[10px] text-muted-foreground px-0.5">+</span>
                        <span className="text-[10px] bg-green-500/10 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded font-mono">PLACE</span>
                    </div>
                )}
              </div>

              {/* Map Draw Button */}
              <div className="h-8 w-[1px] bg-black/10 dark:bg-white/10 mx-2 hidden md:block" />
              
              <button
                type="button"
                onClick={openPicker}
                className={`hidden md:flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors shrink-0 ${place ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-primary'}`}
                title="Draw area on map"
              >
                <MapIcon className="w-5 h-5" />
                <span className="text-sm font-medium">{place ? 'Area Selected' : 'Map'}</span>
                {place && <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
              </button>

              {/* Search Button */}
              <div className="p-1 w-full md:w-auto">
                 <button 
                  type="submit"
                  className="w-full md:w-auto p-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground transition-colors flex items-center justify-center"
                  data-testid="button-search-submit"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>

            </div>
          </form>

          {/* Suggestions */}
          {!isLocationFocused && (
             <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ delay: 0.5 }}
             className="mt-6 flex flex-wrap justify-center gap-3"
           >
             {suggestions.map((s, i) => (
               <button
                 key={i}
                 onClick={() => setQuery(s)}
                 className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/40 dark:bg-black/40 backdrop-blur-md border border-black/10 dark:border-white/10 hover:border-primary/40 hover:bg-white/60 dark:hover:bg-black/60 text-sm text-foreground dark:text-white/90 hover:text-foreground dark:hover:text-white transition-all duration-300 shadow-lg"
               >
                 <Navigation className="w-3 h-3" />
                 {s}
               </button>
             ))}
           </motion.div>
          )}
        </motion.div>
      </main>

      {/* Footer Details */}
      <footer className="absolute bottom-0 w-full p-6 border-t border-white/5 bg-black/40 backdrop-blur-sm z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
          <div className="flex gap-6 font-mono">
            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500"></span> SYSTEM ONLINE</span>
            <span>LAT: 34.0522° N</span>
            <span>LNG: 118.2437° W</span>
          </div>
          <div>
            &copy; 2026 Voyager Search.
          </div>
        </div>
      </footer>

      <LocationPicker 
        isOpen={isPickerOpen} 
        onClose={() => setIsPickerOpen(false)} 
        onSelect={handleLocationSelect} 
      />
    </div>
  );
}