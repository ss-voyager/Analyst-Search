import { useLocation, useRoute } from "wouter";
import { ArrowLeft, Calendar, Layers, Download, Share2, ExternalLink, Info, Globe, Cloud, Clock, Database, Tag, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemeToggle } from "@/components/theme-toggle";
import { LatLngBoundsExpression } from "leaflet";
import { MapContainer, TileLayer, Rectangle } from 'react-leaflet';

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
    tags: ["Optical", "Multispectral", "Land Monitoring", "Vegetation"]
  },
  {
    id: 2,
    title: "Landsat 9 OLI/TIRS C2 L2",
    date: "2024-03-12",
    cloudCover: "2%",
    platform: "Landsat 9",
    provider: "USGS",
    thumbnail: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=300&auto=format&fit=crop",
    bounds: [[33.9, -118.4], [34.0, -118.3]] as LatLngBoundsExpression,
    description: "Landsat 9 joins Landsat 8 to provide 8-day global revisit coverage. The Operational Land Imager 2 (OLI-2) captures observations of the Earth's surface in visible, near-infrared, and shortwave infrared bands.",
    processingLevel: "Collection 2 Level 2",
    resolution: "30m",
    bands: ["Coastal", "Blue", "Green", "Red", "NIR", "SWIR 1", "SWIR 2", "Pan", "Cirrus", "TIRS 1", "TIRS 2"],
    tags: ["Optical", "Thermal", "Land Use", "Change Detection"]
  },
  {
    id: 3,
    title: "Sentinel-1A SAR GRD",
    date: "2024-03-10",
    cloudCover: "N/A",
    platform: "Sentinel-1",
    provider: "ESA",
    thumbnail: "https://images.unsplash.com/photo-1541185933-710f50746b95?q=80&w=300&auto=format&fit=crop",
    bounds: [[34.1, -118.5], [34.2, -118.4]] as LatLngBoundsExpression,
    description: "Sentinel-1 performs C-band Synthetic Aperture Radar (SAR) imaging, enabling data acquisition regardless of weather or light conditions. Useful for maritime and land monitoring, emergency response, and climate change.",
    processingLevel: "Ground Range Detected (GRD)",
    resolution: "10m",
    bands: ["VV", "VH"],
    tags: ["SAR", "Radar", "All-weather", "Disaster Monitoring"]
  },
  {
    id: 4,
    title: "MODIS Terra Surface Reflectance",
    date: "2024-03-15",
    cloudCover: "5%",
    platform: "Terra",
    provider: "NASA",
    thumbnail: "https://images.unsplash.com/photo-1529788295308-1eace6f67388?q=80&w=300&auto=format&fit=crop",
    bounds: [[33.8, -118.2], [33.9, -118.1]] as LatLngBoundsExpression,
    description: "Moderate Resolution Imaging Spectroradiometer (MODIS) acquiring data in 36 spectral bands. Terra's orbit around the Earth is timed so that it passes from north to south across the equator in the morning.",
    processingLevel: "Level 2G",
    resolution: "250m, 500m, 1km",
    bands: ["1-36"],
    tags: ["Hyperspectral", "Atmosphere", "Ocean", "Land"]
  },
  {
    id: 5,
    title: "Landsat 8 OLI/TIRS C2 L1",
    date: "2024-03-08",
    cloudCover: "0%",
    platform: "Landsat 8",
    provider: "USGS",
    thumbnail: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=300&auto=format&fit=crop",
    bounds: [[34.2, -118.6], [34.3, -118.5]] as LatLngBoundsExpression,
    description: "Landsat 8 carries the Operational Land Imager (OLI) and the Thermal Infrared Sensor (TIRS). It provides continuity with the more than 40-year Landsat record.",
    processingLevel: "Collection 2 Level 1",
    resolution: "30m",
    bands: ["Coastal", "Blue", "Green", "Red", "NIR", "SWIR 1", "SWIR 2", "Pan", "Cirrus", "TIRS 1", "TIRS 2"],
    tags: ["Optical", "Thermal", "Land Cover", "Agriculture"]
  },
];

export default function ItemDetail() {
  const [, params] = useRoute("/item/:id");
  const [, setLocation] = useLocation();
  const id = params?.id ? parseInt(params.id) : null;
  
  const item = MOCK_RESULTS.find(r => r.id === id) || MOCK_RESULTS[0];

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
           <ThemeToggle />
           <div className="w-8 h-8 rounded-full bg-secondary border border-white/10" />
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Details */}
        <ScrollArea className="flex-1 border-r border-white/10 bg-background/50">
          <div className="p-6 max-w-3xl mx-auto space-y-8">
            
            {/* Hero Image / Preview */}
            <div className="rounded-xl overflow-hidden border border-white/10 bg-black/20 relative aspect-video group">
               <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
               <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
               
               <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                 <div>
                   <Badge variant="outline" className="bg-black/50 backdrop-blur border-white/20 text-white mb-2">
                     Preview
                   </Badge>
                 </div>
                 <div className="flex gap-2">
                    <Button size="sm" variant="secondary" className="gap-2">
                      <ExternalLink className="w-4 h-4" /> Open in Viewer
                    </Button>
                 </div>
               </div>
            </div>

            {/* Main Metadata Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="col-span-2 space-y-6">
                  <div>
                    <h2 className="text-lg font-display font-medium mb-3 flex items-center gap-2">
                      <Info className="w-4 h-4 text-primary" /> Description
                    </h2>
                    <p className="text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div>
                    <h2 className="text-lg font-display font-medium mb-3 flex items-center gap-2">
                      <Tag className="w-4 h-4 text-primary" /> Technical Specifications
                    </h2>
                    <div className="grid grid-cols-2 gap-4 bg-card/30 p-4 rounded-lg border border-white/5">
                       <div className="space-y-1">
                         <span className="text-xs text-muted-foreground uppercase tracking-wider">Platform</span>
                         <div className="font-medium">{item.platform}</div>
                       </div>
                       <div className="space-y-1">
                         <span className="text-xs text-muted-foreground uppercase tracking-wider">Provider</span>
                         <div className="font-medium">{item.provider}</div>
                       </div>
                       <div className="space-y-1">
                         <span className="text-xs text-muted-foreground uppercase tracking-wider">Processing Level</span>
                         <div className="font-medium">{item.processingLevel}</div>
                       </div>
                       <div className="space-y-1">
                         <span className="text-xs text-muted-foreground uppercase tracking-wider">Resolution</span>
                         <div className="font-medium">{item.resolution}</div>
                       </div>
                    </div>
                  </div>
                  
                  <div>
                    <h2 className="text-lg font-display font-medium mb-3 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-primary" /> Spectral Bands
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {item.bands.map(band => (
                        <Badge key={band} variant="secondary" className="font-mono text-xs">
                          {band}
                        </Badge>
                      ))}
                    </div>
                  </div>
               </div>

               {/* Sidebar Metadata */}
               <div className="space-y-6">
                  <div className="bg-card border border-white/10 rounded-xl p-4 space-y-4">
                     <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2 text-sm text-muted-foreground">
                         <Cloud className="w-4 h-4" /> Cloud Cover
                       </div>
                       <span className="font-mono font-medium">{item.cloudCover}</span>
                     </div>
                     <Separator className="bg-white/5" />
                     <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2 text-sm text-muted-foreground">
                         <Calendar className="w-4 h-4" /> Date
                       </div>
                       <span className="font-mono font-medium">{item.date}</span>
                     </div>
                     <Separator className="bg-white/5" />
                     <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2 text-sm text-muted-foreground">
                         <Database className="w-4 h-4" /> Size
                       </div>
                       <span className="font-mono font-medium">~850 MB</span>
                     </div>
                  </div>

                  <div className="space-y-2">
                    <Button className="w-full gap-2" size="lg">
                      <Download className="w-4 h-4" /> Download Asset
                    </Button>
                    <Button variant="outline" className="w-full gap-2">
                      <Share2 className="w-4 h-4" /> Share Item
                    </Button>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium mb-2 text-muted-foreground">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {item.tags.map(tag => (
                         <span key={tag} className="text-xs px-2 py-1 rounded-full bg-white/5 border border-white/10 text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                           #{tag}
                         </span>
                      ))}
                    </div>
                  </div>
               </div>
            </div>
          </div>
        </ScrollArea>

        {/* Right Panel - Context Map */}
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
                 <Rectangle 
                    bounds={item.bounds} 
                    pathOptions={{ 
                      color: '#00ffff', 
                      weight: 2, 
                      fillOpacity: 0.2,
                    }} 
                 />
            </MapContainer>
            <div className="absolute bottom-4 right-4 z-[400] bg-black/80 backdrop-blur px-3 py-1.5 rounded-lg border border-white/10 text-xs font-mono text-white/70">
              Footprint Preview
            </div>
        </div>
      </div>
    </div>
  );
}