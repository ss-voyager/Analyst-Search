import { 
  users, 
  satelliteItems,
  relatedItems,
  provenanceEvents,
  savedSearches,
  type User, 
  type InsertUser,
  type SatelliteItem,
  type InsertSatelliteItem,
  type RelatedItem,
  type InsertRelatedItem,
  type ProvenanceEvent,
  type InsertProvenanceEvent,
  type SavedSearch,
  type InsertSavedSearch
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, or, inArray, sql, desc, asc } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Satellite Items methods
  searchSatelliteItems(filters: {
    keyword?: string;
    location?: string;
    locationIds?: string[];
    keywords?: string[];
    properties?: string[];
    dateFrom?: Date;
    dateTo?: Date;
    platform?: string;
    sortBy?: string;
    limit?: number;
    offset?: number;
  }): Promise<SatelliteItem[]>;
  
  getSatelliteItem(id: number): Promise<SatelliteItem | undefined>;
  createSatelliteItem(item: InsertSatelliteItem): Promise<SatelliteItem>;
  
  // Related Items methods
  getRelatedItems(itemId: number): Promise<RelatedItem[]>;
  createRelatedItem(relatedItem: InsertRelatedItem): Promise<RelatedItem>;
  
  // Provenance methods
  getProvenanceEvents(itemId: number): Promise<ProvenanceEvent[]>;
  createProvenanceEvent(event: InsertProvenanceEvent): Promise<ProvenanceEvent>;
  
  // Saved Searches methods
  getSavedSearches(userId: string): Promise<SavedSearch[]>;
  getSavedSearch(id: number): Promise<SavedSearch | undefined>;
  createSavedSearch(search: InsertSavedSearch): Promise<SavedSearch>;
  deleteSavedSearch(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }
  
  // Satellite Items methods
  async searchSatelliteItems(filters: {
    keyword?: string;
    location?: string;
    locationIds?: string[];
    keywords?: string[];
    properties?: string[];
    dateFrom?: Date;
    dateTo?: Date;
    platform?: string;
    sortBy?: string;
    limit?: number;
    offset?: number;
  }): Promise<SatelliteItem[]> {
    let query = db.select().from(satelliteItems);
    
    const conditions = [];
    
    // Location filter
    if (filters.locationIds && filters.locationIds.length > 0) {
      conditions.push(inArray(satelliteItems.locationId, filters.locationIds));
    }
    
    // Keyword filter (search in title or keywords array)
    if (filters.keyword) {
      conditions.push(
        or(
          sql`${satelliteItems.title} ILIKE ${'%' + filters.keyword + '%'}`,
          sql`${filters.keyword} = ANY(${satelliteItems.keywords})`
        )
      );
    }
    
    // Keywords array filter (must have all)
    if (filters.keywords && filters.keywords.length > 0) {
      for (const kw of filters.keywords) {
        conditions.push(sql`${kw} = ANY(${satelliteItems.keywords})`);
      }
    }
    
    // Properties array filter (must have all)
    if (filters.properties && filters.properties.length > 0) {
      for (const prop of filters.properties) {
        conditions.push(sql`${prop} = ANY(${satelliteItems.properties})`);
      }
    }
    
    // Date range filter
    if (filters.dateFrom) {
      conditions.push(gte(satelliteItems.acquisitionDate, filters.dateFrom));
    }
    if (filters.dateTo) {
      conditions.push(lte(satelliteItems.acquisitionDate, filters.dateTo));
    }
    
    // Platform filter
    if (filters.platform) {
      conditions.push(eq(satelliteItems.platform, filters.platform));
    }
    
    // Apply all conditions
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    // Sorting
    if (filters.sortBy === 'date_desc') {
      query = query.orderBy(desc(satelliteItems.acquisitionDate)) as any;
    } else if (filters.sortBy === 'date_asc') {
      query = query.orderBy(asc(satelliteItems.acquisitionDate)) as any;
    } else if (filters.sortBy === 'name_asc') {
      query = query.orderBy(asc(satelliteItems.title)) as any;
    }
    
    // Pagination
    if (filters.limit) {
      query = query.limit(filters.limit) as any;
    }
    if (filters.offset) {
      query = query.offset(filters.offset) as any;
    }
    
    return await query;
  }
  
  async getSatelliteItem(id: number): Promise<SatelliteItem | undefined> {
    const [item] = await db.select().from(satelliteItems).where(eq(satelliteItems.id, id));
    return item || undefined;
  }
  
  async createSatelliteItem(item: InsertSatelliteItem): Promise<SatelliteItem> {
    const [newItem] = await db
      .insert(satelliteItems)
      .values(item)
      .returning();
    return newItem;
  }
  
  // Related Items methods
  async getRelatedItems(itemId: number): Promise<RelatedItem[]> {
    return await db.select().from(relatedItems).where(eq(relatedItems.itemId, itemId));
  }
  
  async createRelatedItem(relatedItem: InsertRelatedItem): Promise<RelatedItem> {
    const [item] = await db
      .insert(relatedItems)
      .values(relatedItem)
      .returning();
    return item;
  }
  
  // Provenance methods
  async getProvenanceEvents(itemId: number): Promise<ProvenanceEvent[]> {
    return await db.select().from(provenanceEvents)
      .where(eq(provenanceEvents.itemId, itemId))
      .orderBy(asc(provenanceEvents.sortOrder));
  }
  
  async createProvenanceEvent(event: InsertProvenanceEvent): Promise<ProvenanceEvent> {
    const [newEvent] = await db
      .insert(provenanceEvents)
      .values(event)
      .returning();
    return newEvent;
  }
  
  // Saved Searches methods
  async getSavedSearches(userId: string): Promise<SavedSearch[]> {
    return await db.select().from(savedSearches)
      .where(eq(savedSearches.userId, userId))
      .orderBy(desc(savedSearches.createdAt));
  }
  
  async getSavedSearch(id: number): Promise<SavedSearch | undefined> {
    const [search] = await db.select().from(savedSearches).where(eq(savedSearches.id, id));
    return search || undefined;
  }
  
  async createSavedSearch(search: InsertSavedSearch): Promise<SavedSearch> {
    const [newSearch] = await db
      .insert(savedSearches)
      .values(search)
      .returning();
    return newSearch;
  }
  
  async deleteSavedSearch(id: number): Promise<void> {
    await db.delete(savedSearches).where(eq(savedSearches.id, id));
  }
}

export const storage = new DatabaseStorage();
