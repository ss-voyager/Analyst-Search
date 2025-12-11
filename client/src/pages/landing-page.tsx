import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Search, MapPin, ArrowRight, Map as MapIcon } from "lucide-react";
import heroBg from "@assets/generated_images/dark_earth_night_view.png";
import { LocationPicker } from "@/components/location-picker";
import { ThemeToggle } from "@/components/theme-toggle";

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
            <div className={`absolute inset-0 bg-primary/20 rounded-2xl blur-xl transition-opacity duration-500 ${(isSearchFocused || isLocationFocused) ? 'opacity-50' : 'opacity-0 group-hover:opacity-30'}`} />
            
            <div className="relative flex flex-col md:flex-row items-stretch gap-2">
              {/* Keyword Search Bar */}
              <div className={`flex-1 flex items-center bg-white/80 dark:bg-black/80 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-2xl p-2 shadow-2xl transition-all duration-300 ${isSearchFocused ? 'border-primary/50 bg-white/90 dark:bg-black/90' : ''}`}>
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
                    placeholder="Keywords..."
                    className="w-full bg-transparent border-none text-base pl-10 pr-3 py-3 text-foreground placeholder:text-muted-foreground/70 focus:outline-none font-medium"
                    data-testid="input-search-keyword"
                    autoFocus
                    aria-label="Search keywords"
                  />
                </div>
              </div>

              {/* Location Search Bar with Map Controls */}
              <div className={`flex-1 flex items-center bg-white/80 dark:bg-black/80 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-2xl p-2 shadow-2xl transition-all duration-300 ${isLocationFocused ? 'border-green-500/50 bg-white/90 dark:bg-black/90' : ''}`}>
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
                    placeholder="Location..."
                    className="w-full bg-transparent border-none text-base pl-10 pr-3 py-3 text-foreground placeholder:text-muted-foreground/70 focus:outline-none font-medium"
                    data-testid="input-search-location"
                    aria-label="Search location"
                  />
                </div>

                {/* Divider */}
                <div className="h-8 w-[1px] bg-black/10 dark:bg-white/10 mx-1" />

                {/* Map Draw Button */}
                <button
                  type="button"
                  onClick={openPicker}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors shrink-0 ${place ? 'text-green-600 dark:text-green-400 bg-green-500/10' : 'text-muted-foreground hover:text-foreground'}`}
                  title="Draw area on map"
                  data-testid="button-open-map-picker"
                >
                  <MapIcon className="w-4 h-4" />
                  <span className="text-xs font-medium hidden lg:inline">{place ? 'Area Set' : 'Draw'}</span>
                  {place && <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />}
                </button>
              </div>

              {/* Search Button */}
              <button 
                type="submit"
                className="p-4 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground transition-colors flex items-center justify-center shadow-lg"
                data-testid="button-search-submit"
                title="Search"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </form>
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