import { useState, useEffect } from 'react';
import { Rectangle, useMapEvents, Marker, Popup, Polygon, Polyline } from 'react-leaflet';
import { LatLngBounds, LatLng, Icon } from 'leaflet';

// Fix Leaflet's default icon path issues in React
import markerIconPng from "leaflet/dist/images/marker-icon.png";
import markerIcon2xPng from "leaflet/dist/images/marker-icon-2x.png";
import markerShadowPng from "leaflet/dist/images/marker-shadow.png";

const defaultIcon = new Icon({
  iconUrl: markerIconPng,
  iconRetinaUrl: markerIcon2xPng,
  shadowUrl: markerShadowPng,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});


interface MapDrawControlProps {
  mode: 'none' | 'box' | 'point' | 'polygon';
  onDrawBox: (bounds: LatLngBounds) => void;
  onDrawPoint: (point: LatLng) => void;
  onDrawPolygon?: (points: LatLng[]) => void;
}

export function MapDrawControl({ mode, onDrawBox, onDrawPoint, onDrawPolygon }: MapDrawControlProps) {
  const [startPoint, setStartPoint] = useState<LatLng | null>(null);
  const [currentBounds, setCurrentBounds] = useState<LatLngBounds | null>(null);
  const [polyPoints, setPolyPoints] = useState<LatLng[]>([]);

  // Reset poly points if mode changes
  useEffect(() => {
      setPolyPoints([]);
  }, [mode]);

  const map = useMapEvents({
    click(e) {
      if (mode === 'point') {
        onDrawPoint(e.latlng);
      } else if (mode === 'polygon') {
        setPolyPoints(prev => [...prev, e.latlng]);
      }
    },
    dblclick(e) {
       if (mode === 'polygon') {
           if (polyPoints.length > 2 && onDrawPolygon) {
               onDrawPolygon(polyPoints); // Use current points + last double click point if needed, but usually dblclick adds one more point via click event first?
               // Actually dblclick fires after 2 clicks. Leaflet behavior is tricky.
               // Let's rely on the points collected so far.
               setPolyPoints([]);
           }
       }
    },
    mousedown(e) {
      if (mode === 'box') {
        setStartPoint(e.latlng);
        setCurrentBounds(new LatLngBounds(e.latlng, e.latlng));
        map.dragging.disable();
      }
    },
    mousemove(e) {
      if (mode === 'box' && startPoint) {
        const newBounds = new LatLngBounds(startPoint, e.latlng);
        setCurrentBounds(newBounds);
      }
    },
    mouseup(e) {
      if (mode === 'box' && startPoint) {
        const finalBounds = new LatLngBounds(startPoint, e.latlng);
        onDrawBox(finalBounds);
        setStartPoint(null);
        setCurrentBounds(null);
        map.dragging.enable();
      }
    }
  });

  if (currentBounds) {
    return <Rectangle bounds={currentBounds} pathOptions={{ color: '#3b82f6', weight: 2, fillOpacity: 0.2, dashArray: '5, 5' }} />;
  }

  if (polyPoints.length > 0) {
      return (
          <>
            <Polyline positions={polyPoints} pathOptions={{ color: '#3b82f6', weight: 2, dashArray: '5, 5' }} />
            {polyPoints.map((p, i) => <Marker key={i} position={p} icon={defaultIcon} />)}
          </>
      );
  }

  return null;
}

interface SpatialFilterLayerProps {
  type: 'box' | 'point' | 'polygon' | null;
  data: any; // LatLngBounds or LatLng or LatLng[]
}

export function SpatialFilterLayer({ type, data }: SpatialFilterLayerProps) {
  if (!data) return null;

  if (type === 'box') {
    return (
      <Rectangle 
        bounds={data} 
        pathOptions={{ color: '#3b82f6', weight: 4, fillOpacity: 0.15 }} 
      />
    );
  }

  if (type === 'point') {
    return (
      <Marker position={data} icon={defaultIcon}>
        <Popup>Selected Point</Popup>
      </Marker>
    );
  }

  if (type === 'polygon') {
      return <Polygon positions={data} pathOptions={{ color: '#3b82f6', weight: 4, fillOpacity: 0.15 }} />
  }

  return null;
}