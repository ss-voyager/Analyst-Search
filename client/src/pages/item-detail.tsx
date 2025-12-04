import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Calendar, Layers, Download, Share2, ExternalLink, Info, Globe, Cloud, Clock, Database, Tag, Check, Map as MapIcon, X, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemeToggle } from "@/components/theme-toggle";
import { LatLngBoundsExpression } from "leaflet";
import { MapContainer, TileLayer, Rectangle, ImageOverlay } from 'react-leaflet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Reusing Mock Data logic (in a real app this would come from an API or store)
const MOCK_RESULTS = [
  {
    id: 1,
    title: "Sentinel-2B MSI Level-2A",
    date: "2024-03-15",
    cloudCover: "12%",
    platform: "Sentinel-2",
    provider: "ESA",
    thumbnail: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=300&auto=format&fit=crop",
    bounds: [[34.0, -118.3], [34.1, -118.2]] as LatLngBoundsExpression,
    description: "Sentinel-2B is an Earth observation satellite from the Copernicus Programme that systematically acquires optical imagery at high spatial resolution (10 m to 60 m) over land and coastal waters. The mission is a constellation with two twin satellites, Sentinel-2A and Sentinel-2B.",
    processingLevel: "Level-2A",
    resolution: "10m",
    bands: ["B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8", "B8A", "B9", "B11", "B12"],
    tags: ["Optical", "Multispectral", "Land Monitoring", "Vegetation"],
    metadata: {
        "Last Indexed": "2025-10-07T15:04:56.684Z",
        "Format Category": "GIS",
        "Format": "GeoTIFF",
        "Spatial Reference": "WGS 84 / UTM zone 11N",
        "Field Name": "bands",
        "Agent": "h1999a1216a1",
        "Driver": "GTiff/GeoTIFF",
        "Field Count": "12",
        "Field Type": "Integer",
        "Format Acronym": "GTiff",
        "Format Keyword": "Raster",
        "Format Type": "File",
        "Agent Extract": "h1999a1216a1"
    }
  },
  // ... (other items would need similar metadata structure, applying generic for now)
];

// Helper to get item with metadata fallback
const getItem = (id: number | null) => {
    const item = MOCK_RESULTS.find(r => r.id === id) || MOCK_RESULTS[0];
    if (!item.metadata) {
        item.metadata = {
            "Last Indexed": "2025-10-07T15:04:56.684Z",
            "Format Category": "GIS",
            "Format": "GeoTIFF",
            "Spatial Reference": "WGS 84",
            "Driver": "GTiff",
            "Resolution": item.resolution,
            "Platform": item.platform,
            "Provider": item.provider
        } as any;
    }
    return item;
}

export default function ItemDetail() {
  const [, params] = useRoute("/item/:id");
  const [, setLocation] = useLocation();
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const id = params?.id ? parseInt(params.id) : null;
  
  const item = getItem(id);

  if (!item) return <div>Item not found</div>;

  return (
    <div className="flex flex-col h-screen w-full bg-background text-foreground overflow-hidden">
      {/* Header */}
      <header className="h-16 border-b border-white/10 bg-black/40 backdrop-blur-md flex items-center px-4 gap-4 z-20 shrink-0 justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setLocation("/search")}
            className="p-2 rounded-full hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex flex-col">
             <h1 className="font-display font-bold text-lg leading-none">{item.title}</h1>
             <span className="text-xs text-muted-foreground font-mono">{item.id} • {item.date}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
           <Button 
             variant="ghost" 
             size="sm" 
             onClick={() => setShowMap(!showMap)}
             className="hidden md:flex gap-2 text-xs"
           >
             {showMap ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
             {showMap ? "Hide Map" : "Show Map"}
           </Button>
           <ThemeToggle />
           <div className="w-8 h-8 rounded-full bg-secondary border border-white/10" />
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Details */}
        <ScrollArea className="flex-1 border-r border-white/10 bg-background/50">
          <div className="p-6 max-w-5xl mx-auto space-y-8">
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Hero Image / Preview */}
                <div className="col-span-1 md:col-span-1">
                    <div className="rounded-xl overflow-hidden border border-white/10 bg-black/20 relative aspect-square group shadow-lg">
                    <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                    
                    <div className="absolute bottom-4 left-4 right-4 flex flex-col gap-2">
                        <Badge variant="outline" className="w-fit bg-black/50 backdrop-blur border-white/20 text-white">
                            Preview
                        </Badge>
                        <Button size="sm" variant="secondary" className="w-full gap-2">
                            <ExternalLink className="w-4 h-4" /> Open in Viewer
                        </Button>
                    </div>
                    </div>
                    
                    {/* Sidebar Actions - moved under image for better layout */}
                    <div className="mt-6 space-y-3">
                        <div className="bg-card border border-white/10 rounded-xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Cloud Cover</span>
                                <span className="font-mono font-medium">{item.cloudCover}</span>
                            </div>
                            <Separator className="bg-white/5" />
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Date</span>
                                <span className="font-mono font-medium">{item.date}</span>
                            </div>
                            <Separator className="bg-white/5" />
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Size</span>
                                <span className="font-mono font-medium">~850 MB</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <Button className="w-full gap-2" variant="default">
                                <Download className="w-4 h-4" /> Download
                            </Button>
                            <Button variant="outline" className="w-full gap-2">
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
                        <p className="text-muted-foreground leading-relaxed text-lg">
                            {item.description}
                        </p>
                    </div>

                    <Tabs defaultValue="details" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="details">Details</TabsTrigger>
                            <TabsTrigger value="relationships">Relationships</TabsTrigger>
                        </TabsList>
                        <TabsContent value="details" className="mt-4">
                            <div className="rounded-md border border-white/10 overflow-hidden">
                                <Table>
                                    <TableBody>
                                        {Object.entries(item.metadata || {}).map(([key, value], i) => (
                                            <TableRow key={key} className={i % 2 === 0 ? "bg-white/5" : "bg-transparent"}>
                                                <TableCell className="font-medium text-muted-foreground w-1/3">{key}</TableCell>
                                                <TableCell>{value as string}</TableCell>
                                            </TableRow>
                                        ))}
                                        {/* Add extra rows for bands/specs if not in metadata */}
                                        <TableRow className="bg-white/5">
                                            <TableCell className="font-medium text-muted-foreground">Spectral Bands</TableCell>
                                            <TableCell>{item.bands.join(", ")}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-medium text-muted-foreground">Resolution</TableCell>
                                            <TableCell>{item.resolution}</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                        </TabsContent>
                        <TabsContent value="relationships" className="mt-4">
                            <div className="p-8 text-center text-muted-foreground border border-dashed border-white/10 rounded-lg">
                                No relationships defined for this item.
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
          </div>
        </ScrollArea>

        {/* Right Panel - Context Map */}
        {showMap && (
            <div className="w-[400px] hidden xl:block border-l border-white/10 bg-black/20 relative">
                <MapContainer 
                    center={item.bounds ? [
                    ((item.bounds as any)[0][0] + (item.bounds as any)[1][0]) / 2,
                    ((item.bounds as any)[0][1] + (item.bounds as any)[1][1]) / 2
                    ] : [34.05, -118.25]} 
                    zoom={10} 
                    style={{ height: '100%', width: '100%' }}
                    className="z-0 bg-[#1a1a1a]"
                >
                    <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    />
                    <ImageOverlay
                        url={item.thumbnail}
                        bounds={item.bounds}
                        opacity={0.8}
                    />
                    <Rectangle 
                        bounds={item.bounds} 
                        pathOptions={{ 
                        color: '#00ffff', 
                        weight: 2, 
                        fillOpacity: 0,
                        }} 
                    />
                </MapContainer>
                <div className="absolute bottom-4 right-4 z-[400] bg-black/80 backdrop-blur px-3 py-1.5 rounded-lg border border-white/10 text-xs font-mono text-white/70">
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
             <div className="h-16 border-b border-white/10 flex items-center justify-between px-4 bg-background/50">
               <div className="flex items-center gap-2">
                  <MapIcon className="w-5 h-5 text-primary" />
                  <h2 className="font-display font-bold text-lg">Extent Preview</h2>
               </div>
               <Button variant="ghost" size="icon" onClick={() => setIsMapOpen(false)} className="rounded-full hover:bg-white/10">
                 <X className="w-5 h-5" />
               </Button>
             </div>
             <div className="flex-1 relative bg-black/20">
                <MapContainer 
                     center={item.bounds ? [
                       ((item.bounds as any)[0][0] + (item.bounds as any)[1][0]) / 2,
                       ((item.bounds as any)[0][1] + (item.bounds as any)[1][1]) / 2
                     ] : [34.05, -118.25]} 
                     zoom={10} 
                     style={{ height: '100%', width: '100%' }}
                     className="z-0 bg-[#1a1a1a]"
                   >
                     <TileLayer
                       attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                       url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                     />
                     <ImageOverlay
                        url={item.thumbnail}
                        bounds={item.bounds}
                        opacity={0.8}
                     />
                     <Rectangle 
                        bounds={item.bounds} 
                        pathOptions={{ 
                          color: '#00ffff', 
                          weight: 2, 
                          fillOpacity: 0,
                        }} 
                     />
                </MapContainer>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}