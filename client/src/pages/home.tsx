import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Search, Sparkles, ArrowRight, Command } from "lucide-react";
import heroBg from "@assets/generated_images/abstract_dark_tech_background_with_focus_lines.png";

export default function Home() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // For now, just log or maybe navigate to a search results page mockup if it existed
      console.log("Searching for:", searchQuery);
      // setLocation(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const suggestions = [
    "Quantum Computing",
    "Deep Space Network",
    "Neural Interfaces",
    "Mars Colonization"
  ];

  return (
    <div className="min-h-screen w-full bg-background text-foreground overflow-hidden relative selection:bg-primary/30">
      {/* Background Asset */}
      <div 
        className="absolute inset-0 z-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage: `url(${heroBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          maskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)'
        }}
      />

      {/* Navbar */}
      <nav className="relative z-10 w-full px-6 py-6 flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight">Telescope</span>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">
            About
          </button>
          <button className="text-sm px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all font-medium backdrop-blur-sm">
            Sign In
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] px-4 w-full max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl md:text-7xl font-display font-bold mb-6 tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60 pb-2">
            Discover the Unknown.
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Explore the vastness of human knowledge with our mission-critical search engine.
            Fast, private, and designed for discovery.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="w-full max-w-2xl"
        >
          <form onSubmit={handleSearch} className="relative group">
            <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-500" />
            <div className="relative flex items-center bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl transition-all duration-300 focus-within:border-primary/50 focus-within:bg-black/60">
              <Search className="w-6 h-6 text-muted-foreground ml-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="What are you looking for?"
                className="w-full bg-transparent border-none text-lg px-4 py-4 text-foreground placeholder:text-muted-foreground/50 focus:outline-none font-medium"
                data-testid="input-search-main"
                autoFocus
              />
              <div className="hidden md:flex items-center mr-2 gap-2">
                <div className="flex items-center px-2 py-1 rounded border border-white/10 bg-white/5 text-xs text-muted-foreground font-mono">
                  <Command className="w-3 h-3 mr-1" />K
                </div>
                <button 
                  type="submit"
                  className="p-3 rounded-xl bg-primary hover:bg-primary/90 text-white transition-colors"
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
                onClick={() => setSearchQuery(s)}
                className="px-4 py-2 rounded-full bg-white/5 border border-white/5 hover:border-primary/40 hover:bg-white/10 text-sm text-muted-foreground hover:text-foreground transition-all duration-300"
              >
                {s}
              </button>
            ))}
          </motion.div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="absolute bottom-0 w-full p-6 border-t border-white/5 bg-black/20 backdrop-blur-sm z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
          <div className="flex gap-6">
            <a href="#" className="hover:text-primary transition-colors">Privacy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms</a>
            <a href="#" className="hover:text-primary transition-colors">Settings</a>
          </div>
          <div>
            &copy; 2024 Telescope Inc. All systems nominal.
          </div>
        </div>
      </footer>
    </div>
  );
}