import { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Rectangle, ImageOverlay, useMap } from 'react-leaflet';
import { LatLngBounds, LatLng } from 'leaflet';
import { Map as MapIcon, Globe, Square, MapPin, Pentagon, MousePointer } from "lucide-react";
import { MapDrawControl, SpatialFilterLayer } from "@/components/map-draw-control";
import { SearchResult, VoyagerSearchResult } from "../types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Generic result type that works with both local and Voyager results
type GenericResult = SearchResult | VoyagerSearchResult;

function hasValidBounds(result: GenericResult): boolean {
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

// Convert bounds from [lng, lat] to Leaflet's [lat, lng] format
function toLeafletBounds(bounds: [[number, number], [number, number]]): LatLngBounds {
  // bounds is [[lng1, lat1], [lng2, lat2]] - swap to [lat, lng]
  return new LatLngBounds(
    [bounds[0][1], bounds[0][0]],
    [bounds[1][1], bounds[1][0]]
  );
}

const MapEffect = ({ bounds }: { bounds: LatLngBounds | null }) => {
  const map = useMap();
  useEffect(() => {
    try {
      if (bounds && bounds.isValid()) {
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();
        if (isFinite(sw.lat) && isFinite(sw.lng) && isFinite(ne.lat) && isFinite(ne.lng)) {
          // Use fitBounds without animation to avoid NaN errors during animation
          map.fitBounds(bounds, { padding: [50, 50], animate: false });
        }
      }
    } catch (e) {
      console.error("Error in MapEffect fitBounds", e);
    }
  }, [bounds, map]);
  return null;
};

const PreviewEffect = ({ result }: { result: GenericResult | undefined }) => {
  const map = useMap();
  useEffect(() => {
    if (result && hasValidBounds(result)) {
      try {
        const bounds = toLeafletBounds(result.bounds as [[number, number], [number, number]]);
        if (bounds.isValid()) {
          const sw = bounds.getSouthWest();
          const ne = bounds.getNorthEast();
          if (isFinite(sw.lat) && isFinite(sw.lng) && isFinite(ne.lat) && isFinite(ne.lng)) {
            map.fitBounds(bounds, { padding: [20, 20], animate: false });
          }
        }
      } catch (e) {
        console.error("Error fitting to preview bounds", e);
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
  filteredResults: GenericResult[];
  hoveredResultId: number | string | null;
  previewedResultId: number | string | null;
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

  const validResults = useMemo(() => 
    filteredResults.filter(hasValidBounds), 
    [filteredResults]
  );

  useEffect(() => {
    if (validResults.length > 0) {
      try {
        const firstResult = validResults[0];
        const bounds = toLeafletBounds(firstResult.bounds as [[number, number], [number, number]]);
        validResults.slice(1, 5).forEach(res => {
            const resBounds = toLeafletBounds(res.bounds as [[number, number], [number, number]]);
            bounds.extend(resBounds);
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
    // Format: west,south,east,north (no brackets, no spaces) for Voyager API compatibility
    setPlace(`${bounds.getWest().toFixed(4)},${bounds.getSouth().toFixed(4)},${bounds.getEast().toFixed(4)},${bounds.getNorth().toFixed(4)}`);
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

  return (
    <div className="w-[400px] hidden xl:block border-l border-border shrink-0 transition-all duration-300 relative">
      <div className="absolute inset-0">
        <MapContainer 
          center={[20, 0]} 
          zoom={2} 
          minZoom={2}
          maxBounds={[[-90, -180], [90, 180]]}
          maxBoundsViscosity={1.0}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
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
              bounds={toLeafletBounds(result.bounds as [[number, number], [number, number]])} 
              pathOptions={{ 
                color: hoveredResultId === result.id ? '#00ffff' : '#3b82f6', 
                weight: hoveredResultId === result.id ? 2 : 1, 
                fillOpacity: hoveredResultId === result.id ? 0.2 : 0.05,
                fillColor: hoveredResultId === result.id ? '#00ffff' : '#3b82f6'
              }} 
            />
          ))}
          {hoveredResult && hasValidBounds(hoveredResult) && (
            <ImageOverlay url={hoveredResult.thumbnail} bounds={toLeafletBounds(hoveredResult.bounds as [[number, number], [number, number]])} opacity={0.9} zIndex={100} />
          )}
          {previewedResult && previewedResult.id !== hoveredResultId && hasValidBounds(previewedResult) && (
            <ImageOverlay url={previewedResult.thumbnail} bounds={toLeafletBounds(previewedResult.bounds as [[number, number], [number, number]])} opacity={0.9} zIndex={90} />
          )}
          {spatialFilter && <SpatialFilterLayer type={spatialFilter.type} data={spatialFilter.data} />}
        </MapContainer>

        {/* Map Controls Overlay */}
        <div className="absolute top-3 right-3 z-[600] flex flex-col gap-2 pointer-events-none">
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

      </div>
    </div>
  );
}
