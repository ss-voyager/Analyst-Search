/**
 * @fileoverview Type definitions and validation schemas for the application
 * @module shared/schema
 */

import { z } from "zod";

// Saved Searches - Using Voyager API

/**
 * Saved search record from Voyager
 */
export interface SavedSearch {
  /** Unique identifier (Voyager display ID) */
  id: string;
  /** User who owns this search */
  userId?: string | null;
  /** Display name for the saved search */
  name: string;
  /** Text search keyword */
  keyword?: string | null;
  /** Location name filter */
  location?: string | null;
  /** Array of location hierarchy IDs */
  locationIds?: string[] | null;
  /** Array of keyword category filters */
  keywords?: string[] | null;
  /** Array of property filters (has_spatial, has_thumbnail, etc.) */
  properties?: string[] | null;
  /** Start date for date range filter */
  dateFrom?: Date | null;
  /** End date for date range filter */
  dateTo?: Date | null;
  /** Spatial/geographic filter */
  spatialFilter?: any;
  /** Email notification frequency (null = disabled) */
  notifyOnNewResults?: number | null;
  /** When the search was created */
  createdAt: Date;
}

/**
 * Data for creating a new saved search
 */
export interface InsertSavedSearch {
  /** User who owns this search */
  userId?: string;
  /** Display name for the saved search */
  name: string;
  /** Text search keyword */
  keyword?: string;
  /** Location name filter */
  location?: string;
  /** Array of location hierarchy IDs */
  locationIds?: string[];
  /** Array of keyword category filters */
  keywords?: string[];
  /** Array of property filters */
  properties?: string[];
  /** Start date for date range filter */
  dateFrom?: Date;
  /** End date for date range filter */
  dateTo?: Date;
  /** Spatial/geographic filter */
  spatialFilter?: any;
  /** Email notification frequency */
  notifyOnNewResults?: number;
}

/**
 * Zod schema for validating saved search input
 */
export const insertSavedSearchSchema = z.object({
  userId: z.string().optional(),
  name: z.string().min(1),
  keyword: z.string().optional(),
  location: z.string().optional(),
  locationIds: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
  properties: z.array(z.string()).optional(),
  dateFrom: z.union([z.date(), z.string().transform(str => new Date(str))]).optional(),
  dateTo: z.union([z.date(), z.string().transform(str => new Date(str))]).optional(),
  spatialFilter: z.any().optional(),
  notifyOnNewResults: z.number().optional(),
});
