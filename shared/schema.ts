import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, timestamp, jsonb, integer, real, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Satellite Imagery Items table
export const satelliteItems = pgTable("satellite_items", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  platform: text("platform").notNull(),
  provider: text("provider").notNull(),
  acquisitionDate: timestamp("acquisition_date").notNull(),
  cloudCover: text("cloud_cover"),
  processingLevel: text("processing_level"),
  resolution: text("resolution"),
  format: text("format"),
  thumbnail: text("thumbnail").notNull(),
  
  // Geospatial data (stored as JSON for simplicity, could use PostGIS in production)
  bounds: jsonb("bounds").notNull().$type<[[number, number], [number, number]]>(),
  
  // Location/Region association
  locationId: text("location_id"),
  
  // Metadata
  metadata: jsonb("metadata").$type<Record<string, string>>(),
  bands: text("bands").array(),
  properties: text("properties").array(),
  keywords: text("keywords").array(),
  
  // File info
  fileSizeMb: integer("file_size_mb").default(850),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  platformIdx: index("platform_idx").on(table.platform),
  dateIdx: index("date_idx").on(table.acquisitionDate),
  locationIdx: index("location_idx").on(table.locationId),
}));

export const insertSatelliteItemSchema = createInsertSchema(satelliteItems).omit({
  id: true,
  createdAt: true,
});

export type InsertSatelliteItem = z.infer<typeof insertSatelliteItemSchema>;
export type SatelliteItem = typeof satelliteItems.$inferSelect;

// Related Items (for lineage tracking)
export const relatedItems = pgTable("related_items", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").notNull().references(() => satelliteItems.id, { onDelete: "cascade" }),
  relatedItemId: text("related_item_id").notNull(), // Could be external ID or our ID
  relatedItemTitle: text("related_item_title").notNull(),
  relationshipType: text("relationship_type").notNull(), // "Derived From", "Co-located", "Next Pass"
});

export const insertRelatedItemSchema = createInsertSchema(relatedItems).omit({
  id: true,
});

export type InsertRelatedItem = z.infer<typeof insertRelatedItemSchema>;
export type RelatedItem = typeof relatedItems.$inferSelect;

// Provenance tracking
export const provenanceEvents = pgTable("provenance_events", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").notNull().references(() => satelliteItems.id, { onDelete: "cascade" }),
  eventDate: timestamp("event_date").notNull(),
  system: text("system").notNull(),
  event: text("event").notNull(),
  sortOrder: integer("sort_order").notNull(),
});

export const insertProvenanceEventSchema = createInsertSchema(provenanceEvents).omit({
  id: true,
});

export type InsertProvenanceEvent = z.infer<typeof insertProvenanceEventSchema>;
export type ProvenanceEvent = typeof provenanceEvents.$inferSelect;

// Saved Searches
export const savedSearches = pgTable("saved_searches", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  keyword: text("keyword"),
  location: text("location"),
  dateFrom: timestamp("date_from"),
  dateTo: timestamp("date_to"),
  locationIds: text("location_ids").array(),
  keywords: text("keywords").array(),
  properties: text("properties").array(),
  spatialFilter: jsonb("spatial_filter"),
  notifyOnNewResults: integer("notify_on_new_results").default(1), // 1 = true, 0 = false (using integer for simplicity)
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSavedSearchSchema = createInsertSchema(savedSearches).omit({
  id: true,
  createdAt: true,
});

export type InsertSavedSearch = z.infer<typeof insertSavedSearchSchema>;
export type SavedSearch = typeof savedSearches.$inferSelect;

// Relations
export const satelliteItemsRelations = relations(satelliteItems, ({ many }) => ({
  relatedItems: many(relatedItems),
  provenanceEvents: many(provenanceEvents),
}));

export const relatedItemsRelations = relations(relatedItems, ({ one }) => ({
  item: one(satelliteItems, {
    fields: [relatedItems.itemId],
    references: [satelliteItems.id],
  }),
}));

export const provenanceEventsRelations = relations(provenanceEvents, ({ one }) => ({
  item: one(satelliteItems, {
    fields: [provenanceEvents.itemId],
    references: [satelliteItems.id],
  }),
}));

export const savedSearchesRelations = relations(savedSearches, ({ one }) => ({
  user: one(users, {
    fields: [savedSearches.userId],
    references: [users.id],
  }),
}));
