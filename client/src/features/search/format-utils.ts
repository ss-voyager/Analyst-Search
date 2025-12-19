/**
 * Format Display Names
 *
 * Maps raw format MIME types to human-readable display names.
 * Add new mappings as needed.
 */

const FORMAT_DISPLAY_NAMES: Record<string, string> = {
  // ArcGIS formats
  "application/x-arcgis-online-service": "ArcGIS Online Service",
  "application/x-arcgis-map-service": "ArcGIS Map Service",
  "application/x-arcgis-feature-service": "ArcGIS Feature Service",
  "application/x-arcgis-image-service": "ArcGIS Image Service",
  "application/x-arcgis-layer-package": "ArcGIS Layer Package",
  "application/x-arcgis-map-package": "ArcGIS Map Package",
  "application/x-esri-shapefile": "Shapefile",
  "application/x-esri-gdb": "File Geodatabase",

  // Common GIS formats
  "application/vnd.google-earth.kml+xml": "KML",
  "application/vnd.google-earth.kmz": "KMZ",
  "application/geo+json": "GeoJSON",
  "application/geopackage+sqlite3": "GeoPackage",
  "application/x-geotiff": "GeoTIFF",

  // Web services
  "application/vnd.ogc.wms_xml": "WMS Service",
  "application/vnd.ogc.wfs_xml": "WFS Service",
  "application/vnd.ogc.wcs_xml": "WCS Service",
  "application/vnd.ogc.wmts_xml": "WMTS Service",

  // Document formats
  "application/pdf": "PDF Document",
  "application/msword": "Word Document",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word Document",
  "application/vnd.ms-excel": "Excel Spreadsheet",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel Spreadsheet",

  // Image formats
  "image/jpeg": "JPEG Image",
  "image/png": "PNG Image",
  "image/tiff": "TIFF Image",
  "image/gif": "GIF Image",

  // Data formats
  "text/csv": "CSV File",
  "application/json": "JSON",
  "application/xml": "XML",
  "text/xml": "XML",

  // Archive formats
  "application/zip": "ZIP Archive",
  "application/x-tar": "TAR Archive",
  "application/gzip": "GZIP Archive",
};

/**
 * Get a human-readable display name for a format
 * Falls back to cleaning up the raw format string if no mapping exists
 */
export function getFormatDisplayName(format: string | undefined | null): string {
  if (!format) return "Unknown";

  // Check for exact match in our mapping
  const displayName = FORMAT_DISPLAY_NAMES[format.toLowerCase()];
  if (displayName) return displayName;

  // Check for case-insensitive match
  const lowerFormat = format.toLowerCase();
  for (const [key, value] of Object.entries(FORMAT_DISPLAY_NAMES)) {
    if (key.toLowerCase() === lowerFormat) {
      return value;
    }
  }

  // Fallback: Try to make the format string more readable
  // Remove common prefixes and clean up
  let cleaned = format
    .replace(/^application\//, "")
    .replace(/^image\//, "")
    .replace(/^text\//, "")
    .replace(/^x-/, "")
    .replace(/\+xml$/, "")
    .replace(/\+json$/, "")
    .replace(/-/g, " ")
    .replace(/_/g, " ");

  // Capitalize first letter of each word
  cleaned = cleaned
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return cleaned || "Unknown";
}

/**
 * Get format category for grouping/filtering
 */
export function getFormatCategory(format: string | undefined | null): string {
  if (!format) return "Other";

  const lowerFormat = format.toLowerCase();

  if (lowerFormat.includes("arcgis") || lowerFormat.includes("esri")) return "ArcGIS";
  if (lowerFormat.includes("ogc") || lowerFormat.includes("wms") || lowerFormat.includes("wfs")) return "OGC Services";
  if (lowerFormat.includes("geo") || lowerFormat.includes("shapefile") || lowerFormat.includes("kml")) return "GIS Data";
  if (lowerFormat.includes("image") || lowerFormat.includes("tiff") || lowerFormat.includes("jpeg") || lowerFormat.includes("png")) return "Images";
  if (lowerFormat.includes("pdf") || lowerFormat.includes("word") || lowerFormat.includes("document")) return "Documents";
  if (lowerFormat.includes("csv") || lowerFormat.includes("excel") || lowerFormat.includes("spreadsheet")) return "Tabular Data";

  return "Other";
}
