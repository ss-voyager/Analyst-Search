import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Search, MapPin, Globe, Navigation, ArrowRight, Command } from "lucide-react";
import heroBg from "@assets/generated_images/dark_cinematic_view_of_earth_from_space_with_data_overlays.png";
import { LocationPicker } from "@/components/location-picker";
import { ThemeToggle } from "@/components/theme-toggle";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Home() {
  const [, setLocation] = useLocation();
  const [keyword, setKeyword] = useState("");
  const [place, setPlace] = useState("");

  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyword.trim() || place.trim()) {
      console.log("Searching for:", keyword, "in", place);
      setLocation(`/search?q=${encodeURIComponent(keyword)}&loc=${encodeURIComponent(place)}`);
    }
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

  return (
    <div className="min-h-screen w-full bg-background text-foreground overflow-hidden relative selection:bg-primary/30">
      {/* Background Asset */}
      <div 
        className="absolute inset-0 z-0 opacity-60 pointer-events-none"
        style={{
          backgroundImage: `url(${heroBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          maskImage: 'linear-gradient(to bottom, black 20%, transparent 100%)'
        }}
      />

      {/* Overlay Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none z-0" />

      {/* Navbar */}
      <nav className="relative z-10 w-full px-6 py-6 flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
            <Globe className="w-4 h-4 text-primary animate-pulse" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight">Voyager</span>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">
            Datasets
          </button>
          <button className="text-sm px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all font-medium backdrop-blur-sm">
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            LIVE SATELLITE FEED
          </div>
          <h1 className="text-5xl md:text-7xl font-display font-bold mb-6 tracking-tight text-white drop-shadow-2xl">
            Map the World's Data.
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Access real-time geospatial intelligence and satellite imagery from any location on Earth.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="w-full max-w-3xl"
        >
          <form onSubmit={handleSearch} className="relative group">
            <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-500" />
            
            <div className="relative flex flex-col md:flex-row items-center bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl transition-all duration-300 focus-within:border-primary/50 focus-within:bg-black/80 divide-y md:divide-y-0 md:divide-x divide-white/10">
              
              {/* Keyword Input */}
              <div className="flex items-center flex-1 w-full px-2">
                <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Search keywords..."
                  className="w-full bg-transparent border-none text-base md:text-lg px-3 py-3 text-foreground placeholder:text-muted-foreground/50 focus:outline-none font-medium"
                  data-testid="input-search-keyword"
                  autoFocus
                />
              </div>

              {/* Location Input */}
              <div className="flex items-center flex-1 w-full px-2 relative">
                <div className="relative flex items-center mr-2">
                  <Select defaultValue="intersects">
                    <SelectTrigger className="h-8 w-[110px] text-xs bg-white/10 border-white/10 rounded-md mr-2 focus:ring-0 focus:ring-offset-0">
                      <SelectValue placeholder="Spatial Rel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="intersects">Intersects</SelectItem>
                      <SelectItem value="within">Within</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <MapPin className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <input
                  type="text"
                  value={place}
                  onChange={(e) => setPlace(e.target.value)}
                  placeholder="Where is it located?"
                  className="w-full bg-transparent border-none text-base md:text-lg px-3 py-3 text-foreground placeholder:text-muted-foreground/50 focus:outline-none font-medium"
                  data-testid="input-search-location"
                />
                <div className="flex items-center gap-1 pr-2">
                  <button 
                    type="button"
                    onClick={openPicker}
                    className={`p-2 rounded-lg transition-all flex items-center gap-2 hover:bg-white/10 text-muted-foreground hover:text-primary`}
                    title="Select Area of Interest"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-scan-line"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/></svg>
                    <span className="text-xs font-medium hidden md:inline-block">AOI</span>
                  </button>
                </div>
              </div>

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
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/5 hover:border-primary/40 hover:bg-white/10 text-sm text-muted-foreground hover:text-foreground transition-all duration-300"
              >
                <Navigation className="w-3 h-3" />
                {s}
              </button>
            ))}
          </motion.div>
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
            &copy; 2024 Voyager Geospatial.
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