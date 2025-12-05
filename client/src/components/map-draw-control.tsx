import { useState, useEffect } from 'react';
import { Rectangle, useMapEvents, Marker, Popup } from 'react-leaflet';
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
  mode: 'none' | 'box' | 'point';
  onDrawBox: (bounds: LatLngBounds) => void;
  onDrawPoint: (point: LatLng) => void;
}

export function MapDrawControl({ mode, onDrawBox, onDrawPoint }: MapDrawControlProps) {
  const [startPoint, setStartPoint] = useState<LatLng | null>(null);
  const [currentBounds, setCurrentBounds] = useState<LatLngBounds | null>(null);

  useMapEvents({
    click(e) {
      if (mode === 'point') {
        onDrawPoint(e.latlng);
      }
    },
    mousedown(e) {
      if (mode === 'box') {
        setStartPoint(e.latlng);
        setCurrentBounds(new LatLngBounds(e.latlng, e.latlng));
        e.target.dragging.disable();
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
        e.target.dragging.enable();
      }
    }
  });

  if (currentBounds) {
    return <Rectangle bounds={currentBounds} pathOptions={{ color: '#3b82f6', weight: 2, fillOpacity: 0.2, dashArray: '5, 5' }} />;
  }

  return null;
}

interface SpatialFilterLayerProps {
  type: 'box' | 'point' | null;
  data: any; // LatLngBounds or LatLng
}

export function SpatialFilterLayer({ type, data }: SpatialFilterLayerProps) {
  if (!data) return null;

  if (type === 'box') {
    return (
      <Rectangle 
        bounds={data} 
        pathOptions={{ color: '#3b82f6', weight: 2, fillOpacity: 0.1 }} 
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

  return null;
}