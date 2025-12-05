# Product Requirements Document (PRD): Voyager Geospatial Search

## 1. Executive Summary
**Voyager** is a next-generation geospatial search interface designed to simplify the discovery, analysis, and acquisition of satellite imagery and Earth observation data. It bridges the gap between complex query languages and intuitive user experiences, offering "intelligent" search capabilities that distinguish between semantic keywords and geospatial locations automatically.

## 2. Problem Statement
Current geospatial catalogs often require users to manually draw bounding boxes or use complex query parameters to find relevant data. Users struggle to:
- Distinguish between searching for a "place" (e.g., "Paris") vs. a "thing" (e.g., "Vegetation").
- Understand the history and processing lineage of a satellite image.
- Quickly preview footprint coverage without downloading heavy files.
- Share specific search contexts with colleagues securely.

## 3. Target Audience
- **GIS Analysts:** Need precise filtering and visual verification of coverage.
- **Remote Sensing Scientists:** Care about data provenance, processing levels, and spectral bands.
- **Data Engineers:** Need to download or integrate data into pipelines efficiently.

## 4. Key Features & Requirements

### 4.1. Intelligent Search
- **Unified Search Bar:** A single input field that parses natural language.
- **Intent Detection:** Automatically classifies input terms as `KEYWORD` (e.g., "Fire", "Vegetation") or `LOCATION` (e.g., "California", "Amazon Rainforest").
- **Visual Feedback:** distinct UI badges/labels in the search bar showing how terms were interpreted.
- **Search History:** Quick access to recent queries via a dropdown.

### 4.2. Spatial Discovery & Filtering
- **Map-Based Search:** Interactive map tightly coupled with list results.
- **Drawing Tools:**
  - **Bounding Box:** Drag to select a rectangular Area of Interest (AOI).
  - **Point:** Click to select a specific coordinate.
  - **Polygon:** Draw custom shapes for irregular areas.
- **Location Hierarchy:** Faceted browsing by continent, country, and region (mocked hierarchy).

### 4.3. Results Visualization
- **List View:** Cards displaying thumbnail, cloud cover, resolution, platform (e.g., Sentinel-2, Landsat 9), and date.
- **Map Overlays:** Hovering over a result projects its footprint and thumbnail overlay onto the map for context.
- **Fly-to Animation:** Clicking a result or filter automatically zooms the map to the relevant bounds.

### 4.4. Item Details & Lineage
- **Metadata View:** Comprehensive table of spectral bands, processing levels, and acquisition details.
- **Lineage Tab:** Displays relationships to other items:
  - *Derived From:* Source Level-1C data.
  - *Co-located:* Other satellites capturing the same area at similar times.
  - *Next Pass:* Future acquisition predictions.
- **Provenance Tab:** Timeline view of the data's lifecycle (Ingestion -> Processing -> Archival) with timestamps and system agents.
- **Context Map:** Mini-map showing the item's specific footprint with a toggle for Satellite/Street basemaps.

### 4.5. Collaboration & Acquisition
- **Saved Searches:** Users can save complex query configurations (AOI + Keywords + Date) and toggle "Notifications" for new matches.
- **Deep Linking (Share):** Generates a URL with an auth token parameter to share specific items or search contexts with authorized users.
- **Download Simulation:** "Download" action initiates a file transfer simulation with toast notifications.

## 5. User Flows
1. **Discovery:** User types "Vegetation in California". System identifies "Vegetation" (Keyword) and "California" (Location) and zooms map.
2. **Refinement:** User selects "Last 30 Days" and draws a smaller box over Northern California.
3. **Selection:** User clicks a result. Map flies to bounds. Thumbnail projects on map.
4. **Analysis:** User views "Lineage" to ensure data is derived from a trusted source.
5. **Action:** User saves the search as "NorCal Veg Monitor" or downloads the GeoTIFF.

## 6. Technical Architecture (Prototype)
- **Framework:** React (Vite)
- **Styling:** Tailwind CSS + Shadcn UI
- **Mapping Engine:** Leaflet (react-leaflet)
- **Routing:** Wouter
- **State Management:** React Context / Local State (No Redux)
- **Data Source:** In-memory mock data generators with realistic geospatial bounds.

## 7. Future Roadmap (Post-Mockup)
- **Backend Integration:** Connect to STAC (SpatioTemporal Asset Catalog) API.
- **Auth Integration:** Real user authentication and RBAC for "Authorized Link" sharing.
- **Tile Server:** Replace static thumbnails with dynamic COG (Cloud Optimized GeoTIFF) tiling.
- **Analysis Tools:** Client-side spectral analysis (NDVI calculator) on the item detail page.
