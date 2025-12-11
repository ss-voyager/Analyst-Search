import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Calendar, Layers, Download, Share2, ExternalLink, Info, Globe, Cloud, Clock, Database, Tag, Check, Map as MapIcon, X, PanelRightOpen, PanelRightClose } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemeToggle } from "@/components/theme-toggle";
import { LatLngBoundsExpression } from "leaflet";
import { MapContainer, TileLayer, Rectangle, ImageOverlay } from 'react-leaflet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTheme } from "@/components/theme-provider";
import { toast } from "sonner";

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
    },
    relationships: [
      { type: "Derived From", title: "Sentinel-2B L1C Source", id: "S2B_MSIL1C_20240315" },
      { type: "Co-located", title: "Landsat 9 Scene (Same Date)", id: "LC09_L1TP_042036_20240315" },
      { type: "Next Pass", title: "Sentinel-2A (5 days later)", id: "S2A_MSIL2A_20240320" }
    ],
    provenance: [
        { date: "2024-03-15T10:23:00Z", system: "Sentinel-2B", event: "Data Capture" },
        { date: "2024-03-15T10:45:00Z", system: "Sentinel-Processor-A", event: "Processing L1C" },
        { date: "2024-03-15T11:15:00Z", system: "Sen2Cor-2.11", event: "Atmospheric Correction" },
        { date: "2024-03-15T11:20:00Z", system: "QA-Bot-9000", event: "Quality Check Passed" },
        { date: "2024-03-15T11:25:00Z", system: "Archive-System", event: "Archival" }
    ]
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
    if (!item.relationships) {
        item.relationships = [
            { type: "Related", title: `Similar ${item.platform} Item`, id: `${item.platform}_REL_001` }
        ] as any;
    }
    if (!item.provenance) {
        item.provenance = [
            { date: "2024-03-15T10:00:00Z", system: "System", event: "Ingestion" },
            { date: "2024-03-15T10:30:00Z", system: "Processor-v1", event: "Processing" }
        ] as any;
    }
    return item;
}

export default function ItemDetailPage() {
  const [, params] = useRoute("/item/:id");
  const [, setLocation] = useLocation();
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const [mapStyle, setMapStyle] = useState<'streets' | 'satellite'>('streets');
  const { theme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const id = params?.id ? parseInt(params.id) : null;
  
  const item = getItem(id);

  if (!item) return <div>Item not found</div>;

  const handleShare = () => {
      const url = new URL(window.location.href);
      url.searchParams.set("auth", "mock_token_123");
      navigator.clipboard.writeText(url.toString());
      toast.success("Link copied to clipboard", {
          description: "Deep link created for authorized users."
      });
  };

  const handleDownload = async () => {
      toast.info("Preparing download...", { duration: 1000 });
      
      try {
        // Simulate downloading the file (using thumbnail as proxy)
        const response = await fetch(item.thumbnail);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${item.title.replace(/\s+/g, '_')}.jpg`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast.success("Download started", {
            description: `${item.title}.tif (~850 MB)`
        });
      } catch (e) {
        // Fallback
        toast.success("Download started", {
            description: `${item.title}.tif (~850 MB)`
        });
      }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-background text-foreground overflow-hidden">
      {/* Header */}
      <header className="h-16 border-b border-border bg-background/80 backdrop-blur-md flex items-center px-4 gap-4 z-20 shrink-0 justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setLocation("/search")}
            className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex flex-col">
             <h1 className="font-display font-bold text-lg leading-none">{item.title}</h1>
             <span className="text-xs text-muted-foreground font-mono">{item.id} • {item.date}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
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
              className="absolute top-6 right-6 hidden xl:flex gap-2 text-xs z-10"
            >
              {showMap ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
              {showMap ? "Hide Map" : "Show Map"}
            </Button>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Hero Image / Preview */}
                <div className="col-span-1 md:col-span-1">
                    <div className="rounded-xl overflow-hidden border border-border bg-muted relative aspect-square group shadow-lg">
                    <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
                    </div>
                    
                    {/* Sidebar Actions - Download & Share */}
                    <div className="mt-4 space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                            <Button className="w-full gap-2" variant="default" onClick={handleDownload}>
                                <Download className="w-4 h-4" /> Download
                            </Button>
                            <Button variant="outline" className="w-full gap-2" onClick={handleShare}>
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
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="details">Details</TabsTrigger>
                            <TabsTrigger value="lineage">Lineage</TabsTrigger>
                            <TabsTrigger value="provenance">Provenance</TabsTrigger>
                        </TabsList>
                        <TabsContent value="details" className="mt-4">
                            <div className="rounded-md border border-border overflow-hidden">
                                <Table>
                                    <TableBody>
                                        <TableRow className="bg-muted/30">
                                            <TableCell className="font-medium text-muted-foreground w-1/3">Cloud Cover</TableCell>
                                            <TableCell>{item.cloudCover}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-medium text-muted-foreground">Acquisition Date</TableCell>
                                            <TableCell>{item.date}</TableCell>
                                        </TableRow>
                                        <TableRow className="bg-muted/30">
                                            <TableCell className="font-medium text-muted-foreground">Size</TableCell>
                                            <TableCell>~850 MB</TableCell>
                                        </TableRow>
                                        {Object.entries(item.metadata || {}).map(([key, value], i) => (
                                            <TableRow key={key} className={i % 2 === 1 ? "bg-muted/30" : "bg-transparent"}>
                                                <TableCell className="font-medium text-muted-foreground w-1/3">{key}</TableCell>
                                                <TableCell>{value as string}</TableCell>
                                            </TableRow>
                                        ))}
                                        <TableRow className="bg-muted/30">
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
                        <TabsContent value="lineage" className="mt-4">
                            <div className="rounded-md border border-border overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/30">
                                            <TableHead className="w-[200px]">Relationship Type</TableHead>
                                            <TableHead>Related Item</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {item.relationships?.map((rel: any, i: number) => (
                                            <TableRow key={i}>
                                                <TableCell className="font-medium text-muted-foreground">
                                                    <Badge variant="outline" className="font-normal">
                                                        {rel.type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div 
                                                      className="flex flex-col cursor-pointer hover:underline"
                                                      onClick={() => setLocation(`/item/1`)}
                                                    >
                                                        <span className="font-medium text-primary">{rel.title}</span>
                                                        <span className="text-xs text-muted-foreground font-mono">{rel.id}</span>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </TabsContent>
                        <TabsContent value="provenance" className="mt-4">
                            <div className="rounded-md border border-border overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/30">
                                            <TableHead>Date</TableHead>
                                            <TableHead>System / Agent</TableHead>
                                            <TableHead className="text-right">Event / Modification</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {item.provenance?.map((prov: any, i: number) => (
                                            <TableRow key={i}>
                                                <TableCell className="text-muted-foreground text-xs font-mono">
                                                    {new Date(prov.date).toLocaleString()}
                                                </TableCell>
                                                <TableCell className="font-medium">{prov.system}</TableCell>
                                                <TableCell className="text-right text-muted-foreground">
                                                    {prov.event}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
          </div>
        </ScrollArea>

        {/* Right Panel - Context Map */}
        {showMap && (
            <div className="w-[400px] hidden xl:block border-l border-border bg-muted/10 relative">
                <MapContainer 
                    center={item.bounds ? [
                    ((item.bounds as any)[0][0] + (item.bounds as any)[1][0]) / 2,
                    ((item.bounds as any)[0][1] + (item.bounds as any)[1][1]) / 2
                    ] : [34.05, -118.25]} 
                    zoom={10} 
                    style={{ height: '100%', width: '100%' }}
                    className="z-0 bg-muted/20"
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
                     center={item.bounds ? [
                       ((item.bounds as any)[0][0] + (item.bounds as any)[1][0]) / 2,
                       ((item.bounds as any)[0][1] + (item.bounds as any)[1][1]) / 2
                     ] : [34.05, -118.25]} 
                     zoom={10} 
                     style={{ height: '100%', width: '100%' }}
                     className="z-0 bg-muted/20"
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
    </div>
  );
}