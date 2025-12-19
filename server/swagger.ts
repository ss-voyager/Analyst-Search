import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Analyst Search API",
      version: "1.0.0",
      description:
        "REST API for searching and analyzing satellite imagery and geospatial data. Integrates with Voyager search backend for advanced spatial queries.",
      contact: {
        name: "API Support",
      },
      license: {
        name: "MIT",
      },
    },
    servers: [
      {
        url: "/api",
        description: "API Server",
      },
    ],
    tags: [
      {
        name: "Authentication",
        description: "User authentication endpoints",
      },
      {
        name: "Satellite Items",
        description: "CRUD operations for satellite imagery items",
      },
      {
        name: "Saved Searches",
        description: "Manage saved search configurations",
      },
      {
        name: "Voyager Proxy",
        description: "Proxy endpoints for Voyager search API",
      },
    ],
    components: {
      schemas: {
        User: {
          type: "object",
          properties: {
            id: { type: "integer", description: "User ID" },
            username: { type: "string", description: "Username" },
            email: { type: "string", format: "email", description: "Email address" },
          },
        },
        SatelliteItem: {
          type: "object",
          properties: {
            id: { type: "string", description: "Unique item identifier" },
            title: { type: "string", description: "Item title" },
            description: { type: "string", description: "Item description" },
            format: { type: "string", description: "Data format (e.g., GeoTIFF, JPEG)" },
            formatType: { type: "string", description: "Format type category" },
            formatCategory: { type: "string", description: "Format category" },
            source: { type: "string", description: "Data source" },
            location: { type: "string", description: "Geographic location" },
            acquisitionDate: { type: "string", format: "date-time", description: "Date of acquisition" },
            cloudCover: { type: "number", description: "Cloud cover percentage" },
            resolution: { type: "number", description: "Spatial resolution in meters" },
            thumbnailUrl: { type: "string", format: "uri", description: "Thumbnail image URL" },
            downloadUrl: { type: "string", format: "uri", description: "Download URL" },
            bbox: {
              type: "array",
              items: { type: "number" },
              description: "Bounding box [west, south, east, north]",
            },
            geometry: {
              type: "object",
              description: "GeoJSON geometry object",
            },
            metadata: {
              type: "object",
              description: "Additional metadata",
            },
          },
        },
        SavedSearch: {
          type: "object",
          properties: {
            id: { type: "string", description: "Saved search ID" },
            title: { type: "string", description: "Search title" },
            query: { type: "string", description: "Search query string" },
            path: { type: "string", description: "Search path" },
            owner: { type: "string", description: "Owner username" },
            filters: {
              type: "object",
              description: "Applied filter parameters",
            },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        RelatedItem: {
          type: "object",
          properties: {
            id: { type: "integer" },
            sourceItemId: { type: "string" },
            relatedItemId: { type: "string" },
            relationshipType: { type: "string" },
            confidence: { type: "number" },
          },
        },
        ProvenanceEvent: {
          type: "object",
          properties: {
            id: { type: "integer" },
            itemId: { type: "string" },
            eventType: { type: "string" },
            timestamp: { type: "string", format: "date-time" },
            actor: { type: "string" },
            description: { type: "string" },
            metadata: { type: "object" },
          },
        },
        Error: {
          type: "object",
          properties: {
            message: { type: "string", description: "Error message" },
            error: { type: "string", description: "Error details" },
          },
        },
      },
      parameters: {
        itemId: {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "Satellite item ID",
        },
        searchId: {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "Saved search ID",
        },
      },
    },
  },
  apis: ["./server/routes.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
