import { LatLngBoundsExpression } from 'leaflet';
import { SearchResult, TreeNode } from './types';
import stockImage from '@assets/stock_images/satellite_radar_imag_5d3e79b8.jpg';
import desertImage from '@assets/stock_images/satellite_view_of_de_09a0f404.jpg';
import oceanImage from '@assets/stock_images/satellite_view_of_oc_86576cd8.jpg';
import forestImage from '@assets/stock_images/satellite_view_of_de_03f9764a.jpg';
import agriImage from '@assets/stock_images/satellite_view_of_ag_ebac3a20.jpg';
import snowImage from '@assets/stock_images/satellite_view_of_sn_8f021214.jpg';
import cityImage from '@assets/stock_images/satellite_view_of_ci_093e163a.jpg';
import sarImage from '@assets/stock_images/satellite_radar_sar__0ff421fd.jpg';

// Mock Data Generators
export const PLATFORMS = [
  { name: "Sentinel-2", provider: "ESA", type: "Optical" },
  { name: "Landsat 8", provider: "USGS", type: "Optical" },
  { name: "Landsat 9", provider: "USGS", type: "Optical" },
  { name: "WorldView-3", provider: "Maxar", type: "Optical" },
  { name: "PlanetScope", provider: "Planet", type: "Optical" },
  { name: "BlackSky Global", provider: "BlackSky", type: "Optical" },
  { name: "Capella-2", provider: "Capella Space", type: "SAR" },
  { name: "ICEYE-X", provider: "ICEYE", type: "SAR" },
  { name: "SPOT 7", provider: "Airbus", type: "Optical" },
  { name: "Pleiades Neo", provider: "Airbus", type: "Optical" }
];

export const THUMBNAILS = [
  stockImage,
  desertImage,
  oceanImage,
  forestImage,
  agriImage,
  snowImage,
  cityImage,
  sarImage,
  "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=300&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=300&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1529788295308-1eace6f67388?q=80&w=300&auto=format&fit=crop"
];

export const TITLES: Record<string, string[]> = {
  "Sentinel-2": ["MSI Level-1C", "MSI Level-2A"],
  "Landsat 8": ["OLI/TIRS C2 L1", "OLI/TIRS C2 L2"],
  "Landsat 9": ["OLI/TIRS C2 L1", "OLI/TIRS C2 L2"],
  "WorldView-3": ["SWIR", "Pan-Sharpened", "Multispectral"],
  "PlanetScope": ["3m Imagery", "Ortho Scene"],
  "BlackSky Global": ["Spectra AI", "Standard Imagery"],
  "Capella-2": ["SAR SLC", "SAR GEO"],
  "ICEYE-X": ["SAR X-band", "SAR SLC"],
  "SPOT 7": ["1.5m Imagery", "Panchromatic"],
  "Pleiades Neo": ["30cm Imagery", "Panchromatic"]
};

export const HIERARCHY_TREE: TreeNode[] = [
  {
    id: "na",
    label: "North America",
    children: [
      { 
        id: "usa", 
        label: "United States",
        children: [
          { id: "ca", label: "California" },
          { id: "ny", label: "New York" },
          { id: "tx", label: "Texas" },
          { id: "fl", label: "Florida" }
        ]
      },
      { id: "can", label: "Canada" },
      { id: "mex", label: "Mexico" }
    ]
  },
  {
    id: "eu",
    label: "Europe",
    children: [
      { 
        id: "uk", 
        label: "United Kingdom",
        children: [
          { id: "eng", label: "England" },
          { id: "sct", label: "Scotland" },
          { id: "wls", label: "Wales" }
        ]
      },
      { id: "fr", label: "France" },
      { id: "de", label: "Germany" },
      { id: "it", label: "Italy" },
      { id: "es", label: "Spain" }
    ]
  },
  {
    id: "as",
    label: "Asia",
    children: [
      { id: "jp", label: "Japan" },
      { id: "cn", label: "China" },
      { id: "in", label: "India" },
      { id: "sg", label: "Singapore" }
    ]
  },
  {
    id: "sa",
    label: "South America",
    children: [
      { id: "br", label: "Brazil" },
      { id: "ar", label: "Argentina" },
      { id: "cl", label: "Chile" }
    ]
  },
  {
    id: "af",
    label: "Africa",
    children: [
      { id: "eg", label: "Egypt" },
      { id: "za", label: "South Africa" },
      { id: "ng", label: "Nigeria" },
      { id: "ke", label: "Kenya" }
    ]
  }
];

export const KEYWORDS = [
  "Vegetation", "Water", "Urban", "Agriculture", "Disaster", 
  "Snow/Ice", "Clouds", "Desert", "Forest", "Ocean",
  "Infrastructure", "Mining", "Oil & Gas", "Renewable Energy"
];

export const LEAF_IDS = [
  "ca", "ny", "tx", "fl", "can", "mex",
  "eng", "sct", "wls", "fr", "de", "it", "es",
  "jp", "cn", "in", "sg",
  "br", "ar", "cl",
  "eg", "za", "ng", "ke"
];

export const generateMockResults = (count: number): SearchResult[] => {
  return Array.from({ length: count }, (_, i) => {
    const platform = PLATFORMS[i % PLATFORMS.length];
    const titles = TITLES[platform.name] || ["Imagery"];
    const title = `${platform.name} ${titles[i % titles.length]}`;
    
    // Random date within last 30 days
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 30));
    const dateStr = date.toISOString().split('T')[0];
    
    // Random cloud cover (0-100% or N/A for SAR)
    const isSAR = platform.type === "SAR";
    const cloudCover = isSAR ? "N/A" : `${Math.floor(Math.random() * 30)}%`;
    
    // Random bounds near Los Angeles for demo
    const lat = 34.0522 + (Math.random() - 0.5) * 1.0;
    const lng = -118.2437 + (Math.random() - 0.5) * 1.0;
    
    // Random location ID assignment
    const locationId = LEAF_IDS[Math.floor(Math.random() * LEAF_IDS.length)];

    // Random properties
    const possibleProps = ["has_thumbnail", "has_spatial", "has_temporal", "is_downloadable"];
    const properties = possibleProps.filter(() => Math.random() > 0.5);
    
    // Random keywords
    const itemKeywords = KEYWORDS.filter(() => Math.random() > 0.95);
    
    // Random format
    const FORMATS = ["GeoTIFF", "NITF", "GIMI", "LiDAR", "JPEG2000"];
    const format = FORMATS[Math.floor(Math.random() * FORMATS.length)];

    return {
      id: i + 1,
      title,
      date: dateStr,
      cloudCover,
      platform: platform.name,
      provider: platform.provider,
      thumbnail: THUMBNAILS[i % THUMBNAILS.length],
      bounds: [[lat, lng], [lat + 0.05, lng + 0.05]] as LatLngBoundsExpression,
      locationId,
      properties,
      keywords: itemKeywords,
      format
    };
  });
};

export const MOCK_RESULTS = generateMockResults(100);
