import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Search, Map as MapIcon, LogOut } from "lucide-react";
import { LocationPicker } from "@/components/location-picker";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/useAuth";
import wavePattern from "@assets/wave-pattern.png";

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();
  const [query, setQuery] = useState("");
  const [place, setPlace] = useState("");

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

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

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await login();
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="min-h-screen w-full bg-black text-white overflow-hidden relative selection:bg-primary/30">
      {/* Top right controls */}
      <div className="absolute top-6 right-6 z-20 flex items-center gap-4">
        {isLoading ? (
          <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />
        ) : isAuthenticated && user ? (
          <div className="flex items-center gap-3">
            {user.profileImageUrl && (
              <img
                src={user.profileImageUrl}
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover border border-white/20"
              />
            )}
            <span className="text-sm font-medium hidden sm:inline text-white/80">
              {user.firstName || user.name || user.username || user.email?.split('@')[0] || 'User'}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all font-medium flex items-center gap-2"
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="text-sm px-5 py-2 rounded-full bg-white text-black hover:bg-white/90 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="button-login"
          >
            {isLoggingIn ? 'Opening...' : 'Sign In'}
          </button>
        )}
        <ThemeToggle />
      </div>

      {/* Main Content */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-[60vh] px-4 w-full max-w-3xl mx-auto pt-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-10"
        >
          <p className="text-lg md:text-xl font-light tracking-widest text-white mb-8" style={{ fontFamily: 'Inter, sans-serif' }}>
            Voyager
          </p>
          <h1 className="text-3xl md:text-4xl font-light text-white italic" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
            Let's search your data.
          </h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="w-full max-w-2xl"
        >
          <form onSubmit={handleSearch} className="relative">
            <div className={`flex items-center bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-3 transition-all duration-300 ${isSearchFocused ? 'border-white/40 bg-white/15' : ''}`}>
              <Search className="w-5 h-5 text-white/50 mr-3 shrink-0" />
              <input
                id="search-input"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                placeholder="Search by name, location, or keywords."
                className="flex-1 bg-transparent border-none text-base text-white placeholder:text-white/40 focus:outline-none"
                data-testid="input-search"
                autoFocus
                aria-label="Search by name, location, or keywords"
              />

              {/* Map Picker Button */}
              <button
                type="button"
                onClick={openPicker}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors shrink-0 ml-2 ${place ? 'text-green-400 bg-green-500/20' : 'text-white/50 hover:text-white/80 hover:bg-white/10'}`}
                title="Draw area on map"
                data-testid="button-open-map-picker"
              >
                <MapIcon className="w-4 h-4" />
                {place && <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
              </button>
            </div>
          </form>
        </motion.div>
      </main>

      {/* Wave Pattern Background with Ebb and Flow Animation */}
      <div className="absolute bottom-0 left-0 right-0 h-[50%] pointer-events-none overflow-hidden">
        <div
          className="absolute inset-0 animate-ebb-flow"
          style={{
            backgroundImage: `url(${wavePattern})`,
            backgroundSize: 'cover',
            backgroundPosition: 'bottom center',
            backgroundRepeat: 'no-repeat',
          }}
        />
      </div>

      <style>{`
        @keyframes ebb-flow {
          0%, 100% {
            transform: translateX(0) scale(1);
          }
          25% {
            transform: translateX(-1%) scale(1.02);
          }
          50% {
            transform: translateX(0) scale(1.03);
          }
          75% {
            transform: translateX(1%) scale(1.02);
          }
        }
        .animate-ebb-flow {
          animation: ebb-flow 8s ease-in-out infinite;
        }
      `}</style>

      <LocationPicker
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelect={handleLocationSelect}
      />
    </div>
  );
}