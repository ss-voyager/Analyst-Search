import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { insertSavedSearchSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { voyagerConfig } from "./voyager-config";

/** Base URL for Voyager search API (from config/voyager.json) */
const VOYAGER_BASE_URL = `${voyagerConfig.baseUrl}/solr/v0/select`;

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

  /**
   * @openapi
   * /config:
   *   get:
   *     summary: Get application configuration
   *     description: Returns filter settings and app-wide configuration
   *     tags: [Configuration]
   *     responses:
   *       200:
   *         description: Application configuration
   */
  app.get("/api/config", (_req, res) => {
    res.json({
      filters: voyagerConfig.filters,
      pagination: voyagerConfig.pagination,
      defaultSort: voyagerConfig.defaultSort,
    });
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
      // Ensure JSON response format
      params.set("wt", "json");
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
      // Ensure JSON response format
      params.set("wt", "json");
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
      // Ensure JSON response format
      params.set("wt", "json");
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
      // Ensure JSON response format
      params.set("wt", "json");
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
