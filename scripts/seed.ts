import { db } from "../server/db";
import { satelliteItems, relatedItems, provenanceEvents } from "../shared/schema";

const sampleSatelliteItems = [
  {
    title: "San Francisco Bay Area - Sentinel-2 L2A",
    platform: "Sentinel-2",
    provider: "ESA",
    acquisitionDate: new Date("2024-11-15T10:30:00Z"),
    cloudCover: "5%",
    processingLevel: "L2A",
    resolution: "10m",
    format: "GeoTIFF",
    thumbnail: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=400",
    bounds: [[37.7749, -122.4194], [37.8749, -122.3194]] as [[number, number], [number, number]],
    locationId: "san-francisco",
    metadata: { "scene_id": "S2A_MSIL2A_20241115T103021", "orbit": "143" },
    bands: ["B02", "B03", "B04", "B08", "B11", "B12"],
    properties: ["urban", "coastal", "vegetation"],
    keywords: ["bay area", "urban", "multispectral"],
    fileSizeMb: 850,
  },
  {
    title: "Amazon Rainforest - Landsat 9 OLI",
    platform: "Landsat-9",
    provider: "NASA/USGS",
    acquisitionDate: new Date("2024-11-10T14:20:00Z"),
    cloudCover: "12%",
    processingLevel: "L2SP",
    resolution: "30m",
    format: "GeoTIFF",
    thumbnail: "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=400",
    bounds: [[-3.4653, -62.2159], [-2.4653, -61.2159]] as [[number, number], [number, number]],
    locationId: "amazon-basin",
    metadata: { "scene_id": "LC09_L2SP_006062_20241110", "path": "006", "row": "062" },
    bands: ["B1", "B2", "B3", "B4", "B5", "B6", "B7"],
    properties: ["forest", "tropical", "biodiversity"],
    keywords: ["amazon", "deforestation", "carbon"],
    fileSizeMb: 1200,
  },
  {
    title: "Sahara Desert - MODIS Terra",
    platform: "MODIS",
    provider: "NASA",
    acquisitionDate: new Date("2024-11-12T11:45:00Z"),
    cloudCover: "0%",
    processingLevel: "L1B",
    resolution: "250m",
    format: "HDF",
    thumbnail: "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=400",
    bounds: [[23.4162, 25.6628], [25.4162, 27.6628]] as [[number, number], [number, number]],
    locationId: "sahara-desert",
    metadata: { "granule_id": "MOD02QKM.A2024317.1145", "collection": "6.1" },
    bands: ["Band1", "Band2", "Band3", "Band4"],
    properties: ["desert", "arid", "sand"],
    keywords: ["sahara", "dust", "temperature"],
    fileSizeMb: 450,
  },
  {
    title: "Tokyo Metropolitan Area - WorldView-3",
    platform: "WorldView-3",
    provider: "Maxar",
    acquisitionDate: new Date("2024-11-08T02:15:00Z"),
    cloudCover: "8%",
    processingLevel: "Ortho",
    resolution: "0.31m",
    format: "NITF",
    thumbnail: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400",
    bounds: [[35.6762, 139.6503], [35.7762, 139.7503]] as [[number, number], [number, number]],
    locationId: "tokyo",
    metadata: { "catalog_id": "WV03_20241108021500", "sun_elevation": "42.5" },
    bands: ["Pan", "MS1", "MS2", "MS3", "MS4", "SWIR1", "SWIR2"],
    properties: ["urban", "infrastructure", "high-resolution"],
    keywords: ["tokyo", "city", "mapping"],
    fileSizeMb: 2400,
  },
  {
    title: "Great Barrier Reef - Sentinel-2 L1C",
    platform: "Sentinel-2",
    provider: "ESA",
    acquisitionDate: new Date("2024-11-05T00:30:00Z"),
    cloudCover: "3%",
    processingLevel: "L1C",
    resolution: "10m",
    format: "JP2",
    thumbnail: "https://images.unsplash.com/photo-1582967788606-a171c1080cb0?w=400",
    bounds: [[-18.2871, 147.6992], [-17.2871, 148.6992]] as [[number, number], [number, number]],
    locationId: "great-barrier-reef",
    metadata: { "scene_id": "S2B_MSIL1C_20241105T003019", "tile": "55KFA" },
    bands: ["B02", "B03", "B04", "B08"],
    properties: ["marine", "coral", "coastal"],
    keywords: ["reef", "ocean", "conservation"],
    fileSizeMb: 780,
  },
  {
    title: "Swiss Alps - Sentinel-1 GRD",
    platform: "Sentinel-1",
    provider: "ESA",
    acquisitionDate: new Date("2024-11-14T05:45:00Z"),
    cloudCover: "N/A",
    processingLevel: "GRD",
    resolution: "10m",
    format: "GeoTIFF",
    thumbnail: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=400",
    bounds: [[46.5197, 7.9873], [47.5197, 8.9873]] as [[number, number], [number, number]],
    locationId: "swiss-alps",
    metadata: { "product_id": "S1A_IW_GRDH_20241114T054500", "polarization": "VV+VH" },
    bands: ["VV", "VH"],
    properties: ["sar", "mountain", "snow"],
    keywords: ["alps", "glacier", "radar"],
    fileSizeMb: 1100,
  },
  {
    title: "New York City - PlanetScope",
    platform: "PlanetScope",
    provider: "Planet Labs",
    acquisitionDate: new Date("2024-11-13T15:20:00Z"),
    cloudCover: "2%",
    processingLevel: "3B",
    resolution: "3m",
    format: "GeoTIFF",
    thumbnail: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400",
    bounds: [[40.7128, -74.0060], [40.8128, -73.9060]] as [[number, number], [number, number]],
    locationId: "new-york",
    metadata: { "item_id": "20241113_152000_103c", "satellite_id": "103c" },
    bands: ["Blue", "Green", "Red", "NIR"],
    properties: ["urban", "daily", "monitoring"],
    keywords: ["nyc", "infrastructure", "change-detection"],
    fileSizeMb: 320,
  },
  {
    title: "Greenland Ice Sheet - ICESat-2",
    platform: "ICESat-2",
    provider: "NASA",
    acquisitionDate: new Date("2024-11-01T08:00:00Z"),
    cloudCover: "N/A",
    processingLevel: "ATL06",
    resolution: "Point",
    format: "HDF5",
    thumbnail: "https://images.unsplash.com/photo-1517483000871-1dbf64a6e1c6?w=400",
    bounds: [[72.0000, -42.0000], [74.0000, -38.0000]] as [[number, number], [number, number]],
    locationId: "greenland",
    metadata: { "granule_id": "ATL06_20241101080000", "rgt": "1234" },
    bands: ["Elevation"],
    properties: ["lidar", "ice", "altimetry"],
    keywords: ["ice-sheet", "climate", "sea-level"],
    fileSizeMb: 680,
  },
  {
    title: "Mumbai Coastal Zone - Sentinel-2 L2A",
    platform: "Sentinel-2",
    provider: "ESA",
    acquisitionDate: new Date("2024-11-09T05:15:00Z"),
    cloudCover: "15%",
    processingLevel: "L2A",
    resolution: "10m",
    format: "GeoTIFF",
    thumbnail: "https://images.unsplash.com/photo-1566552881560-0be862a7c445?w=400",
    bounds: [[18.9220, 72.8347], [19.2220, 73.1347]] as [[number, number], [number, number]],
    locationId: "mumbai",
    metadata: { "scene_id": "S2A_MSIL2A_20241109T051501", "orbit": "076" },
    bands: ["B02", "B03", "B04", "B08", "B11"],
    properties: ["urban", "coastal", "monsoon"],
    keywords: ["mumbai", "urbanization", "flooding"],
    fileSizeMb: 920,
  },
  {
    title: "California Wildfires - VIIRS",
    platform: "VIIRS",
    provider: "NOAA",
    acquisitionDate: new Date("2024-10-28T20:30:00Z"),
    cloudCover: "25%",
    processingLevel: "SDR",
    resolution: "375m",
    format: "NetCDF",
    thumbnail: "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?w=400",
    bounds: [[34.0522, -118.2437], [35.0522, -117.2437]] as [[number, number], [number, number]],
    locationId: "southern-california",
    metadata: { "granule_id": "VNP02IMG.A2024302.2030", "day_night": "Day" },
    bands: ["I1", "I2", "I3", "I4", "I5"],
    properties: ["fire", "thermal", "smoke"],
    keywords: ["wildfire", "disaster", "monitoring"],
    fileSizeMb: 280,
  },
];

const sampleProvenanceEvents = [
  { eventDate: new Date("2024-11-15T10:30:00Z"), system: "Sentinel-2 Satellite", event: "Image Acquisition", sortOrder: 1 },
  { eventDate: new Date("2024-11-15T12:00:00Z"), system: "ESA Ground Station", event: "Data Downlink", sortOrder: 2 },
  { eventDate: new Date("2024-11-15T14:30:00Z"), system: "ESA Processing Center", event: "L1C Processing", sortOrder: 3 },
  { eventDate: new Date("2024-11-15T16:00:00Z"), system: "ESA Processing Center", event: "L2A Atmospheric Correction", sortOrder: 4 },
  { eventDate: new Date("2024-11-15T18:00:00Z"), system: "Copernicus Hub", event: "Product Publication", sortOrder: 5 },
];

async function seed() {
  console.log("Seeding database...");

  // Insert satellite items
  const insertedItems = await db.insert(satelliteItems).values(sampleSatelliteItems).returning();
  console.log(`Inserted ${insertedItems.length} satellite items`);

  // Add provenance events for the first item
  const firstItemId = insertedItems[0].id;
  const provenanceData = sampleProvenanceEvents.map(event => ({
    ...event,
    itemId: firstItemId,
  }));
  await db.insert(provenanceEvents).values(provenanceData);
  console.log(`Inserted ${provenanceData.length} provenance events for item ${firstItemId}`);

  // Add related items for the first few items
  const relatedItemsData = [
    { itemId: insertedItems[0].id, relatedItemId: String(insertedItems[6].id), relatedItemTitle: insertedItems[6].title, relationshipType: "Co-located" },
    { itemId: insertedItems[0].id, relatedItemId: "LANDSAT-8-PATH-044-ROW-034", relatedItemTitle: "Landsat 8 - Same Region", relationshipType: "Cross-sensor" },
    { itemId: insertedItems[1].id, relatedItemId: String(insertedItems[2].id), relatedItemTitle: insertedItems[2].title, relationshipType: "Next Pass" },
  ];
  await db.insert(relatedItems).values(relatedItemsData);
  console.log(`Inserted ${relatedItemsData.length} related items`);

  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
