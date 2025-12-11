import { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Rectangle, ImageOverlay, useMap } from 'react-leaflet';
import { LatLngBounds, LatLng } from 'leaflet';
import { Button } from "@/components/ui/button";
import { Map as MapIcon, Globe, Square, MapPin, Pentagon, MousePointer, Maximize2, X, Image, BarChart3 } from "lucide-react";
import { MapDrawControl, SpatialFilterLayer } from "@/components/map-draw-control";
import { SearchResult } from "../types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { MapDisplayMode } from "@/pages/search-results-page";

function hasValidBounds(result: SearchResult): boolean {
  try {
    const bounds = result.bounds as [[number, number], [number, number]];
    if (!Array.isArray(bounds) || bounds.length !== 2) return false;
    const [sw, ne] = bounds;
    if (!Array.isArray(sw) || !Array.isArray(ne)) return false;
    if (sw.length !== 2 || ne.length !== 2) return false;
    const allFinite = [sw[0], sw[1], ne[0], ne[1]].every(v => typeof v === 'number' && isFinite(v));
    const isDefaultBounds = sw[0] === 0 && sw[1] === 0 && ne[0] === 0 && ne[1] === 0;
    return allFinite && !isDefaultBounds;
  } catch {
    return false;
  }
}

const MapEffect = ({ bounds }: { bounds: LatLngBounds | null }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.isValid()) {
      map.flyToBounds(bounds, { padding: [50, 50], duration: 1 });
    }
  }, [bounds, map]);
  return null;
};

const PreviewEffect = ({ result }: { result: SearchResult | undefined }) => {
  const map = useMap();
  useEffect(() => {
    if (result && hasValidBounds(result)) {
      try {
        const bounds = new LatLngBounds(
          (result.bounds as any)[0],
          (result.bounds as any)[1]
        );
        if (bounds.isValid()) {
          map.flyToBounds(bounds, { padding: [20, 20], duration: 1.5 });
        }
      } catch (e) {
        console.error("Error flying to preview bounds", e);
      }
    }
  }, [result, map]);
  return null;
};

interface SearchMapProps {
  showMap: boolean;
  setShowMap: (show: boolean) => void;
  mapStyle: 'streets' | 'satellite';
  setMapStyle: (style: 'streets' | 'satellite') => void;
  isDark: boolean;
  filteredResults: SearchResult[];
  hoveredResultId: number | null;
  previewedResultId: number | null;
  drawMode: 'none' | 'box' | 'point' | 'polygon';
  setDrawMode: (mode: 'none' | 'box' | 'point' | 'polygon') => void;
  setSpatialFilter: (filter: any) => void;
  setPlace: (place: string) => void;
  spatialFilter?: { type: 'box' | 'point' | 'polygon'; data: any } | null;
  mapDisplayMode: MapDisplayMode;
  showFacets: boolean;
}

export function SearchMap({
  showMap,
  setShowMap,
  mapStyle,
  setMapStyle,
  isDark,
  filteredResults,
  hoveredResultId,
  previewedResultId,
  drawMode,
  setDrawMode,
  setSpatialFilter,
  setPlace,
  spatialFilter,
  mapDisplayMode,
  showFacets
}: SearchMapProps) {
  const [mapBounds, setMapBounds] = useState<LatLngBounds | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMiniExpanded, setIsMiniExpanded] = useState(false);

  const validResults = useMemo(() => 
    filteredResults.filter(hasValidBounds), 
    [filteredResults]
  );

  useEffect(() => {
    if (validResults.length > 0) {
      try {
        const firstResult = validResults[0];
        const bounds = new LatLngBounds(
            (firstResult.bounds as any)[0],
            (firstResult.bounds as any)[1]
        );
        validResults.slice(1, 5).forEach(res => {
            bounds.extend((res.bounds as any)[0]);
            bounds.extend((res.bounds as any)[1]);
        });
        if (bounds.isValid()) {
          setMapBounds(bounds);
        }
      } catch (e) {
        console.error("Error calculating bounds", e);
      }
    }
  }, [validResults.length]);

  if (!showMap) return null;

  const hoveredResult = filteredResults.find(r => r.id === hoveredResultId);
  const previewedResult = filteredResults.find(r => r.id === previewedResultId);

  const handleDrawBox = (bounds: LatLngBounds) => {
    setSpatialFilter({ type: 'box', data: bounds });
    setDrawMode('none');
    setPlace(`[${bounds.getWest().toFixed(2)}, ${bounds.getSouth().toFixed(2)}, ${bounds.getEast().toFixed(2)}, ${bounds.getNorth().toFixed(2)}]`);
  };

  const handleDrawPoint = (point: LatLng) => {
    setSpatialFilter({ type: 'point', data: point });
    setDrawMode('none');
    setPlace(`${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}`);
  };

  const handleDrawPolygon = (points: LatLng[]) => {
    setSpatialFilter({ type: 'polygon', data: points });
    setDrawMode('none');
    setPlace("Custom Polygon");
  };

  const tileUrl = mapStyle === 'streets'
    ? (isDark 
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png")
    : "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

  const tileAttribution = mapStyle === 'streets' 
    ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
    : '&copy; <a href="https://www.esri.com/">Esri</a>';

  const MapControls = ({ compact = false }: { compact?: boolean }) => (
    <div className={cn("flex flex-col gap-2 pointer-events-none", compact ? "absolute bottom-3 right-3 z-[600]" : "absolute top-3 right-3 z-[600]")}>
      <div className="bg-background/90 backdrop-blur rounded-lg border border-border p-1 flex flex-col gap-1 shadow-lg pointer-events-auto">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button 
                className={cn("p-1.5 hover:bg-muted rounded transition-colors", mapStyle === 'streets' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}
                onClick={() => setMapStyle('streets')}
              >
                <MapIcon className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">Street Map</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button 
                className={cn("p-1.5 hover:bg-muted rounded transition-colors", mapStyle === 'satellite' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}
                onClick={() => setMapStyle('satellite')}
              >
                <Globe className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">Satellite View</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="bg-background/90 backdrop-blur rounded-lg border border-border p-1 flex flex-col gap-1 shadow-lg pointer-events-auto">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button 
                className={cn("p-1.5 hover:bg-muted rounded transition-colors", drawMode === 'none' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}
                onClick={() => setDrawMode('none')}
              >
                <MousePointer className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">Select</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button 
                className={cn("p-1.5 hover:bg-muted rounded transition-colors", drawMode === 'box' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}
                onClick={() => setDrawMode('box')}
              >
                <Square className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">Rectangle</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button 
                className={cn("p-1.5 hover:bg-muted rounded transition-colors", drawMode === 'point' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}
                onClick={() => setDrawMode('point')}
              >
                <MapPin className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">Pin</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button 
                className={cn("p-1.5 hover:bg-muted rounded transition-colors", drawMode === 'polygon' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}
                onClick={() => setDrawMode('polygon')}
              >
                <Pentagon className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">Polygon</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );

  const MapCanvas = ({ className = "", style = {} }: { className?: string; style?: React.CSSProperties }) => (
    <MapContainer 
      center={[20, 0]} 
      zoom={2} 
      minZoom={2}
      maxBounds={[[-90, -180], [90, 180]]}
      maxBoundsViscosity={1.0}
      style={{ height: '100%', width: '100%', ...style }}
      className={cn("z-0", className)}
      zoomControl={true}
      scrollWheelZoom={true}
      doubleClickZoom={true}
      dragging={true}
    >
      <TileLayer attribution={tileAttribution} url={tileUrl} noWrap={true} />
      <MapEffect bounds={mapBounds} />
      <PreviewEffect result={previewedResult} />
      <MapDrawControl 
        mode={drawMode} 
        onDrawBox={handleDrawBox}
        onDrawPoint={handleDrawPoint}
        onDrawPolygon={handleDrawPolygon}
      />
      {validResults.map(result => (
        <Rectangle 
          key={`footprint-${result.id}`}
          bounds={result.bounds} 
          pathOptions={{ 
            color: hoveredResultId === result.id ? '#00ffff' : '#3b82f6', 
            weight: hoveredResultId === result.id ? 2 : 1, 
            fillOpacity: hoveredResultId === result.id ? 0.2 : 0.05,
            fillColor: hoveredResultId === result.id ? '#00ffff' : '#3b82f6'
          }} 
        />
      ))}
      {hoveredResult && hasValidBounds(hoveredResult) && (
        <ImageOverlay url={hoveredResult.thumbnail} bounds={hoveredResult.bounds} opacity={0.9} zIndex={100} />
      )}
      {previewedResult && previewedResult.id !== hoveredResultId && hasValidBounds(previewedResult) && (
        <ImageOverlay url={previewedResult.thumbnail} bounds={previewedResult.bounds} opacity={0.9} zIndex={90} />
      )}
      {spatialFilter && <SpatialFilterLayer type={spatialFilter.type} data={spatialFilter.data} />}
    </MapContainer>
  );

  const StatsOverlay = () => (
    <div className="absolute bottom-3 left-3 z-[600] bg-background/90 backdrop-blur rounded-lg border border-border px-3 py-2 shadow-lg pointer-events-auto">
      <div className="flex items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-muted-foreground">{validResults.length} visible</span>
        </div>
        <div className="w-px h-4 bg-border" />
        <span className="font-medium">{filteredResults.length} total</span>
      </div>
    </div>
  );

  if (mapDisplayMode === 'fullbleed') {
    return (
      <div className="w-[400px] hidden xl:block border-l border-border shrink-0 transition-all duration-300 relative">
        <div className="absolute inset-0">
          <MapCanvas />
          <MapControls />
          <StatsOverlay />
        </div>
      </div>
    );
  }

  if (mapDisplayMode === 'expandable') {
    const panelWidth = showFacets ? 'w-[400px]' : 'w-[600px]';
    
    if (isFullscreen) {
      return (
        <div className="fixed inset-0 z-[1000] bg-background">
          <MapCanvas />
          <MapControls />
          <StatsOverlay />
          <Button
            variant="secondary"
            size="sm"
            className="absolute top-3 left-3 z-[600] gap-1.5"
            onClick={() => setIsFullscreen(false)}
          >
            <X className="w-4 h-4" />
            Exit Fullscreen
          </Button>
        </div>
      );
    }

    return (
      <div className={cn(panelWidth, "hidden xl:block border-l border-border shrink-0 transition-all duration-300 relative")}>
        <div className="absolute inset-0">
          <MapCanvas />
          <MapControls />
          <StatsOverlay />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute top-3 left-3 z-[600] h-8 w-8"
                  onClick={() => setIsFullscreen(true)}
                >
                  <Maximize2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Fullscreen Map</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    );
  }

  if (mapDisplayMode === 'stacked') {
    return (
      <div className="w-[400px] hidden xl:block border-l border-border shrink-0 transition-all duration-300 relative flex flex-col">
        <div className="h-[55%] relative border-b border-border">
          <MapCanvas />
          <MapControls compact />
        </div>
        <div className="flex-1 overflow-hidden bg-background">
          <div className="p-3 space-y-3 h-full overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5" />
                Coverage Stats
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-muted/30 rounded-lg p-2.5 border border-border/50">
                <div className="text-lg font-bold">{filteredResults.length}</div>
                <div className="text-[10px] text-muted-foreground">Total Results</div>
              </div>
              <div className="bg-muted/30 rounded-lg p-2.5 border border-border/50">
                <div className="text-lg font-bold">{validResults.length}</div>
                <div className="text-[10px] text-muted-foreground">With Footprints</div>
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Image className="w-3.5 h-3.5" />
                Preview Thumbnails
              </h3>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {validResults.slice(0, 6).map(result => (
                <div 
                  key={result.id}
                  className="aspect-square rounded overflow-hidden border border-border/50 cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                  onClick={() => {}}
                >
                  <img src={result.thumbnail} alt={result.title} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mapDisplayMode === 'mini') {
    if (isMiniExpanded) {
      return (
        <div className="fixed inset-0 z-[1000] bg-background/80 backdrop-blur-sm flex items-center justify-center p-8">
          <div className="w-full h-full max-w-5xl max-h-[80vh] bg-background rounded-xl border border-border shadow-2xl overflow-hidden relative">
            <MapCanvas />
            <MapControls />
            <StatsOverlay />
            <Button
              variant="secondary"
              size="sm"
              className="absolute top-3 left-3 z-[600] gap-1.5"
              onClick={() => setIsMiniExpanded(false)}
            >
              <X className="w-4 h-4" />
              Close
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="w-[200px] hidden xl:block border-l border-border shrink-0 transition-all duration-300 relative">
        <div 
          className="absolute inset-0 cursor-pointer group"
          onClick={() => setIsMiniExpanded(true)}
        >
          <MapCanvas />
          <div className="absolute inset-0 bg-background/0 group-hover:bg-background/20 transition-colors flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 backdrop-blur rounded-lg px-3 py-2 border border-border shadow-lg">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Maximize2 className="w-4 h-4" />
                Click to expand
              </div>
            </div>
          </div>
          <div className="absolute bottom-2 left-2 right-2 z-[600] bg-background/90 backdrop-blur rounded-md border border-border px-2 py-1.5 shadow-lg">
            <div className="text-[10px] text-center">
              <span className="font-medium">{filteredResults.length}</span>
              <span className="text-muted-foreground"> results</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
