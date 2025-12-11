import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSatelliteItemSchema, insertSavedSearchSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { setupAuth, isAuthenticated } from "./replitAuth";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Replit Auth
  await setupAuth(app);

  // Auth routes
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

  // Search satellite items
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

  // Get single satellite item
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

  // Create satellite item (for admin/testing)
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

  // Get related items for lineage
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

  // Get provenance events
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

  // Get saved searches (would need authentication in production)
  app.get("/api/saved-searches", async (req, res) => {
    try {
      // In a real app, get userId from session/auth
      const userId = req.query.userId as string;
      
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      const searches = await storage.getSavedSearches(userId);
      res.json(searches);
    } catch (error) {
      console.error("Error fetching saved searches:", error);
      res.status(500).json({ error: "Failed to fetch saved searches" });
    }
  });

  // Create saved search
  app.post("/api/saved-searches", async (req, res) => {
    try {
      const validationResult = insertSavedSearchSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const validationError = fromZodError(validationResult.error);
        return res.status(400).json({ error: validationError.message });
      }

      const search = await storage.createSavedSearch(validationResult.data);
      res.status(201).json(search);
    } catch (error) {
      console.error("Error creating saved search:", error);
      res.status(500).json({ error: "Failed to create saved search" });
    }
  });

  // Delete saved search
  app.delete("/api/saved-searches/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteSavedSearch(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting saved search:", error);
      res.status(500).json({ error: "Failed to delete saved search" });
    }
  });

  return httpServer;
}
