import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Calendar, Layers, Download, Share2, ExternalLink, Info, Globe, Cloud, Clock, Database, Tag, Check, Map as MapIcon, X, PanelRightOpen, PanelRightClose, Loader2, Copy, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemeToggle } from "@/components/theme-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LatLngBoundsExpression, LatLngBounds } from "leaflet";
import { MapContainer, TileLayer, Rectangle, ImageOverlay, useMap } from 'react-leaflet';
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { useTheme } from "@/components/theme-provider";
import { toast } from "sonner";
import { useVoyagerItem, DEFAULT_THUMBNAIL } from "@/features/search/voyager-api";
import { getFormatDisplayName } from "@/features/search/format-utils";

// Helper function to strip HTML tags from a string
function stripHtml(html: string): string {
  // Create a temporary element to parse HTML and extract text
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

// Component to fit map to item bounds with 3x extent
function FitBoundsEffect({ bounds }: { bounds: [[number, number], [number, number]] | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      try {
        const leafletBounds = new LatLngBounds(bounds[0], bounds[1]);
        if (leafletBounds.isValid()) {
          // Expand bounds by 3x for context
          const sw = leafletBounds.getSouthWest();
          const ne = leafletBounds.getNorthEast();
          const latSpan = ne.lat - sw.lat;
          const lngSpan = ne.lng - sw.lng;
          const expandedBounds = new LatLngBounds(
            [Math.max(-90, sw.lat - latSpan), Math.max(-180, sw.lng - lngSpan)],
            [Math.min(90, ne.lat + latSpan), Math.min(180, ne.lng + lngSpan)]
          );
          map.fitBounds(expandedBounds, { padding: [20, 20], animate: false });
        }
      } catch (e) {
        console.error("Error fitting bounds", e);
      }
    }
  }, [bounds, map]);
  return null;
}

export default function ItemDetailPage() {
  const [, params] = useRoute("/item/:id");
  const [, setLocation] = useLocation();
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const [mapStyle, setMapStyle] = useState<'streets' | 'satellite'>('streets');
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showAllKeywords, setShowAllKeywords] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Preserve the search URL from where we came, so back navigation restores filters
  const [searchUrl] = useState(() => {
    if (typeof window !== 'undefined') {
      // First try history state (set by search results navigation)
      const historyState = window.history.state;
      if (historyState?.searchUrl) {
        return historyState.searchUrl;
      }
      // Fallback: check referrer
      try {
        const referrer = document.referrer;
        if (referrer) {
          const url = new URL(referrer);
          if (url.pathname === '/search' || url.pathname.startsWith('/search')) {
            return url.search || '';
          }
        }
      } catch (e) {
        // Invalid referrer URL, ignore
      }
    }
    return '';
  });

  // Helper to navigate back to search with preserved params
  const goBackToSearch = () => {
    setLocation(`/search${searchUrl}`);
  };

  const id = params?.id || null;

  // Fetch item data from API
  const { data: item, isLoading, error } = useVoyagerItem(id);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col h-screen w-full bg-background text-foreground overflow-hidden">
        <header className="h-16 border-b border-border bg-background/80 backdrop-blur-md flex items-center px-4 gap-4 z-20 shrink-0">
          <button
            onClick={goBackToSearch}
            className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Skeleton className="h-6 w-48" />
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading item details...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error or not found state
  if (error || !item) {
    return (
      <div className="flex flex-col h-screen w-full bg-background text-foreground overflow-hidden">
        <header className="h-16 border-b border-border bg-background/80 backdrop-blur-md flex items-center px-4 gap-4 z-20 shrink-0">
          <button
            onClick={goBackToSearch}
            className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="font-display font-bold text-lg">Item Not Found</span>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-center">
            <Info className="w-12 h-12 text-muted-foreground" />
            <h2 className="text-xl font-bold">Item not found</h2>
            <p className="text-muted-foreground max-w-md">
              The item you're looking for doesn't exist or couldn't be loaded.
            </p>
            <Button onClick={goBackToSearch}>Back to Search</Button>
          </div>
        </div>
      </div>
    );
  }

  // Get date for display
  const displayDate = item.modified || item.acquisitionDate || item.publishDate || null;

  const shareUrl = item.fullpath || window.location.href;

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      toast.success("Link copied to clipboard");
  };

  const handleKeywordClick = (keyword: string) => {
      // Navigate to search with keyword filter
      setLocation(`/search?keywords=${encodeURIComponent(keyword)}`);
  };

  const handleDownload = () => {
      if (item.download) {
        window.open(item.download, '_blank');
        toast.success("Download started", {
            description: `Opening download for ${item.title}`
        });
      } else if (item.fullpath) {
        window.open(item.fullpath, '_blank');
        toast.info("Opening item source", {
            description: "Direct download not available, opening source URL."
        });
      } else {
        toast.error("Download not available", {
            description: "This item doesn't have a download link."
        });
      }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-background text-foreground overflow-hidden">
      {/* Header */}
      <header className="h-16 border-b border-border bg-background/80 backdrop-blur-md flex items-center px-4 gap-4 z-20 shrink-0 justify-between">
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={goBackToSearch}
            className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex flex-col min-w-0">
             <h1 className="font-display font-bold text-lg leading-none truncate">{item.title}</h1>
             <span className="text-xs text-muted-foreground font-mono truncate">
               {item.id}
               {displayDate && ` • ${new Date(displayDate).toLocaleDateString()}`}
             </span>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
           <ThemeToggle />
           <div className="w-8 h-8 rounded-full bg-secondary border border-border" />
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Details */}
        <ScrollArea className="flex-1 border-r border-border bg-background/50">
          <div className="p-6 max-w-5xl mx-auto space-y-8 relative">
            {/* Map Toggle Button - top right of content */}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowMap(!showMap)}
              className="absolute top-6 right-6 hidden xl:flex gap-1 text-xs z-10"
            >
              <MapIcon className="w-3.5 h-3.5" />
              {showMap ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
            </Button>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Hero Image / Preview */}
                <div className="col-span-1 md:col-span-1">
                    <div className="rounded-xl overflow-hidden border border-border bg-muted relative aspect-square group shadow-lg">
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.src = DEFAULT_THUMBNAIL; }}
                    />
                    </div>
                    
                    {/* Sidebar Actions - Download & Share */}
                    <div className="mt-4 space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                            <Button className="w-full gap-2" variant="default" onClick={handleDownload}>
                                <Download className="w-4 h-4" /> Download
                            </Button>
                            <Button variant="outline" className="w-full gap-2" onClick={() => setShowShareDialog(true)}>
                                <Share2 className="w-4 h-4" /> Share
                            </Button>
                        </div>
                        {!showMap && (
                             <Button variant="outline" className="w-full gap-2" onClick={() => setIsMapOpen(true)}>
                                <MapIcon className="w-4 h-4" /> View Extent
                             </Button>
                        )}
                    </div>
                </div>

                {/* Main Content */}
                <div className="col-span-1 md:col-span-2 space-y-6">
                    <div>
                        <h2 className="text-2xl font-display font-bold mb-4">{item.title}</h2>
                        {item.description ? (
                          <p className="text-muted-foreground leading-relaxed text-lg" dangerouslySetInnerHTML={{ __html: item.description.substring(0, 500) + (item.description.length > 500 ? '...' : '') }} />
                        ) : (
                          <p className="text-muted-foreground leading-relaxed text-lg italic">No description available.</p>
                        )}
                    </div>

                    {/* Keywords - Clickable Tags */}
                    {item.keywords && item.keywords.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          {(showAllKeywords ? item.keywords : item.keywords.slice(0, 10)).map((keyword, i) => (
                            <Badge
                              key={i}
                              variant="secondary"
                              className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                              onClick={() => handleKeywordClick(keyword)}
                            >
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                        {item.keywords.length > 10 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => setShowAllKeywords(!showAllKeywords)}
                          >
                            {showAllKeywords ? (
                              <>
                                <ChevronUp className="w-3 h-3 mr-1" />
                                Show less
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-3 h-3 mr-1" />
                                Show {item.keywords.length - 10} more
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    )}

                    {/* All Metadata */}
                    <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">All Metadata</h3>
                        <div className="rounded-md border border-border overflow-hidden">
                            <Table>
                                <TableBody>
                                    {item.raw && Object.entries(item.raw)
                                      .filter(([key, value]) => {
                                        // Skip null, undefined, empty arrays, and internal fields
                                        if (value === null || value === undefined) return false;
                                        if (Array.isArray(value) && value.length === 0) return false;
                                        if (typeof value === 'string' && value.trim() === '') return false;
                                        // Skip complex objects like geo (shown on map instead)
                                        if (key === 'geo') return false;
                                        return true;
                                      })
                                      .sort(([a], [b]) => a.localeCompare(b))
                                      .map(([key, value], index) => {
                                        // Format the key for display
                                        const displayKey = key
                                          .replace(/_/g, ' ')
                                          .replace(/^(grp|fs|fd|fi|fl)[ _]/i, '')
                                          .split(' ')
                                          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                          .join(' ');

                                        // Format the value for display
                                        let displayValue: React.ReactNode = '';
                                        if (Array.isArray(value)) {
                                          displayValue = value.join(', ');
                                        } else if (typeof value === 'boolean') {
                                          displayValue = value ? 'Yes' : 'No';
                                        } else if (typeof value === 'number') {
                                          // Format bytes specially
                                          if (key === 'bytes' && value > 0) {
                                            displayValue = `${(value / 1024 / 1024).toFixed(2)} MB`;
                                          } else {
                                            displayValue = value.toLocaleString();
                                          }
                                        } else if (typeof value === 'string') {
                                          // Check if it's a URL
                                          if (value.startsWith('http://') || value.startsWith('https://')) {
                                            displayValue = (
                                              <a href={value} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm break-all">
                                                {value}
                                              </a>
                                            );
                                          // Check if it's a date
                                          } else if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
                                            try {
                                              displayValue = new Date(value).toLocaleString();
                                            } catch {
                                              displayValue = value;
                                            }
                                          // Check if it contains HTML tags and strip them
                                          } else if (/<[^>]+>/.test(value)) {
                                            displayValue = stripHtml(value);
                                          } else {
                                            displayValue = value;
                                          }
                                        } else {
                                          displayValue = JSON.stringify(value);
                                        }

                                        // Apply special formatting for format field
                                        if (key === 'format') {
                                          displayValue = getFormatDisplayName(value as string);
                                        }

                                        return (
                                          <TableRow key={key} className={index % 2 === 0 ? 'bg-muted/30' : ''}>
                                            <TableCell className="font-medium text-muted-foreground w-1/3 align-top">{displayKey}</TableCell>
                                            <TableCell className="text-sm break-all">{displayValue}</TableCell>
                                          </TableRow>
                                        );
                                      })
                                    }
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>
            </div>
          </div>
        </ScrollArea>

        {/* Right Panel - Context Map */}
        {showMap && (
            <div className="w-[400px] hidden xl:block border-l border-border bg-muted/10 relative">
                <MapContainer
                    center={[20, 0]}
                    zoom={1}
                    minZoom={1}
                    style={{ height: '100%', width: '100%' }}
                    className="z-0 bg-muted/20"
                >
                    <FitBoundsEffect bounds={item.bounds as [[number, number], [number, number]] | null} />
                    <TileLayer
                        attribution={mapStyle === 'streets'
                        ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                        : '&copy; <a href="https://www.esri.com/">Esri</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        }
                        url={mapStyle === 'streets'
                        ? (isDark
                            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                            : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png")
                        : "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                        }
                    />
                    {item.bounds && item.thumbnail && (
                      <ImageOverlay
                          url={item.thumbnail}
                          bounds={item.bounds as LatLngBoundsExpression}
                          opacity={0.8}
                      />
                    )}
                    {item.bounds && (
                      <Rectangle
                          bounds={item.bounds as LatLngBoundsExpression}
                          pathOptions={{
                          color: '#00ffff',
                          weight: 2,
                          fillOpacity: 0,
                          }}
                      />
                    )}
                </MapContainer>
                
                {/* Map Style Toggle */}
                <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2">
                    <div className="bg-background/80 backdrop-blur rounded-lg border border-border p-1 flex flex-col gap-1">
                        <button 
                        className={`p-2 hover:bg-muted rounded transition-colors ${mapStyle === 'streets' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`} 
                        title="Street Map"
                        onClick={() => setMapStyle('streets')}
                        >
                        <MapIcon className="w-4 h-4" />
                        </button>
                        <button 
                        className={`p-2 hover:bg-muted rounded transition-colors ${mapStyle === 'satellite' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
                        title="Satellite Map"
                        onClick={() => setMapStyle('satellite')}
                        >
                        <Globe className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="absolute bottom-4 right-4 z-[400] bg-background/80 backdrop-blur px-3 py-1.5 rounded-lg border border-border text-xs font-mono text-foreground/70">
                Footprint Preview
                </div>
            </div>
        )}
      </div>
      
      <AnimatePresence>
        {isMapOpen && (
          <motion.div 
            initial={{opacity: 0}} 
            animate={{opacity: 1}} 
            exit={{opacity: 0}} 
            className="fixed inset-0 z-50 bg-background/95 backdrop-blur flex flex-col"
          >
             <div className="h-16 border-b border-border flex items-center justify-between px-4 bg-background/50">
               <div className="flex items-center gap-2">
                  <MapIcon className="w-5 h-5 text-primary" />
                  <h2 className="font-display font-bold text-lg">Extent Preview</h2>
               </div>
               <Button variant="ghost" size="icon" onClick={() => setIsMapOpen(false)} className="rounded-full hover:bg-muted">
                 <X className="w-5 h-5" />
               </Button>
             </div>
             <div className="flex-1 relative bg-muted/20">
                <MapContainer
                    center={[20, 0]}
                    zoom={1}
                    minZoom={1}
                     style={{ height: '100%', width: '100%' }}
                     className="z-0 bg-muted/20"
                   >
                     <FitBoundsEffect bounds={item.bounds as [[number, number], [number, number]] | null} />
                     <TileLayer
                       attribution={mapStyle === 'streets'
                         ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                         : '&copy; <a href="https://www.esri.com/">Esri</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                       }
                       url={mapStyle === 'streets'
                         ? (isDark
                             ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                             : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png")
                         : "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                       }
                     />
                     {item.bounds && item.thumbnail && (
                       <ImageOverlay
                          url={item.thumbnail}
                          bounds={item.bounds as LatLngBoundsExpression}
                          opacity={0.8}
                       />
                     )}
                     {item.bounds && (
                       <Rectangle
                          bounds={item.bounds as LatLngBoundsExpression}
                          pathOptions={{
                            color: '#00ffff',
                            weight: 2,
                            fillOpacity: 0,
                            }}
                       />
                     )}
                </MapContainer>

                {/* Map Style Toggle - Full Screen */}
                <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2">
                    <div className="bg-background/80 backdrop-blur rounded-lg border border-border p-1 flex flex-col gap-1">
                        <button 
                        className={`p-2 hover:bg-muted rounded transition-colors ${mapStyle === 'streets' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`} 
                        title="Street Map"
                        onClick={() => setMapStyle('streets')}
                        >
                        <MapIcon className="w-4 h-4" />
                        </button>
                        <button 
                        className={`p-2 hover:bg-muted rounded transition-colors ${mapStyle === 'satellite' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
                        title="Satellite Map"
                        onClick={() => setMapStyle('satellite')}
                        >
                        <Globe className="w-4 h-4" />
                        </button>
                    </div>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-primary" />
              Share Item
            </DialogTitle>
            <DialogDescription>
              Copy the URL below to share this item with others.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2 mt-2">
            <div className="grid flex-1 gap-2">
              <Input
                value={shareUrl}
                readOnly
                className="bg-muted/30 font-mono text-xs"
              />
            </div>
            <Button type="button" size="sm" className="px-3" onClick={() => copyToClipboard(shareUrl)}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          {item.fullpath && item.fullpath !== shareUrl && (
            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-2">Source URL:</p>
              <div className="flex items-center space-x-2">
                <Input
                  value={item.fullpath}
                  readOnly
                  className="bg-muted/30 font-mono text-xs"
                />
                <Button type="button" size="sm" variant="outline" className="px-3" onClick={() => copyToClipboard(item.fullpath!)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}