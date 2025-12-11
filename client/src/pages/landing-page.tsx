import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Search, MapPin, Globe, Navigation, ArrowRight, Command, Upload, Crosshair, Map as MapIcon, TrendingUp } from "lucide-react";
import heroBg from "@assets/generated_images/dark_earth_night_view.png";
import { LocationPicker } from "@/components/location-picker";
import { ThemeToggle } from "@/components/theme-toggle";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const [place, setPlace] = useState("");

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isLocationFocused, setIsLocationFocused] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Searching for:", query, "in", place);
    setLocation(`/search?q=${encodeURIComponent(query)}&loc=${encodeURIComponent(place)}`);
  };

  const openPicker = () => {
    setIsPickerOpen(true);
  };

  const handleLocationSelect = (bounds: string) => {
    setPlace(bounds);
  };

  const suggestions = [
    { label: "Satellite Imagery", trending: true },
    { label: "Urban Density", trending: true },
    { label: "Climate Data", trending: true },
    { label: "Ocean Currents", trending: true }
  ];

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
          <form onSubmit={handleSearch} className="relative group space-y-3">
            <div className={`absolute inset-0 bg-primary/20 rounded-2xl blur-xl transition-opacity duration-500 ${isSearchFocused ? 'opacity-50' : 'opacity-0 group-hover:opacity-30'}`} />
            
            {/* Keyword Search Bar */}
            <div className={`relative flex items-center bg-white/80 dark:bg-black/80 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-2xl p-2 shadow-2xl transition-all duration-300 ${isSearchFocused ? 'border-primary/50 bg-white/90 dark:bg-black/90' : ''}`}>
              <div className="flex items-center flex-1 px-2 relative">
                <label htmlFor="keyword-input" className="sr-only">Search keywords</label>
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Search className="w-5 h-5" />
                </div>
                <input
                  id="keyword-input"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  placeholder="Search keywords (e.g., vegetation, urban, coastal...)"
                  className="w-full bg-transparent border-none text-base md:text-lg pl-10 pr-3 py-3 text-foreground placeholder:text-muted-foreground/70 focus:outline-none font-medium"
                  data-testid="input-search-keyword"
                  autoFocus
                  aria-label="Search keywords"
                />
                {query.length > 0 && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden md:flex gap-1 pointer-events-none">
                    <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">KEYWORD</span>
                  </div>
                )}
              </div>
            </div>

            {/* Location Search Bar with Map Controls */}
            <div className={`relative flex items-center bg-white/80 dark:bg-black/80 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-2xl p-2 shadow-2xl transition-all duration-300 ${isLocationFocused ? 'border-green-500/50 bg-white/90 dark:bg-black/90' : ''}`}>
              <div className="flex items-center flex-1 px-2 relative">
                <label htmlFor="location-input" className="sr-only">Search location</label>
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600 dark:text-green-400">
                  <MapPin className="w-5 h-5" />
                </div>
                <input
                  id="location-input"
                  type="text"
                  value={place}
                  onChange={(e) => setPlace(e.target.value)}
                  onFocus={() => setIsLocationFocused(true)}
                  onBlur={() => setIsLocationFocused(false)}
                  placeholder="Enter location (e.g., California, Amazon Basin...)"
                  className="w-full bg-transparent border-none text-base md:text-lg pl-10 pr-3 py-3 text-foreground placeholder:text-muted-foreground/70 focus:outline-none font-medium"
                  data-testid="input-search-location"
                  aria-label="Search location"
                />
                {place.length > 0 && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden md:flex gap-1 pointer-events-none">
                    <span className="text-[10px] bg-green-500/10 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded font-mono">LOCATION</span>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="h-8 w-[1px] bg-black/10 dark:bg-white/10 mx-2" />

              {/* Map Draw Button */}
              <button
                type="button"
                onClick={openPicker}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors shrink-0 border ${place ? 'text-green-600 dark:text-green-400 bg-green-500/10 border-green-500/30' : 'text-muted-foreground hover:text-foreground border-transparent hover:border-black/10 dark:hover:border-white/10'}`}
                title="Draw area on map"
                data-testid="button-open-map-picker"
              >
                <MapIcon className="w-5 h-5" />
                <span className="text-sm font-medium hidden sm:inline">{place ? 'Area Set' : 'Draw on Map'}</span>
                {place && <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
              </button>

              {/* Clear Location Button */}
              {place && (
                <button
                  type="button"
                  onClick={() => setPlace("")}
                  className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground ml-1"
                  title="Clear location"
                  data-testid="button-clear-location"
                >
                  <Globe className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Search Button */}
            <button 
              type="submit"
              className="w-full p-4 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground transition-colors flex items-center justify-center gap-3 font-semibold text-lg shadow-lg"
              data-testid="button-search-submit"
            >
              <Search className="w-5 h-5" />
              Search Imagery
              <ArrowRight className="w-5 h-5" />
            </button>
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
                 onClick={() => setQuery(s.label)}
                 className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/40 dark:bg-black/40 backdrop-blur-md border border-black/10 dark:border-white/10 hover:border-primary/40 hover:bg-white/60 dark:hover:bg-black/60 text-sm text-foreground dark:text-white/90 hover:text-foreground dark:hover:text-white transition-all duration-300 shadow-lg"
               >
                 {s.trending ? (
                    <TrendingUp className="w-3 h-3 text-primary" />
                 ) : (
                    <Navigation className="w-3 h-3" />
                 )}
                 {s.label}
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