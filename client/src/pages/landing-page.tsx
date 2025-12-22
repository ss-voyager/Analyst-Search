import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Search, Map as MapIcon, LogOut, ArrowRight } from "lucide-react";
import { LocationPicker } from "@/components/location-picker";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/useAuth";
import wavePattern from "@assets/wave-pattern-clean.jpg";
import voyagerLogo from "@assets/voyager-logo.svg";

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
    console.log('Sign In button clicked');
    setIsLoggingIn(true);
    try {
      await login();
      console.log('Login completed, refreshing auth state...');
    } catch (error) {
      console.error('Login failed:', error);
      alert('Login failed. Please check console for details.');
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
    <div className="min-h-screen w-full bg-white dark:bg-black text-foreground overflow-hidden relative selection:bg-primary/30">
      {/* Top right controls */}
      <div className="fixed top-6 right-6 z-50 flex items-center gap-4">
        {isAuthenticated && user ? (
          <div className="flex items-center gap-3">
            {user.profileImageUrl && (
              <img
                src={user.profileImageUrl}
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover border border-border"
              />
            )}
            <span className="text-sm font-medium hidden sm:inline text-muted-foreground">
              {user.firstName || user.name || user.username || user.email?.split('@')[0] || 'User'}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm px-4 py-2 rounded-full bg-foreground text-background hover:bg-foreground/90 transition-all font-medium flex items-center gap-2 shadow-lg"
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogin}
            disabled={isLoggingIn || isLoading}
            className="text-sm px-6 py-2.5 rounded-full bg-black dark:bg-white text-white dark:text-black hover:bg-black/80 dark:hover:bg-white/90 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg border border-black/20 dark:border-white/20"
            data-testid="button-login"
          >
            {isLoading ? 'Loading...' : isLoggingIn ? 'Opening...' : 'Sign In'}
          </button>
        )}
        <ThemeToggle />
      </div>

      {/* Main Content */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-[60vh] px-4 w-full max-w-2xl mx-auto pt-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col items-center text-center mb-6 w-full"
        >
          <img
            src={voyagerLogo}
            alt="Voyager"
            className="h-5 md:h-6 mb-8 dark:invert-0 invert"
          />
          <h1 className="text-2xl md:text-3xl text-foreground font-bold" style={{ fontFamily: "'Monda', sans-serif" }}>
            Let's search your data.
          </h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="w-full"
        >
          <form onSubmit={handleSearch} className="relative">
            <div className={`flex items-center bg-black/5 dark:bg-white/10 backdrop-blur-sm border border-black/10 dark:border-white/20 rounded-full px-4 py-3 transition-all duration-300 ${isSearchFocused ? 'border-black/30 dark:border-white/40 bg-black/10 dark:bg-white/15' : ''}`}>
              <Search className="w-5 h-5 text-muted-foreground mr-3 shrink-0" />
              <input
                id="search-input"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                placeholder="Search by name, location, or keywords."
                className="flex-1 bg-transparent border-none text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
                data-testid="input-search"
                autoFocus
                aria-label="Search by name, location, or keywords"
              />

              {/* Map Picker Button */}
              <button
                type="button"
                onClick={openPicker}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors shrink-0 ml-2 ${place ? 'text-green-600 dark:text-green-400 bg-green-500/20' : 'text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10'}`}
                title="Draw area on map"
                data-testid="button-open-map-picker"
              >
                <MapIcon className="w-4 h-4" />
                {place && <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />}
              </button>

              {/* Search Button */}
              <button
                type="submit"
                className="flex items-center justify-center w-9 h-9 rounded-full bg-foreground text-background hover:bg-foreground/90 transition-colors shrink-0 ml-2 shadow-md"
                title="Search"
                data-testid="button-search-submit"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </motion.div>
      </main>

      {/* Wave Pattern Background with Ebb and Flow Animation */}
      <div className="absolute bottom-0 left-0 right-0 h-[50%] pointer-events-none overflow-hidden">
        <div
          className="absolute inset-0 animate-ebb-flow opacity-100"
          style={{
            backgroundImage: `url(${wavePattern})`,
            backgroundSize: '100% auto',
            backgroundPosition: 'center center',
            backgroundRepeat: 'no-repeat',
          }}
        />
        {/* Tall gradient overlay to blend with page background */}
        <div className="absolute inset-x-0 top-0 h-[60%] bg-gradient-to-b from-white dark:from-black via-white/80 dark:via-black/80 to-transparent" />
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
        initialBounds={place}
      />
    </div>
  );
}