import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSatelliteItemSchema, insertSavedSearchSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { voyagerConfig, getPublicConfig } from "./voyager-config";

/** Base URL for Voyager search API */
const VOYAGER_BASE_URL = voyagerConfig.baseUrl;

/**
 * Registers all API routes with the Express application
 * @param httpServer - The HTTP server instance
 * @param app - The Express application instance
 * @returns The HTTP server instance
 */
export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Replit Auth (skip if REPL_ID not set - local development)
  if (process.env.REPL_ID) {
    await setupAuth(app);
  } else {
    console.log("Skipping Replit auth setup (REPL_ID not set - local dev mode)");
  }

  /**
   * @openapi
   * /auth/user:
   *   get:
   *     summary: Get authenticated user information
   *     description: Returns the current authenticated user's profile information
   *     tags: [Authentication]
   *     security:
   *       - cookieAuth: []
   *     responses:
   *       200:
   *         description: User information retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/User'
   *       401:
   *         description: Not authenticated
   *       500:
   *         description: Server error
   */
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Config endpoint - serves public configuration to frontend
  app.get('/api/config', (req, res) => {
    try {
      const config = getPublicConfig();
      res.json(config);
    } catch (error) {
      console.error("Error fetching config:", error);
      res.status(500).json({ message: "Failed to fetch config" });
    }
  });

  /**
   * @openapi
   * /satellite-items:
   *   get:
   *     summary: Search satellite items
   *     description: Search for satellite imagery items with various filters including keywords, location, date range, and properties
   *     tags: [Satellite Items]
   *     parameters:
   *       - in: query
   *         name: keyword
   *         schema:
   *           type: string
   *         description: Text search keyword
   *       - in: query
   *         name: location
   *         schema:
   *           type: string
   *         description: Location name filter
   *       - in: query
   *         name: locationIds
   *         schema:
   *           type: array
   *           items:
   *             type: string
   *         description: Location hierarchy IDs
   *       - in: query
   *         name: keywords
   *         schema:
   *           type: array
   *           items:
   *             type: string
   *         description: Keyword category filters
   *       - in: query
   *         name: properties
   *         schema:
   *           type: array
   *           items:
   *             type: string
   *         description: Property filters (has_spatial, has_thumbnail, etc.)
   *       - in: query
   *         name: dateFrom
   *         schema:
   *           type: string
   *           format: date
   *         description: Start date for date range filter
   *       - in: query
   *         name: dateTo
   *         schema:
   *           type: string
   *           format: date
   *         description: End date for date range filter
   *       - in: query
   *         name: platform
   *         schema:
   *           type: string
   *         description: Satellite platform filter
   *       - in: query
   *         name: sortBy
   *         schema:
   *           type: string
   *           enum: [date, relevance, title]
   *         description: Sort order
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 48
   *         description: Maximum number of results
   *       - in: query
   *         name: offset
   *         schema:
   *           type: integer
   *           default: 0
   *         description: Pagination offset
   *     responses:
   *       200:
   *         description: List of satellite items
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/SatelliteItem'
   *       500:
   *         description: Server error
   */
  app.get("/api/satellite-items", async (req, res) => {
    try {
      const {
        keyword,
        location,
        locationIds,
        keywords,
        properties,
        dateFrom,
        dateTo,
        platform,
        sortBy,
        limit,
        offset
      } = req.query;

      const filters: any = {};

      if (keyword) filters.keyword = String(keyword);
      if (location) filters.location = String(location);
      if (locationIds) filters.locationIds = Array.isArray(locationIds) ? locationIds : [String(locationIds)];
      if (keywords) filters.keywords = Array.isArray(keywords) ? keywords : [String(keywords)];
      if (properties) filters.properties = Array.isArray(properties) ? properties : [String(properties)];
      if (dateFrom) filters.dateFrom = new Date(String(dateFrom));
      if (dateTo) filters.dateTo = new Date(String(dateTo));
      if (platform) filters.platform = String(platform);
      if (sortBy) filters.sortBy = String(sortBy);
      if (limit) filters.limit = parseInt(String(limit));
      if (offset) filters.offset = parseInt(String(offset));

      const items = await storage.searchSatelliteItems(filters);
      res.json(items);
    } catch (error) {
      console.error("Error searching satellite items:", error);
      res.status(500).json({ error: "Failed to search satellite items" });
    }
  });

  /**
   * @openapi
   * /satellite-items/{id}:
   *   get:
   *     summary: Get satellite item by ID
   *     description: Retrieve a single satellite item by its unique identifier
   *     tags: [Satellite Items]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Satellite item ID
   *     responses:
   *       200:
   *         description: Satellite item details
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/SatelliteItem'
   *       404:
   *         description: Item not found
   *       500:
   *         description: Server error
   */
  app.get("/api/satellite-items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const item = await storage.getSatelliteItem(id);

      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }

      res.json(item);
    } catch (error) {
      console.error("Error fetching satellite item:", error);
      res.status(500).json({ error: "Failed to fetch satellite item" });
    }
  });

  /**
   * @openapi
   * /satellite-items:
   *   post:
   *     summary: Create a new satellite item
   *     description: Create a new satellite imagery item (admin/testing purposes)
   *     tags: [Satellite Items]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/SatelliteItem'
   *     responses:
   *       201:
   *         description: Item created successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/SatelliteItem'
   *       400:
   *         description: Validation error
   *       500:
   *         description: Server error
   */
  app.post("/api/satellite-items", async (req, res) => {
    try {
      const validationResult = insertSatelliteItemSchema.safeParse(req.body);

      if (!validationResult.success) {
        const validationError = fromZodError(validationResult.error);
        return res.status(400).json({ error: validationError.message });
      }

      const item = await storage.createSatelliteItem(validationResult.data);
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating satellite item:", error);
      res.status(500).json({ error: "Failed to create satellite item" });
    }
  });

  /**
   * @openapi
   * /satellite-items/{id}/related:
   *   get:
   *     summary: Get related items for lineage
   *     description: Retrieve items related to the specified satellite item for data lineage tracking
   *     tags: [Satellite Items]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Satellite item ID
   *     responses:
   *       200:
   *         description: List of related items
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/RelatedItem'
   *       500:
   *         description: Server error
   */
  app.get("/api/satellite-items/:id/related", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const relatedItems = await storage.getRelatedItems(id);
      res.json(relatedItems);
    } catch (error) {
      console.error("Error fetching related items:", error);
      res.status(500).json({ error: "Failed to fetch related items" });
    }
  });

  /**
   * @openapi
   * /satellite-items/{id}/provenance:
   *   get:
   *     summary: Get provenance events
   *     description: Retrieve the provenance history (processing events) for a satellite item
   *     tags: [Satellite Items]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Satellite item ID
   *     responses:
   *       200:
   *         description: List of provenance events
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/ProvenanceEvent'
   *       500:
   *         description: Server error
   */
  app.get("/api/satellite-items/:id/provenance", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const events = await storage.getProvenanceEvents(id);
      res.json(events);
    } catch (error) {
      console.error("Error fetching provenance events:", error);
      res.status(500).json({ error: "Failed to fetch provenance events" });
    }
  });

  /**
   * @openapi
   * /saved-searches:
   *   get:
   *     summary: Get saved searches
   *     description: Retrieve all saved searches for a user from Voyager
   *     tags: [Saved Searches]
   *     parameters:
   *       - in: query
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *         description: User ID to fetch saved searches for
   *     responses:
   *       200:
   *         description: List of saved searches
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/SavedSearch'
   *       500:
   *         description: Server error
   */
  app.get("/api/saved-searches", async (req, res) => {
    try {
      const userId = req.query.userId as string | undefined;

      if (!userId) {
        return res.json([]);
      }

      // Forward cookies from browser to Voyager for authentication
      const cookie = req.headers.cookie;
      const searches = await storage.getSavedSearches(userId, cookie);
      res.json(searches);
    } catch (error) {
      console.error("Error fetching saved searches:", error);
      res.status(500).json({ error: "Failed to fetch saved searches" });
    }
  });

  /**
   * @openapi
   * /saved-searches:
   *   post:
   *     summary: Create a saved search
   *     description: Save a search configuration for later use
   *     tags: [Saved Searches]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - title
   *               - query
   *             properties:
   *               title:
   *                 type: string
   *                 description: Name for the saved search
   *               query:
   *                 type: string
   *                 description: Search query string
   *               path:
   *                 type: string
   *                 description: Search path
   *               filters:
   *                 type: object
   *                 description: Applied filter parameters
   *     responses:
   *       201:
   *         description: Saved search created
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/SavedSearch'
   *       400:
   *         description: Validation error
   *       500:
   *         description: Server error
   */
  app.post("/api/saved-searches", async (req, res) => {
    try {
      const validationResult = insertSavedSearchSchema.safeParse(req.body);

      if (!validationResult.success) {
        const validationError = fromZodError(validationResult.error);
        return res.status(400).json({ error: validationError.message });
      }

      // Forward cookies from browser to Voyager for authentication
      const cookie = req.headers.cookie;
      const search = await storage.createSavedSearch(validationResult.data, cookie);
      res.status(201).json(search);
    } catch (error: any) {
      console.error("Error creating saved search:", error);
      const errorMessage = error?.message || "Failed to create saved search";
      res.status(500).json({ error: errorMessage });
    }
  });

  /**
   * @openapi
   * /saved-searches/{id}:
   *   get:
   *     summary: Get saved search by ID
   *     description: Retrieve a single saved search by its ID
   *     tags: [Saved Searches]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Saved search ID
   *     responses:
   *       200:
   *         description: Saved search details
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/SavedSearch'
   *       404:
   *         description: Saved search not found
   *       500:
   *         description: Server error
   */
  app.get("/api/saved-searches/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const cookie = req.headers.cookie;
      const search = await storage.getSavedSearch(id, cookie);

      if (!search) {
        return res.status(404).json({ error: "Saved search not found" });
      }

      res.json(search);
    } catch (error) {
      console.error("Error fetching saved search:", error);
      res.status(500).json({ error: "Failed to fetch saved search" });
    }
  });

  /**
   * @openapi
   * /saved-searches/{id}:
   *   delete:
   *     summary: Delete a saved search
   *     description: Remove a saved search configuration
   *     tags: [Saved Searches]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Saved search ID
   *     responses:
   *       204:
   *         description: Saved search deleted successfully
   *       500:
   *         description: Server error
   */
  app.delete("/api/saved-searches/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const cookie = req.headers.cookie;
      await storage.deleteSavedSearch(id, cookie);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting saved search:", error);
      res.status(500).json({ error: "Failed to delete saved search" });
    }
  });

  /**
   * @openapi
   * /voyager/search:
   *   get:
   *     summary: Proxy Voyager search API (GET)
   *     description: Proxies search requests to the Voyager Solr backend. Supports all Solr query parameters.
   *     tags: [Voyager Proxy]
   *     parameters:
   *       - in: query
   *         name: q
   *         schema:
   *           type: string
   *         description: Solr query string
   *       - in: query
   *         name: fq
   *         schema:
   *           type: array
   *           items:
   *             type: string
   *         description: Filter queries (can be repeated)
   *       - in: query
   *         name: start
   *         schema:
   *           type: integer
   *         description: Pagination offset
   *       - in: query
   *         name: rows
   *         schema:
   *           type: integer
   *         description: Number of results to return
   *       - in: query
   *         name: sort
   *         schema:
   *           type: string
   *         description: Sort order (e.g., "modified desc")
   *     responses:
   *       200:
   *         description: Voyager search results
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 response:
   *                   type: object
   *                   properties:
   *                     numFound:
   *                       type: integer
   *                     start:
   *                       type: integer
   *                     docs:
   *                       type: array
   *                       items:
   *                         type: object
   *       500:
   *         description: Voyager API error
   */
  app.get("/api/voyager/search", async (req, res) => {
    try {
      // Handle array parameters correctly (e.g., multiple fq values)
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(req.query)) {
        if (Array.isArray(value)) {
          // Add each array item as a separate parameter
          value.forEach((v) => params.append(key, String(v)));
        } else if (value !== undefined) {
          params.append(key, String(value));
        }
      }
      const queryString = params.toString();
      const url = `${VOYAGER_BASE_URL}?${queryString}`;

      console.log("Voyager search URL:", url);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Voyager API error: ${response.status}`);
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Error proxying Voyager search:", error);
      res.status(500).json({ error: "Failed to fetch from Voyager API" });
    }
  });

  /**
   * @openapi
   * /voyager/search:
   *   post:
   *     summary: Proxy Voyager search API (POST)
   *     description: Proxies search requests to Voyager via POST for large query payloads
   *     tags: [Voyager Proxy]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               q:
   *                 type: string
   *                 description: Solr query string
   *               fq:
   *                 type: array
   *                 items:
   *                   type: string
   *                 description: Filter queries
   *               start:
   *                 type: integer
   *               rows:
   *                 type: integer
   *               sort:
   *                 type: string
   *     responses:
   *       200:
   *         description: Voyager search results
   *       500:
   *         description: Voyager API error
   */
  app.post("/api/voyager/search", async (req, res) => {
    try {
      // Handle array parameters correctly (e.g., multiple fq values)
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(req.body)) {
        if (Array.isArray(value)) {
          value.forEach((v) => params.append(key, String(v)));
        } else if (value !== undefined) {
          params.append(key, String(value));
        }
      }
      const queryString = params.toString();
      const url = `${VOYAGER_BASE_URL}?${queryString}`;

      console.log("Voyager search POST URL:", url);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Voyager API error: ${response.status}`);
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Error proxying Voyager search:", error);
      res.status(500).json({ error: "Failed to fetch from Voyager API" });
    }
  });

  /**
   * @openapi
   * /voyager/facets:
   *   get:
   *     summary: Proxy Voyager facets API (GET)
   *     description: Retrieves facet counts from Voyager for building filter options
   *     tags: [Voyager Proxy]
   *     parameters:
   *       - in: query
   *         name: q
   *         schema:
   *           type: string
   *         description: Solr query string
   *       - in: query
   *         name: facet
   *         schema:
   *           type: boolean
   *         description: Enable faceting
   *       - in: query
   *         name: facet.field
   *         schema:
   *           type: array
   *           items:
   *             type: string
   *         description: Fields to facet on
   *     responses:
   *       200:
   *         description: Facet results
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 facet_counts:
   *                   type: object
   *                   properties:
   *                     facet_fields:
   *                       type: object
   *       500:
   *         description: Voyager API error
   */
  app.get("/api/voyager/facets", async (req, res) => {
    try {
      // Handle array parameters correctly (e.g., multiple fq values)
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(req.query)) {
        if (Array.isArray(value)) {
          value.forEach((v) => params.append(key, String(v)));
        } else if (value !== undefined) {
          params.append(key, String(value));
        }
      }
      const queryString = params.toString();
      const url = `${VOYAGER_BASE_URL}?${queryString}`;

      console.log("Voyager facets URL:", url);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Voyager API error: ${response.status}`);
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Error proxying Voyager facets:", error);
      res.status(500).json({ error: "Failed to fetch facets from Voyager API" });
    }
  });

  /**
   * @openapi
   * /voyager/facets:
   *   post:
   *     summary: Proxy Voyager facets API (POST)
   *     description: Retrieves facet counts via POST for large query payloads
   *     tags: [Voyager Proxy]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               q:
   *                 type: string
   *               facet:
   *                 type: boolean
   *               facet.field:
   *                 type: array
   *                 items:
   *                   type: string
   *     responses:
   *       200:
   *         description: Facet results
   *       500:
   *         description: Voyager API error
   */
  app.post("/api/voyager/facets", async (req, res) => {
    try {
      // Handle array parameters correctly (e.g., multiple fq values)
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(req.body)) {
        if (Array.isArray(value)) {
          value.forEach((v) => params.append(key, String(v)));
        } else if (value !== undefined) {
          params.append(key, String(value));
        }
      }
      const queryString = params.toString();
      const url = `${VOYAGER_BASE_URL}?${queryString}`;

      console.log("Voyager facets POST URL:", url);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Voyager API error: ${response.status}`);
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Error proxying Voyager facets:", error);
      res.status(500).json({ error: "Failed to fetch facets from Voyager API" });
    }
  });

  return httpServer;
}
