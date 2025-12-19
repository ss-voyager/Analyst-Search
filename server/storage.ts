/**
 * @fileoverview Storage layer for database and Voyager API operations
 * @module server/storage
 */

import {
  users,
  satelliteItems,
  relatedItems,
  provenanceEvents,
  type User,
  type UpsertUser,
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
import { eq, and, gte, lte, or, inArray, sql, desc, asc, isNull } from "drizzle-orm";

/**
 * Storage interface defining all data access methods
 * Implementations can use different backends (database, API, etc.)
 */
export interface IStorage {
  /**
   * Retrieves a user by their unique identifier
   * @param id - User ID
   * @returns Promise resolving to User object or undefined if not found
   */
  getUser(id: string): Promise<User | undefined>;

  /**
   * Creates or updates a user record
   * @param user - User data to upsert
   * @returns Promise resolving to the created/updated User
   */
  upsertUser(user: UpsertUser): Promise<User>;

  /**
   * Searches satellite items with various filter criteria
   * @param filters - Search filter parameters
   * @param filters.keyword - Text search keyword
   * @param filters.location - Location name filter
   * @param filters.locationIds - Array of location hierarchy IDs
   * @param filters.keywords - Array of keyword category filters
   * @param filters.properties - Array of property filters (has_spatial, has_thumbnail, etc.)
   * @param filters.dateFrom - Start date for date range
   * @param filters.dateTo - End date for date range
   * @param filters.platform - Satellite platform filter
   * @param filters.sortBy - Sort order (date_desc, date_asc, name_asc)
   * @param filters.limit - Maximum results to return
   * @param filters.offset - Pagination offset
   * @returns Promise resolving to array of SatelliteItem objects
   */
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

  /**
   * Retrieves a single satellite item by ID
   * @param id - Satellite item ID
   * @returns Promise resolving to SatelliteItem or undefined if not found
   */
  getSatelliteItem(id: number): Promise<SatelliteItem | undefined>;

  /**
   * Creates a new satellite item
   * @param item - Satellite item data
   * @returns Promise resolving to the created SatelliteItem
   */
  createSatelliteItem(item: InsertSatelliteItem): Promise<SatelliteItem>;

  /**
   * Retrieves related items for data lineage tracking
   * @param itemId - Source item ID
   * @returns Promise resolving to array of RelatedItem objects
   */
  getRelatedItems(itemId: number): Promise<RelatedItem[]>;

  /**
   * Creates a relationship between two items
   * @param relatedItem - Related item data
   * @returns Promise resolving to the created RelatedItem
   */
  createRelatedItem(relatedItem: InsertRelatedItem): Promise<RelatedItem>;

  /**
   * Retrieves provenance events (processing history) for an item
   * @param itemId - Satellite item ID
   * @returns Promise resolving to array of ProvenanceEvent objects
   */
  getProvenanceEvents(itemId: number): Promise<ProvenanceEvent[]>;

  /**
   * Creates a new provenance event
   * @param event - Provenance event data
   * @returns Promise resolving to the created ProvenanceEvent
   */
  createProvenanceEvent(event: InsertProvenanceEvent): Promise<ProvenanceEvent>;

  /**
   * Retrieves saved searches for a user from Voyager
   * @param userId - User ID to fetch searches for
   * @param cookie - Browser cookies for Voyager authentication
   * @returns Promise resolving to array of SavedSearch objects
   */
  getSavedSearches(userId?: string, cookie?: string): Promise<SavedSearch[]>;

  /**
   * Retrieves a single saved search by ID
   * @param id - Saved search ID
   * @param cookie - Browser cookies for Voyager authentication
   * @returns Promise resolving to SavedSearch or undefined if not found
   */
  getSavedSearch(id: string, cookie?: string): Promise<SavedSearch | undefined>;

  /**
   * Creates a new saved search in Voyager
   * @param search - Saved search data
   * @param cookie - Browser cookies for Voyager authentication
   * @returns Promise resolving to the created SavedSearch
   */
  createSavedSearch(search: InsertSavedSearch, cookie?: string): Promise<SavedSearch>;

  /**
   * Deletes a saved search from Voyager
   * @param id - Saved search ID to delete
   * @param cookie - Browser cookies for Voyager authentication
   */
  deleteSavedSearch(id: string, cookie?: string): Promise<void>;
}

/**
 * Database storage implementation using Drizzle ORM
 * Handles PostgreSQL database operations and Voyager API integration
 */
export class DatabaseStorage implements IStorage {
  /**
   * Retrieves a user by ID from the database
   * @param id - User ID
   * @returns Promise resolving to User or undefined
   */
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  /**
   * Creates or updates a user record (upsert operation)
   * @param userData - User data to upsert
   * @returns Promise resolving to the upserted User
   */
  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  /**
   * Searches satellite items with dynamic filtering
   * Supports text search, location filtering, date ranges, and pagination
   * @param filters - Search filter parameters
   * @returns Promise resolving to matching SatelliteItem array
   */
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
  
  // Saved Searches methods - Using Voyager API
  async getSavedSearches(userId?: string, cookie?: string): Promise<SavedSearch[]> {
    const voyagerBaseUrl = process.env.VOYAGER_BASE_URL || 'http://172.22.1.25:8888';

    try {
      console.log('getSavedSearches called for userId:', userId);

      // Security: Do not fetch searches if no userId provided
      if (!userId) {
        console.log('No userId provided, returning empty array');
        return [];
      }

      // Build query URL with owner filter and JSON response format
      const queryParams = new URLSearchParams({
        indent: 'on',
        q: `owner:${userId}`, // Query by owner (userId)
        wt: 'json', // JSON response format
        rows: '150', // Maximum number of results
      });

      const url = `${voyagerBaseUrl}/solr/ssearch/select?${queryParams}`;
      console.log('Voyager URL:', url);
      console.log('Cookie:', cookie);

      const headers: HeadersInit = {};
      if (cookie) {
        headers['Cookie'] = cookie;
      }

      const response = await fetch(url, { headers });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Voyager API error: ${response.status} ${response.statusText}`, errorText);
        return [];
      }

      const data = await response.json();
      console.log('Voyager response:', JSON.stringify(data, null, 2));

      if (!data.response || !data.response.docs) {
        console.log('No docs in response');
        return [];
      }

      // Map Voyager docs to SavedSearch format
      return data.response.docs.map((doc: any) => ({
        id: doc.id, // Use id field from Voyager
        userId: doc.owner,
        name: doc.title,
        keyword: doc.keyword,
        location: doc.location,
        locationIds: doc.locationIds,
        keywords: doc.keywords,
        properties: doc.properties,
        dateFrom: doc.dateFrom ? new Date(doc.dateFrom) : undefined,
        dateTo: doc.dateTo ? new Date(doc.dateTo) : undefined,
        spatialFilter: doc.spatialFilter,
        notifyOnNewResults: doc.notifyOnNewResults,
        createdAt: doc.saved ? new Date(doc.saved) : new Date(),
      }));
    } catch (error) {
      console.error('Voyager getSavedSearches error:', error);
      return [];
    }
  }

  async getSavedSearch(id: string, cookie?: string): Promise<SavedSearch | undefined> {
    const voyagerBaseUrl = process.env.VOYAGER_BASE_URL || 'http://172.22.1.25:8888';

    try {
      console.log('getSavedSearch called for id:', id);

      const queryParams = new URLSearchParams({
        indent: 'on',
        q: `id:${id}`,
        wt: 'json',
      });

      const url = `${voyagerBaseUrl}/solr/ssearch/select?${queryParams}`;
      console.log('Voyager URL:', url);

      const headers: HeadersInit = {};
      if (cookie) {
        headers['Cookie'] = cookie;
      }

      const response = await fetch(url, { headers });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Voyager API error: ${response.status} ${response.statusText}`, errorText);
        return undefined;
      }

      const data = await response.json();
      console.log('Voyager response:', JSON.stringify(data, null, 2));

      if (!data.response || !data.response.docs || data.response.docs.length === 0) {
        console.log('No docs found for id:', id);
        return undefined;
      }

      const doc = data.response.docs[0];

      // Parse param_fq array to extract search parameters
      // Format: ["keyword:water", "locationId:af", "locationId:eg", "keywords:Urban"]
      let keyword: string | undefined;
      let location: string | undefined;
      const locationIds: string[] = [];
      const keywords: string[] = [];
      const properties: string[] = [];
      let dateFrom: Date | undefined;
      let dateTo: Date | undefined;

      if (doc.param_fq && Array.isArray(doc.param_fq)) {
        for (const fq of doc.param_fq) {
          const colonIndex = fq.indexOf(':');
          if (colonIndex === -1) continue;

          const field = fq.substring(0, colonIndex);
          const value = fq.substring(colonIndex + 1);

          switch (field) {
            case 'keyword':
              keyword = value;
              break;
            case 'location':
              location = value;
              break;
            case 'locationId':
              locationIds.push(value);
              break;
            case 'keywords':
              keywords.push(value);
              break;
            case 'properties':
            case 'property':
              properties.push(value);
              break;
            case 'dateFrom':
              dateFrom = new Date(value);
              break;
            case 'dateTo':
              dateTo = new Date(value);
              break;
          }
        }
      }

      console.log('Parsed from param_fq:', { keyword, location, locationIds, keywords, properties, dateFrom, dateTo });

      return {
        id: doc.id,
        userId: doc.owner,
        name: doc.title,
        keyword: keyword,
        location: location,
        locationIds: locationIds.length > 0 ? locationIds : undefined,
        keywords: keywords.length > 0 ? keywords : undefined,
        properties: properties.length > 0 ? properties : undefined,
        dateFrom: dateFrom,
        dateTo: dateTo,
        spatialFilter: doc.spatialFilter,
        notifyOnNewResults: doc.notifyOnNewResults,
        createdAt: doc.saved ? new Date(doc.saved) : new Date(),
      };
    } catch (error) {
      console.error('Voyager getSavedSearch error:', error);
      return undefined;
    }
  }

  async createSavedSearch(search: InsertSavedSearch, cookie?: string): Promise<SavedSearch> {
    const voyagerBaseUrl = process.env.VOYAGER_BASE_URL || 'http://172.22.1.25:8888';

    console.log('createSavedSearch called with:', JSON.stringify(search, null, 2));
    console.log('Cookie:', cookie);

    // Build path in Voyager's filter format: /f.fieldname=value/f.fieldname2=value2
    const pathSegments: string[] = [];

    if (search.keyword) {
      pathSegments.push(`f.keyword=${search.keyword}`);
    }
    if (search.location) {
      pathSegments.push(`f.location=${search.location}`);
    }
    if (search.locationIds?.length) {
      search.locationIds.forEach(id => pathSegments.push(`f.locationId=${id}`));
    }
    if (search.keywords?.length) {
      search.keywords.forEach(kw => pathSegments.push(`f.keywords=${kw}`));
    }
    if (search.properties?.length) {
      search.properties.forEach(prop => pathSegments.push(`f.property=${prop}`));
    }
    if (search.spatialFilter) {
      pathSegments.push(`f.spatialFilter=${JSON.stringify(search.spatialFilter)}`);
    }
    if (search.dateFrom) {
      pathSegments.push(`f.dateFrom=${search.dateFrom.toISOString()}`);
    }
    if (search.dateTo) {
      pathSegments.push(`f.dateTo=${search.dateTo.toISOString()}`);
    }

    // Default to root if no filters
    const path = pathSegments.length > 0 ? `/${pathSegments.join('/')}` : '/';

    // Build payload - Voyager accepts many fields, not just title and path
    const payload = {
      title: search.name,
      path: path,
      location: search.location,
      keyword: search.keyword,
      locationIds: search.locationIds,
      keywords: search.keywords,
      properties: search.properties,
      dateFrom: search.dateFrom?.toISOString(),
      dateTo: search.dateTo?.toISOString(),
      spatialFilter: search.spatialFilter,
      notifyOnNewResults: search.notifyOnNewResults,
      userId: search.userId,
      frequency: null, // Required field from your example
    };

    console.log('Voyager POST payload:', JSON.stringify(payload, null, 2));
    console.log('Voyager URL:', `${voyagerBaseUrl}/api/rest/display/ssearch`);

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (cookie) {
        headers['Cookie'] = cookie;
      }

      const requestBody = JSON.stringify(payload);
      console.log('Request body being sent to Voyager:', requestBody);
      console.log('Request headers:', headers);

      const response = await fetch(
        `${voyagerBaseUrl}/api/rest/display/ssearch`,
        {
          method: 'POST',
          headers,
          body: requestBody,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Voyager API error: ${response.status} ${response.statusText}`, errorText);

        // Try to extract a meaningful error message
        let errorMessage = response.statusText;
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.message) {
            errorMessage = errorJson.message;
          } else if (errorJson.error) {
            errorMessage = errorJson.error;
          }
        } catch (e) {
          // If it's not JSON, check if it contains useful text
          if (errorText.includes('already exists')) {
            errorMessage = 'A saved search with this name already exists';
          } else if (errorText.includes('duplicate')) {
            errorMessage = 'A saved search with this name already exists';
          } else if (errorText.length > 0 && errorText.length < 200) {
            errorMessage = errorText;
          }
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Voyager response:', JSON.stringify(data, null, 2));

      return {
        id: data.display || ('saved-' + Date.now()),
        userId: search.userId,
        name: search.name,
        keyword: search.keyword,
        location: search.location,
        locationIds: search.locationIds,
        keywords: search.keywords,
        properties: search.properties,
        dateFrom: search.dateFrom,
        dateTo: search.dateTo,
        spatialFilter: search.spatialFilter,
        notifyOnNewResults: search.notifyOnNewResults,
        createdAt: new Date(),
      };
    } catch (error) {
      console.error('Voyager createSavedSearch error:', error);
      throw error;
    }
  }

  async deleteSavedSearch(id: string, cookie?: string): Promise<void> {
    const voyagerBaseUrl = process.env.VOYAGER_BASE_URL || 'http://172.22.1.25:8888';

    console.log('deleteSavedSearch called for id:', id);
    console.log('Voyager DELETE URL:', `${voyagerBaseUrl}/api/rest/display/ssearch/${id}`);
    console.log('Cookie:', cookie);

    try {
      const headers: HeadersInit = {};
      if (cookie) {
        headers['Cookie'] = cookie;
      }

      const response = await fetch(
        `${voyagerBaseUrl}/api/rest/display/ssearch/${id}`,
        {
          method: 'DELETE',
          headers,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Voyager API error: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`Voyager API error: ${response.statusText}`);
      }

      console.log('Successfully deleted saved search:', id);
    } catch (error) {
      console.error('Voyager deleteSavedSearch error:', error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();
