import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Rectangle, useMapEvents, Pane } from 'react-leaflet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LatLngBounds, LatLng } from 'leaflet';

interface LocationPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (bounds: string) => void;
}

function BoxDrawer({ onBoundsChange }: { onBoundsChange: (bounds: LatLngBounds | null) => void }) {
  const [startPoint, setStartPoint] = useState<LatLng | null>(null);
  const [currentPoint, setCurrentPoint] = useState<LatLng | null>(null);
  const [bounds, setBounds] = useState<LatLngBounds | null>(null);

  useMapEvents({
    mousedown(e) {
      // Only start drawing if we use left click and strictly on the map (not controls)
      // Leaflet handles this mostly, but good to be aware.
      setStartPoint(e.latlng);
      setCurrentPoint(e.latlng);
      setBounds(null);
      onBoundsChange(null);
      
      // Disable map dragging while drawing
      e.target.dragging.disable();
    },
    mousemove(e) {
      if (startPoint) {
        setCurrentPoint(e.latlng);
        const newBounds = new LatLngBounds(startPoint, e.latlng);
        setBounds(newBounds);
      }
    },
    mouseup(e) {
      if (startPoint) {
        const finalBounds = new LatLngBounds(startPoint, e.latlng);
        setBounds(finalBounds);
        onBoundsChange(finalBounds);
        setStartPoint(null);
        setCurrentPoint(null);
        
        // Re-enable map dragging
        e.target.dragging.enable();
      }
    }
  });

  // Render the rectangle while dragging or if we have a final selection
  // However, for this simple version, let's just show the dragging one.
  // The parent can hold the "final" one if we wanted to persist it visually, 
  // but here we just want to draw it.
  
  // Actually, we should show the rectangle if we have bounds (either dragging or finished)
  if (bounds) {
    return <Rectangle bounds={bounds} pathOptions={{ color: '#00ffff', weight: 2, fillOpacity: 0.2 }} />;
  }
  
  return null;
}

export function LocationPicker({ isOpen, onClose, onSelect }: LocationPickerProps) {
  const [selectedBounds, setSelectedBounds] = useState<LatLngBounds | null>(null);
  const [tempBounds, setTempBounds] = useState<LatLngBounds | null>(null);

  const handleConfirm = () => {
    // Use tempBounds if we just drew it, or selectedBounds if we had one (logic can be refined)
    // For now, tempBounds tracks the latest draw action.
    const boundsToUse = tempBounds || selectedBounds;

    if (boundsToUse) {
      // Format: west,south,east,north (no brackets, no spaces) for Voyager API compatibility
      const boxString = `${boundsToUse.getWest().toFixed(4)},${boundsToUse.getSouth().toFixed(4)},${boundsToUse.getEast().toFixed(4)},${boundsToUse.getNorth().toFixed(4)}`;
      onSelect(boxString);
      onClose();
    }
  };

  // Reset when opening
  useEffect(() => {
    if (isOpen) {
      setTempBounds(null);
      setSelectedBounds(null);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[800px] bg-background/95 backdrop-blur-xl border-white/10 text-foreground p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 border-b border-white/10">
          <DialogTitle>Select Area of Interest</DialogTitle>
          <DialogDescription>
            Click and drag on the map to define a bounding box.
          </DialogDescription>
        </DialogHeader>
        
        <div className="h-[500px] w-full relative bg-black/20">
           {/* MapContainer needs explicit height. */}
           {isOpen && (
             <MapContainer 
               center={[20, 0]} 
               zoom={2} 
               style={{ height: '100%', width: '100%' }}
               className="z-0"
             >
                {/* Dark Matter styled tiles for the "Voyager" theme */}
               <TileLayer
                 attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                 url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
               />
               <BoxDrawer onBoundsChange={setTempBounds} />
               {/* Show the selected bounds if we have one and aren't currently drawing new one (handled by BoxDrawer mostly) */}
               {/* Actually BoxDrawer handles the visual feedback nicely during draw. */}
             </MapContainer>
           )}
        </div>

        <DialogFooter className="p-4 border-t border-white/10 bg-black/20">
          <div className="flex justify-between w-full items-center">
            <div className="text-xs font-mono text-muted-foreground">
              {tempBounds ? 
                `BBOX: ${tempBounds.getWest().toFixed(2)}, ${tempBounds.getSouth().toFixed(2)}, ${tempBounds.getEast().toFixed(2)}, ${tempBounds.getNorth().toFixed(2)}` 
                : 'No area selected'}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="border-white/10 hover:bg-white/5">
                Cancel
              </Button>
              <Button 
                onClick={handleConfirm} 
                disabled={!tempBounds}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Confirm Area
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}