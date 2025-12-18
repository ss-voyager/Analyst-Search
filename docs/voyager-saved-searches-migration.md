# Implementation Plan: Migrate Saved Searches to Voyager Index

## Overview
Replace the PostgreSQL-based saved searches implementation with Voyager's saved search index. All saved searches will be stored in and retrieved from the Voyager index at `http://172.22.1.25:8888`, with user authentication handled via tokens.

## User Requirements
1. **POST to Voyager**: Save searches to `http://172.22.1.25:8888/api/rest/display/ssearch`
2. **GET from Voyager**: Retrieve searches from `http://172.22.1.25:8888/solr/ssearch/select?fl=*,display:[display]&rows=150`
3. **Authentication only**: Only logged-in users can save searches (no anonymous saves)
4. **User ID from token**: Server extracts user ID from authentication token
5. **Required fields**: `title` (search name) and `path` (can be any data to reconstruct UI)
6. **Full payload allowed**: Can send all current search state (keywords, properties, locationIds, dates, spatialFilter, etc.)
7. **Remove PostgreSQL table**: Delete `saved_searches` table entirely

## Current Architecture

### Backend (Server)
- **server/routes.ts** (lines 132-174): Three endpoints (GET, POST, DELETE)
- **server/storage.ts** (lines 208-235): Four storage methods using Drizzle ORM
- **shared/schema.ts** (lines 109-131): PostgreSQL table definition

### Frontend (Client)
- **client/src/features/search/api.ts** (lines 66-171): API wrappers and React Query hooks
- **client/src/pages/search-results-page.tsx** (lines 81-149, 1131-1204): Save search UI and logic

## Implementation Steps

### 1. Update Storage Layer (`server/storage.ts`)

Replace PostgreSQL storage methods with Voyager API calls:

**`getSavedSearches(userId?: string)`** - Lines 208-218
```typescript
async getSavedSearches(userId?: string): Promise<SavedSearch[]> {
  // Voyager returns searches filtered by user automatically via auth token
  const response = await fetch(
    'http://172.22.1.25:8888/solr/ssearch/select?fl=*,display:[display]&rows=150',
    {
      headers: {
        // Include auth token to get user-specific searches
        'Authorization': `Bearer ${this.getAuthToken()}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Voyager API error: ${response.statusText}`);
  }

  const data = await response.json();

  // Transform Voyager response to SavedSearch format
  return data.response.docs.map((doc: any) => ({
    id: doc.display, // Use display ID as unique identifier
    userId: doc.userId || userId,
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
    createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),
  }));
}
```

**`createSavedSearch(search: InsertSavedSearch)`** - Lines 225-231
```typescript
async createSavedSearch(search: InsertSavedSearch): Promise<SavedSearch> {
  // Build payload with required fields (title, path) plus all search state
  const payload = {
    title: search.name,
    path: `/search`, // Can be anything to help reconstruct UI
    // Include all search state for UI reconstruction
    keyword: search.keyword,
    location: search.location,
    locationIds: search.locationIds,
    keywords: search.keywords,
    properties: search.properties,
    dateFrom: search.dateFrom?.toISOString(),
    dateTo: search.dateTo?.toISOString(),
    spatialFilter: search.spatialFilter,
    notifyOnNewResults: search.notifyOnNewResults,
  };

  const response = await fetch(
    'http://172.22.1.25:8888/api/rest/display/ssearch',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`,
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    throw new Error(`Voyager API error: ${response.statusText}`);
  }

  const data = await response.json();

  // Return created search (Voyager should return the document with display ID)
  return {
    id: data.display,
    userId: search.userId,
    name: search.name,
    ...search,
    createdAt: new Date(),
  };
}
```

**`deleteSavedSearch(id: number)`** - Lines 233-235
```typescript
async deleteSavedSearch(id: number): Promise<void> {
  // DELETE using display ID
  const response = await fetch(
    `http://172.22.1.25:8888/api/rest/display/ssearch/${id}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Voyager API error: ${response.statusText}`);
  }
}
```

**Add auth token helper**:
```typescript
private getAuthToken(): string {
  // Extract from session/request context
  // Implementation depends on how auth is handled
  return this.authToken || '';
}
```

### 2. Update Route Handlers (`server/routes.ts`)

**GET `/api/saved-searches`** - Lines 132-144
```typescript
// Add authentication check
server.get('/api/saved-searches', async (req, res) => {
  if (!req.isAuthenticated?.()) {
    return res.status(401).send({ message: 'Authentication required' });
  }

  try {
    const searches = await storage.getSavedSearches(req.user?.id);
    res.json(searches);
  } catch (error) {
    console.error('Failed to fetch saved searches:', error);
    res.status(500).send({ message: 'Failed to fetch saved searches' });
  }
});
```

**POST `/api/saved-searches`** - Lines 147-162
```typescript
// Add authentication check
server.post('/api/saved-searches', async (req, res) => {
  if (!req.isAuthenticated?.()) {
    return res.status(401).send({ message: 'Authentication required' });
  }

  try {
    const validationResult = insertSavedSearchSchema.safeParse({
      ...req.body,
      userId: req.user?.id, // Force userId from auth token
    });

    if (!validationResult.success) {
      return res.status(400).send({
        message: 'Invalid saved search data',
        errors: validationResult.error.issues,
      });
    }

    const savedSearch = await storage.createSavedSearch(validationResult.data);
    res.status(201).json(savedSearch);
  } catch (error) {
    console.error('Failed to create saved search:', error);
    res.status(500).send({ message: 'Failed to save search' });
  }
});
```

**DELETE `/api/saved-searches/:id`** - Lines 165-174
```typescript
// Add authentication check
server.delete('/api/saved-searches/:id', async (req, res) => {
  if (!req.isAuthenticated?.()) {
    return res.status(401).send({ message: 'Authentication required' });
  }

  try {
    const id = parseInt(req.params.id);
    await storage.deleteSavedSearch(id);
    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete saved search:', error);
    res.status(500).send({ message: 'Failed to delete saved search' });
  }
});
```

### 3. Update Schema Types (`shared/schema.ts`)

**Keep SavedSearch type but remove table** - Lines 109-131:
```typescript
// Remove the pgTable definition entirely
// Delete lines 109-123 (savedSearches table)

// Keep the type definitions for API contracts
export interface SavedSearch {
  id: string; // Changed from serial to string (display ID from Voyager)
  userId?: string;
  name: string;
  keyword?: string;
  location?: string;
  locationIds?: string[];
  keywords?: string[];
  properties?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  spatialFilter?: any;
  notifyOnNewResults?: number;
  createdAt: Date;
}

export interface InsertSavedSearch {
  userId?: string;
  name: string;
  keyword?: string;
  location?: string;
  locationIds?: string[];
  keywords?: string[];
  properties?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  spatialFilter?: any;
  notifyOnNewResults?: number;
}

// Update Zod schema to match new structure
export const insertSavedSearchSchema = z.object({
  userId: z.string().optional(),
  name: z.string().min(1),
  keyword: z.string().optional(),
  location: z.string().optional(),
  locationIds: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
  properties: z.array(z.string()).optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  spatialFilter: z.any().optional(),
  notifyOnNewResults: z.number().optional(),
});

// Remove savedSearchesRelations (lines 153-158)
```

### 4. Update Frontend - Disable Anonymous Saves (`client/src/pages/search-results-page.tsx`)

**Modify handleSaveSearch** - Lines 117-149:
```typescript
const handleSaveSearch = () => {
  // Require authentication - remove anonymous save support
  if (!isAuthenticated || !user) {
    toast.error("Please log in to save searches", {
      description: "Saved searches require authentication.",
    });
    setIsSaveSearchOpen(false);
    return;
  }

  saveSearchMutation.mutate({
    userId: user.id, // Always include userId (required)
    name: saveSearchName,
    keyword,
    location: place,
    locationIds: selectedLocationIds.length > 0 ? selectedLocationIds : undefined,
    keywords: selectedKeywords.length > 0 ? selectedKeywords : undefined,
    properties: selectedProperties.length > 0 ? selectedProperties : undefined,
    dateFrom: date?.from,
    dateTo: date?.to,
    spatialFilter,
    notifyOnNewResults: saveSearchNotify ? 1 : 0,
  }, {
    onSuccess: () => {
      setIsSearchSaved(true);
      setIsSaveSearchOpen(false);
      toast.success("Search saved successfully", {
        description: "You will be notified when new results match this query.",
      });
    },
    onError: (error) => {
      toast.error("Failed to save search", {
        description: error.message,
      });
    },
  });
};
```

**Update Save button to check authentication** - Around lines 1131-1204:
```typescript
// Only show save button to authenticated users
{isAuthenticated && (
  <Button
    variant="outline"
    size="sm"
    onClick={() => setIsSaveSearchOpen(true)}
    disabled={isSearchSaved}
  >
    <BookmarkPlus className="h-4 w-4 mr-2" />
    {isSearchSaved ? 'Saved' : 'Save Search'}
  </Button>
)}
```

### 5. Update Frontend API Calls (`client/src/features/search/api.ts`)

**Update type imports** - Lines 1-3:
```typescript
// SavedSearch type is now interface, not from Drizzle
import type { SavedSearch } from "@shared/schema";
```

**Keep existing functions unchanged** - Lines 66-171:
- `fetchSavedSearches()` - No changes needed
- `createSavedSearch()` - No changes needed
- `deleteSavedSearch()` - No changes needed
- React Query hooks remain the same

The API contract stays the same; backend handles Voyager integration transparently.

### 6. Update Storage Interface (`server/storage.ts`)

**Update IStorage interface** - Lines 52-57:
```typescript
export interface IStorage {
  // ... other methods ...

  // Update return types to match Voyager's string IDs
  getSavedSearches(userId?: string): Promise<SavedSearch[]>;
  getSavedSearch(id: string): Promise<SavedSearch | null>; // Changed from number to string
  createSavedSearch(search: InsertSavedSearch): Promise<SavedSearch>;
  deleteSavedSearch(id: string): Promise<void>; // Changed from number to string
}
```

**Update DatabaseStorage class** - Lines 208-235:
- Implement the three methods as shown in Step 1
- Remove `getSavedSearch()` if not used (not exposed via API)
- Add auth token management

### 7. Create Database Migration

**Create migration file** to drop the `saved_searches` table:
```sql
-- Drop saved_searches table and relations
DROP TABLE IF EXISTS saved_searches CASCADE;
```

Run with: `npm run db:push` or create proper migration file.

### 8. Environment Configuration

**Update `.env` or `.env.local`**:
```
VOYAGER_BASE_URL=http://172.22.1.25:8888
VOYAGER_API_KEY=<if-needed>
```

**Add config helper** in `server/lib/config.ts` (or similar):
```typescript
export const VOYAGER_CONFIG = {
  baseUrl: process.env.VOYAGER_BASE_URL || 'http://172.22.1.25:8888',
  apiKey: process.env.VOYAGER_API_KEY,
};
```

## Critical Files to Modify

1. **server/storage.ts** - Replace storage methods with Voyager API calls
2. **server/routes.ts** - Add authentication checks to all endpoints
3. **shared/schema.ts** - Remove table, keep types, update ID from number to string
4. **client/src/pages/search-results-page.tsx** - Require authentication for saves
5. **client/src/features/search/api.ts** - Update type imports (minimal changes)

## Authentication Flow

1. User logs in → receives auth token (existing flow)
2. User saves search → frontend sends to `/api/saved-searches`
3. Backend validates token → extracts userId
4. Backend POSTs to Voyager with token in Authorization header
5. Voyager stores search with userId association
6. When retrieving, Voyager filters by userId automatically via token

## Key Design Decisions

1. **Auth token in storage layer**: Pass token from request context to storage methods
2. **Display ID as primary key**: Use Voyager's `display` field as unique identifier (string)
3. **Full payload storage**: Send all search state to Voyager for complete UI reconstruction
4. **No anonymous saves**: Require authentication for all save operations
5. **Transparent migration**: Keep API contract unchanged so frontend works without modifications
6. **Error handling**: Log Voyager API errors and return appropriate HTTP status codes

## Edge Cases & Error Handling

1. **Voyager API down**: Return 503 with appropriate error message
2. **Invalid auth token**: Return 401 Unauthorized
3. **Voyager returns unexpected format**: Log error, return 500
4. **Network timeout**: Set reasonable timeout (5s), return 504 Gateway Timeout
5. **Display ID conflicts**: Voyager handles uniqueness, trust the response

## Testing Checklist

1. ✅ Authenticated user can save search
2. ✅ Unauthenticated user cannot save (401 error)
3. ✅ Saved searches retrieved correctly with all fields
4. ✅ Delete saved search works
5. ✅ Error handling for Voyager API failures
6. ✅ All search state preserved (keywords, properties, dates, spatial filter)
7. ✅ Multiple saved searches for same user
8. ✅ UI shows "Login required" for anonymous users
9. ✅ PostgreSQL table successfully dropped without errors

## Rollback Plan

If issues arise:
1. Keep backup of old code before migration
2. PostgreSQL table can be recreated from schema
3. Re-deploy old version if Voyager integration fails

## Estimated Time
2-3 hours implementation + testing
