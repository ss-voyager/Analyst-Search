import { Switch, Route, Router as WouterRouter } from "wouter";

// Get base path from environment variable (e.g., "/analyst-search")
const basePath = import.meta.env.VITE_BASE_PATH?.replace(/\/$/, '') || '';
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/AuthContext";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing-page";
import SearchResultsPage from "@/pages/search-results-page";
import ItemDetailPage from "@/pages/item-detail-page";
import VoyagerSearchPage from "@/pages/voyager-search-page";
import "leaflet/dist/leaflet.css";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/search" component={SearchResultsPage} />
      <Route path="/item/:id" component={ItemDetailPage} />
      <Route path="/voyager" component={VoyagerSearchPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <WouterRouter base={basePath}>
              <Toaster />
              <SonnerToaster
                theme="dark"
                position="bottom-right"
                closeButton
                toastOptions={{
                  style: {
                    background: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    color: 'hsl(var(--popover-foreground))',
                  },
                  className: 'sonner-toast',
                }}
              />
              <Router />
            </WouterRouter>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;