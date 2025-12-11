import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing-page";
import SearchResultsPage from "@/pages/search-results-page";
import ItemDetailPage from "@/pages/item-detail-page";
import "leaflet/dist/leaflet.css";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/search" component={SearchResultsPage} />
      <Route path="/item/:id" component={ItemDetailPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;