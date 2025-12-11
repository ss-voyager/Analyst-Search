import { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Rectangle, ImageOverlay, useMap, ZoomControl } from 'react-leaflet';
import { LatLngBounds, LatLng } from 'leaflet';
import { Button } from "@/components/ui/button";
import { Map as MapIcon, Globe, Square, MapPin, Pentagon, MousePointer } from "lucide-react";
import { MapDrawControl, SpatialFilterLayer } from "@/components/map-draw-control";
import { SearchResult } from "../types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Helper to check if bounds are valid for Leaflet
function hasValidBounds(result: SearchResult): boolean {
  try {
    const bounds = result.bounds as [[number, number], [number, number]];
    if (!Array.isArray(bounds) || bounds.length !== 2) return false;
    const [sw, ne] = bounds;
    if (!Array.isArray(sw) || !Array.isArray(ne)) return false;
    if (sw.length !== 2 || ne.length !== 2) return false;
    // Check all values are finite numbers and not both corners at origin (default fallback)
    const allFinite = [sw[0], sw[1], ne[0], ne[1]].every(v => typeof v === 'number' && isFinite(v));
    const isDefaultBounds = sw[0] === 0 && sw[1] === 0 && ne[0] === 0 && ne[1] === 0;
    return allFinite && !isDefaultBounds;
  } catch {
    return false;
  }
}

// Helper components for map effects
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
  spatialFilter
}: SearchMapProps) {
  const [mapBounds, setMapBounds] = useState<LatLngBounds | null>(null);

  // Filter results to only those with valid bounds for map rendering
  const validResults = useMemo(() => 
    filteredResults.filter(hasValidBounds), 
    [filteredResults]
  );

  // Update map bounds when filtered results change
  useEffect(() => {
    if (validResults.length > 0) {
      try {
        const firstResult = validResults[0];
        const bounds = new LatLngBounds(
            (firstResult.bounds as any)[0],
            (firstResult.bounds as any)[1]
        );
        
        // Take first 5 results to avoid calculating too much
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
  }, [validResults.length]); // Only re-calculate when count changes

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

  return (
    <div className="w-[400px] hidden xl:block border-l border-border bg-muted/10 relative shrink-0 transition-all duration-300 flex flex-col">
       <div className="flex items-center px-4 py-3 border-b border-border/50 bg-background/95 backdrop-blur-xl shrink-0">
         <h2 className="text-sm font-display font-bold text-foreground tracking-wide">Map</h2>
       </div>
       <div className="flex-1 relative">
       <MapContainer 
         center={[34.0522, -118.2437]} 
         zoom={6} 
         style={{ height: '100%', width: '100%' }}
         className="z-0 bg-muted/20"
         zoomControl={false}
       >
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
         
         <MapEffect bounds={mapBounds} />
         <PreviewEffect result={previewedResult} />
         <MapDrawControl 
            mode={drawMode} 
            onDrawBox={handleDrawBox}
            onDrawPoint={handleDrawPoint}
            onDrawPolygon={handleDrawPolygon}
         />

         {/* Render Footprints for visible results with valid bounds */}
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

         {/* Hover Overlay */}
         {hoveredResult && (
            <ImageOverlay
              url={hoveredResult.thumbnail}
              bounds={hoveredResult.bounds}
              opacity={0.9}
              zIndex={100}
            />
         )}

         {/* Preview Overlay (Sticky) */}
         {previewedResult && previewedResult.id !== hoveredResultId && (
            <ImageOverlay
              url={previewedResult.thumbnail}
              bounds={previewedResult.bounds}
              opacity={0.9}
              zIndex={90}
            />
         )}

         {/* Spatial Filter Layer */}
         {spatialFilter && (
            <SpatialFilterLayer type={spatialFilter.type} data={spatialFilter.data} />
         )}
       </MapContainer>

       {/* Map Controls Overlay */}
       <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2">
         {/* Map Style Controls */}
         <div className="bg-background/80 backdrop-blur rounded-lg border border-border p-1 flex flex-col gap-1 shadow-lg">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    className={`p-2 hover:bg-muted rounded transition-colors ${mapStyle === 'streets' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`} 
                    onClick={() => setMapStyle('streets')}
                  >
                    <MapIcon className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left">Street Map</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    className={`p-2 hover:bg-muted rounded transition-colors ${mapStyle === 'satellite' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
                    onClick={() => setMapStyle('satellite')}
                  >
                    <Globe className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left">Satellite View</TooltipContent>
              </Tooltip>
            </TooltipProvider>
         </div>

         {/* Drawing Tools */}
         <div className="bg-background/80 backdrop-blur rounded-lg border border-border p-1 flex flex-col gap-1 shadow-lg">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    className={`p-2 hover:bg-muted rounded transition-colors ${drawMode === 'none' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
                    onClick={() => setDrawMode('none')}
                  >
                    <MousePointer className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left">Select Mode</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    className={`p-2 hover:bg-muted rounded transition-colors ${drawMode === 'box' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
                    onClick={() => setDrawMode('box')}
                  >
                    <Square className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left">Draw Rectangle</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    className={`p-2 hover:bg-muted rounded transition-colors ${drawMode === 'point' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
                    onClick={() => setDrawMode('point')}
                  >
                    <MapPin className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left">Drop Pin</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    className={`p-2 hover:bg-muted rounded transition-colors ${drawMode === 'polygon' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
                    onClick={() => setDrawMode('polygon')}
                  >
                    <Pentagon className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left">Draw Polygon</TooltipContent>
              </Tooltip>
            </TooltipProvider>
         </div>
       </div>
       </div>
    </div>
  );
}
