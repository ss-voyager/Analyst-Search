import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Rectangle, ImageOverlay, useMap } from 'react-leaflet';
import { LatLngBounds, LatLng } from 'leaflet';
import { Button } from "@/components/ui/button";
import { Map as MapIcon, Globe, PanelRightClose, PanelRightOpen } from "lucide-react";
import { MapDrawControl } from "@/components/map-draw-control";
import { SearchResult } from "../types";

// Helper components for map effects
const MapEffect = ({ bounds }: { bounds: LatLngBounds | null }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.flyToBounds(bounds, { padding: [50, 50], duration: 1 });
    }
  }, [bounds, map]);
  return null;
};

const PreviewEffect = ({ result }: { result: any }) => {
  const map = useMap();
  useEffect(() => {
    if (result && result.bounds) {
      map.flyToBounds(result.bounds, { padding: [20, 20], duration: 1.5 });
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
  setPlace
}: SearchMapProps) {
  const [mapBounds, setMapBounds] = useState<LatLngBounds | null>(null);

  // Update map bounds when filtered results change
  useEffect(() => {
    if (filteredResults.length > 0) {
      // Calculate bounds of all results
      try {
        const bounds = new LatLngBounds(
            (filteredResults[0].bounds as any)[0],
            (filteredResults[0].bounds as any)[1]
        );
        
        // Take first 5 results to avoid calculating too much
        filteredResults.slice(1, 5).forEach(res => {
            bounds.extend((res.bounds as any)[0]);
            bounds.extend((res.bounds as any)[1]);
        });
        
        setMapBounds(bounds);
      } catch (e) {
        console.error("Error calculating bounds", e);
      }
    }
  }, [filteredResults.length]); // Only re-calculate when count changes

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
    <div className="w-[400px] hidden xl:block border-l border-border bg-muted/10 relative shrink-0 transition-all duration-300">
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

         {/* Render Footprints for visible results */}
         {filteredResults.map(result => (
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
       </MapContainer>

       {/* Map Controls Overlay */}
       <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2">
         <div className="bg-background/80 backdrop-blur rounded-lg border border-border p-1 flex flex-col gap-1 shadow-lg">
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

       {/* Hide Button (Absolute) */}
       <Button 
         variant="secondary" 
         size="sm" 
         className="absolute bottom-4 right-4 z-[400] shadow-lg bg-background/90 backdrop-blur"
         onClick={() => setShowMap(false)}
       >
         <PanelRightClose className="w-4 h-4 mr-2" /> Hide Map
       </Button>
    </div>
  );
}
