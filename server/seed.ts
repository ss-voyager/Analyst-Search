import { db } from "./db";
import { satelliteItems, relatedItems, provenanceEvents } from "@shared/schema";

async function seed() {
  console.log("Seeding database with satellite imagery data...");

  // Sample satellite items representing various locations and platforms
  const items = await db.insert(satelliteItems).values([
    {
      title: "San Francisco Bay - Landsat 8 OLI/TIRS",
      platform: "Landsat 8",
      provider: "USGS",
      acquisitionDate: new Date("2024-03-15"),
      cloudCover: "5%",
      processingLevel: "Level-1TP",
      resolution: "30m",
      format: "GeoTIFF",
      thumbnail: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop",
      bounds: [[-122.5, 37.7], [-122.3, 37.9]],
      locationId: "san-francisco",
      metadata: {
        "Scene ID": "LC08_L1TP_044034_20240315",
        "Sun Elevation": "48.5",
        "Sun Azimuth": "142.3"
      },
      bands: ["Blue", "Green", "Red", "NIR", "SWIR1", "SWIR2", "Thermal"],
      properties: ["Multispectral", "High Resolution", "Georeferenced"],
      keywords: ["urban", "coastal", "bay area", "california"],
      fileSizeMb: 850
    },
    {
      title: "Amazon Rainforest - Sentinel-2 MSI",
      platform: "Sentinel-2A",
      provider: "ESA",
      acquisitionDate: new Date("2024-02-20"),
      cloudCover: "12%",
      processingLevel: "Level-2A",
      resolution: "10m",
      format: "JPEG2000",
      thumbnail: "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=400&h=300&fit=crop",
      bounds: [[-62.0, -3.5], [-61.5, -3.0]],
      locationId: "amazon",
      metadata: {
        "Tile ID": "20LLQ",
        "Processing Baseline": "05.09",
        "Cloud Coverage": "12.3"
      },
      bands: ["Blue", "Green", "Red", "Red Edge", "NIR", "SWIR"],
      properties: ["Multispectral", "High Resolution", "Atmospheric Correction"],
      keywords: ["forest", "tropical", "amazon", "brazil", "vegetation"],
      fileSizeMb: 1200
    },
    {
      title: "Mount Everest - WorldView-3",
      platform: "WorldView-3",
      provider: "Maxar",
      acquisitionDate: new Date("2024-04-01"),
      cloudCover: "0%",
      processingLevel: "Standard",
      resolution: "0.31m",
      format: "NITF",
      thumbnail: "https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?w=400&h=300&fit=crop",
      bounds: [[86.9, 27.9], [87.0, 28.0]],
      locationId: "himalayas",
      metadata: {
        "Catalog ID": "104001005C8D4F00",
        "Off Nadir Angle": "15.2",
        "Target Azimuth": "85.4"
      },
      bands: ["Pan", "Coastal", "Blue", "Green", "Yellow", "Red", "Red Edge", "NIR1", "NIR2"],
      properties: ["Panchromatic", "Very High Resolution", "Stereo Capable"],
      keywords: ["mountain", "himalaya", "nepal", "snow", "terrain"],
      fileSizeMb: 2500
    },
    {
      title: "Sahara Desert - MODIS Terra",
      platform: "Terra",
      provider: "NASA",
      acquisitionDate: new Date("2024-01-10"),
      cloudCover: "0%",
      processingLevel: "Level-1B",
      resolution: "250m",
      format: "HDF-EOS",
      thumbnail: "https://images.unsplash.com/photo-1509023464722-18d996393ca8?w=400&h=300&fit=crop",
      bounds: [[0.0, 20.0], [10.0, 30.0]],
      locationId: "sahara",
      metadata: {
        "Granule ID": "MOD021KM.A2024010.1200",
        "Day/Night Flag": "Day"
      },
      bands: ["Red", "NIR", "Blue", "Green", "SWIR"],
      properties: ["Multispectral", "Wide Coverage", "Daily Revisit"],
      keywords: ["desert", "sahara", "africa", "sand", "arid"],
      fileSizeMb: 450
    },
    {
      title: "Great Barrier Reef - Landsat 9 OLI-2",
      platform: "Landsat 9",
      provider: "USGS",
      acquisitionDate: new Date("2024-03-28"),
      cloudCover: "8%",
      processingLevel: "Level-2",
      resolution: "30m",
      format: "GeoTIFF",
      thumbnail: "https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=400&h=300&fit=crop",
      bounds: [[145.5, -18.5], [146.0, -18.0]],
      locationId: "great-barrier-reef",
      metadata: {
        "Scene ID": "LC09_L2SP_094071_20240328",
        "Sun Elevation": "52.1",
        "Water Vapor": "2.3"
      },
      bands: ["Coastal", "Blue", "Green", "Red", "NIR", "SWIR1", "SWIR2"],
      properties: ["Multispectral", "Water Analysis", "Surface Reflectance"],
      keywords: ["coral", "reef", "ocean", "australia", "marine"],
      fileSizeMb: 900
    },
    {
      title: "Arctic Ice Cap - Sentinel-1 SAR",
      platform: "Sentinel-1B",
      provider: "ESA",
      acquisitionDate: new Date("2024-02-05"),
      cloudCover: "N/A",
      processingLevel: "Level-1 GRD",
      resolution: "10m",
      format: "GeoTIFF",
      thumbnail: "https://images.unsplash.com/photo-1483664852095-d6cc6870702d?w=400&h=300&fit=crop",
      bounds: [[-45.0, 78.0], [-40.0, 80.0]],
      locationId: "arctic",
      metadata: {
        "Product ID": "S1B_IW_GRDH_1SDV_20240205",
        "Polarization": "VV+VH",
        "Pass Direction": "Descending"
      },
      bands: ["VV", "VH"],
      properties: ["SAR", "All-Weather", "Ice Monitoring"],
      keywords: ["arctic", "ice", "polar", "greenland", "glacier"],
      fileSizeMb: 1100
    },
    {
      title: "New York City - SPOT 7",
      platform: "SPOT 7",
      provider: "Airbus",
      acquisitionDate: new Date("2024-04-10"),
      cloudCover: "3%",
      processingLevel: "Primary",
      resolution: "1.5m",
      format: "DIMAP",
      thumbnail: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400&h=300&fit=crop",
      bounds: [[-74.1, 40.7], [-73.9, 40.9]],
      locationId: "new-york",
      metadata: {
        "Scene ID": "DS_SPOT7_202404101533",
        "Incidence Angle": "12.5"
      },
      bands: ["Blue", "Green", "Red", "NIR"],
      properties: ["Multispectral", "Very High Resolution", "Urban Mapping"],
      keywords: ["urban", "city", "manhattan", "new york", "buildings"],
      fileSizeMb: 1800
    },
    {
      title: "Tokyo Bay - ALOS-2 PALSAR-2",
      platform: "ALOS-2",
      provider: "JAXA",
      acquisitionDate: new Date("2024-03-05"),
      cloudCover: "N/A",
      processingLevel: "Level-1.1",
      resolution: "3m",
      format: "CEOS",
      thumbnail: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&h=300&fit=crop",
      bounds: [[139.7, 35.6], [140.0, 35.8]],
      locationId: "tokyo",
      metadata: {
        "Scene ID": "ALOS2287580710",
        "Observation Mode": "Stripmap",
        "Polarization": "HH+HV"
      },
      bands: ["HH", "HV"],
      properties: ["SAR", "L-band", "High Resolution"],
      keywords: ["urban", "city", "tokyo", "japan", "coastal"],
      fileSizeMb: 950
    }
  ]).returning();

  console.log(`Created ${items.length} satellite items`);

  // Add related items (lineage)
  if (items.length > 0) {
    await db.insert(relatedItems).values([
      {
        itemId: items[0].id,
        relatedItemId: "LC08_L1TP_044034_20240301",
        relatedItemTitle: "San Francisco Bay - Landsat 8 (Previous Pass)",
        relationshipType: "Previous Pass"
      },
      {
        itemId: items[1].id,
        relatedItemId: "S2A_MSIL2A_20240206",
        relatedItemTitle: "Amazon Rainforest - Sentinel-2 (Derived From)",
        relationshipType: "Derived From"
      },
      {
        itemId: items[4].id,
        relatedItemId: "S2B_MSIL1C_20240328",
        relatedItemTitle: "Great Barrier Reef - Sentinel-2 (Co-located)",
        relationshipType: "Co-located"
      }
    ]);
    console.log("Created related items");
  }

  // Add provenance events
  if (items.length > 0) {
    await db.insert(provenanceEvents).values([
      // San Francisco item provenance
      {
        itemId: items[0].id,
        eventDate: new Date("2024-03-15T10:30:00Z"),
        system: "Landsat 8 OLI/TIRS",
        event: "Raw data capture over San Francisco Bay area",
        sortOrder: 1
      },
      {
        itemId: items[0].id,
        eventDate: new Date("2024-03-15T14:00:00Z"),
        system: "USGS Processing System",
        event: "Radiometric calibration and geometric correction applied",
        sortOrder: 2
      },
      {
        itemId: items[0].id,
        eventDate: new Date("2024-03-15T16:30:00Z"),
        system: "USGS Archive",
        event: "Level-1TP product generated and archived",
        sortOrder: 3
      },
      // Amazon item provenance
      {
        itemId: items[1].id,
        eventDate: new Date("2024-02-20T11:15:00Z"),
        system: "Sentinel-2A MSI",
        event: "Acquisition over Amazon region",
        sortOrder: 1
      },
      {
        itemId: items[1].id,
        eventDate: new Date("2024-02-20T13:45:00Z"),
        system: "ESA Processing Facility",
        event: "Atmospheric correction using Sen2Cor processor",
        sortOrder: 2
      },
      {
        itemId: items[1].id,
        eventDate: new Date("2024-02-20T15:00:00Z"),
        system: "Copernicus Data Hub",
        event: "Level-2A product published to catalog",
        sortOrder: 3
      }
    ]);
    console.log("Created provenance events");
  }

  console.log("Database seeding completed successfully!");
}

seed()
  .catch((error) => {
    console.error("Error seeding database:", error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
