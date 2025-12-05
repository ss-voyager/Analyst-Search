import { useState } from "react";
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
  const [keyword, setKeyword] = useState("");
  const [place, setPlace] = useState("");

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isLocationFocused, setIsLocationFocused] = useState(false);
  const [showLocationOptions, setShowLocationOptions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Searching for:", keyword, "in", place);
    setLocation(`/search?q=${encodeURIComponent(keyword)}&loc=${encodeURIComponent(place)}`);
  };

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
            Map the World's Data.
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
              
              {/* Keyword Input */}
              <div className="flex items-center flex-1 w-full px-2">
                <label htmlFor="keyword-input" className="sr-only">Search keywords</label>
                <input
                  id="keyword-input"
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  placeholder="Search keywords..."
                  className="w-full bg-transparent border-none text-base md:text-lg px-3 py-3 text-foreground placeholder:text-muted-foreground/70 focus:outline-none font-medium"
                  data-testid="input-search-keyword"
                  autoFocus
                  aria-label="Search keywords"
                />
              </div>

              {/* Location Input */}
              <div className="flex items-center flex-[1.5] w-full px-2 relative">
                
                <div className="flex items-center flex-1 w-full relative">
                   <div className="mr-2 text-muted-foreground">
                       <MapPin className="w-5 h-5" />
                   </div>
                  
                  <label htmlFor="loc-input" className="sr-only">Location</label>
                  <input
                    id="loc-input"
                    type="text"
                    value={place}
                    onChange={(e) => {
                      setPlace(e.target.value);
                      setShowLocationOptions(false);
                      setSelectedIndex(-1);
                    }}
                    onKeyDown={handleKeyDown}
                    onFocus={() => {
                      setIsLocationFocused(true);
                      setIsSearchFocused(true);
                    }}
                    onBlur={() => {
                      setTimeout(() => setIsLocationFocused(false), 200);
                      setIsSearchFocused(false);
                    }}
                    placeholder="Enter place name"
                    className="w-full bg-transparent border-none text-base md:text-lg px-3 py-3 text-foreground placeholder:text-muted-foreground/70 focus:outline-none font-medium"
                    data-testid="input-search-location"
                    autoComplete="off"
                    aria-label="Location"
                    aria-autocomplete="list"
                    aria-controls="location-suggestions"
                    aria-activedescendant={selectedIndex >= 0 ? `suggestion-${selectedIndex}` : undefined}
                  />
                  {isLocationFocused && !showLocationOptions && filteredPlaces.length > 0 && (
                     <div 
                       id="location-suggestions"
                       role="listbox"
                       className="absolute top-full left-0 w-full mt-2 bg-white/90 dark:bg-black/90 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2"
                     >
                        <div className="p-2 space-y-1">
                          {filteredPlaces.map((p, i) => (
                            <button
                              key={i}
                              id={`suggestion-${i}`}
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
                                  : 'hover:bg-black/5 dark:hover:bg-white/10 text-foreground'
                              }`}
                            >
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors ${
                                i === selectedIndex
                                  ? 'bg-primary/20 border-primary/30'
                                  : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 group-hover:border-black/30 dark:group-hover:border-white/30'
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

              {/* Search Button */}
              <div className="p-1 w-full md:w-auto">
                 <button 
                  type="submit"
                  className="w-full md:w-auto p-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground transition-colors flex items-center justify-center"
                  data-testid="button-search-submit"
                >
                  <Search className="w-5 h-5" />
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
                 onClick={() => setKeyword(s)}
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