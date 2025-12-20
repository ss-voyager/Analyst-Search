# iOS App Development Prompts for Claude

Use these prompts to guide Claude through building the Analyst Search iOS app. Start with the kickoff prompt, then use subsequent prompts as you progress through development.

---

## Kickoff Prompt (Start Here)

```
I'm building a native iOS app called "Analyst Search" using Swift and SwiftUI. This is a conversion of an existing React/TypeScript web application that searches satellite imagery and geospatial data through a Voyager API.

Please help me set up the project structure and build the app incrementally.

## App Overview
- iOS 16+ target
- Universal app (iPhone + iPad)
- SwiftUI for UI
- Async/await for networking
- SwiftData for local persistence

## Core Features (Priority Order)
1. Authentication with Navigo (ASWebAuthenticationSession)
2. Search with filters (date, keywords, location, properties)
3. Results grid with infinite scroll
4. Map view with MapKit
5. Item detail view
6. Saved searches

## API Details
The app connects to a Voyager search API:
- Base URL is configurable (stored in Config)
- Search endpoint: GET /solr/v0/select with query params
- Auth check: GET /api/rest/auth/info
- Saved searches: /solr/ssearch/select

## Existing Web App Reference
The web app has these key patterns:
- Filter queries (fq) for properties like has_spatial, has_thumbnail
- Keywords filter with grouped categories
- Location hierarchy with gazetteer bbox lookup
- Infinite pagination with cursor-based loading

Please start by:
1. Creating the Xcode project structure with proper organization
2. Setting up the data models based on the Voyager API response
3. Creating the networking layer with async/await
4. Building the authentication flow

Let me know what files to create first, and provide the Swift code for each.
```

---

## Phase 1 Prompts

### Project Structure Setup

```
Help me create the folder structure for the iOS app. I want a clean architecture with:
- App/ (App entry point, configuration)
- Features/ (feature-based modules)
- Core/ (shared utilities, extensions, networking)
- UI/ (reusable UI components)

For each feature (Search, Map, SavedSearches, Profile), I want:
- Views/
- ViewModels/
- Models/

Please provide the folder structure and initial files to create.
```

### Data Models

```
Create Swift data models for the Analyst Search app based on this Voyager API response:

{
  "response": {
    "numFound": 1234,
    "start": 0,
    "docs": [
      {
        "id": "item-id",
        "title": "Item Title",
        "name": "filename.tif",
        "format": "GeoTIFF",
        "format_type": "File",
        "format_category": "Image",
        "abstract": "Description text",
        "thumb": "https://example.com/thumb.jpg",
        "geo": { "type": "Polygon", "coordinates": [[[-180,-90],[180,-90],[180,90],[-180,90],[-180,-90]]] },
        "bbox": "-180,-90,180,90",
        "keywords": ["water", "satellite"],
        "modified": "2024-01-15T00:00:00Z",
        "bytes": 1234567,
        "download": "https://example.com/download",
        "fullpath": "/path/to/file"
      }
    ]
  }
}

Create:
1. SearchResult model with Codable conformance
2. SearchResponse wrapper
3. Helper computed properties for display (formatted date, file size, bounds for MapKit)
```

### Networking Layer

```
Create a networking layer for the iOS app with:

1. APIClient class using URLSession and async/await
2. Request builder with support for:
   - Query parameters
   - Cookie-based authentication
   - Custom headers
3. Error handling with custom APIError enum
4. Response decoding with proper error messages

The client should support these endpoints:
- Search: GET /solr/v0/select?q={query}&fq={filters}&start={offset}&rows={limit}
- Auth check: GET /api/rest/auth/info
- Item detail: GET /solr/v0/select?q=id:{itemId}

Include retry logic and request/response logging for debug builds.
```

### Authentication Flow

```
Implement authentication for the iOS app using ASWebAuthenticationSession.

Requirements:
1. AuthService class that handles:
   - Login via popup to {baseURL}/navigo/login
   - Session validation via /api/rest/auth/info
   - Logout
   - Token/cookie persistence in Keychain

2. AuthViewModel as @Observable for SwiftUI

3. User model with:
   - id, username, displayName, email
   - isAuthenticated computed property

4. LoginView with:
   - App branding
   - "Sign In" button
   - Loading state
   - Error display

The web app uses popup-based auth that sets cookies. We need to capture those cookies after auth completes.
```

---

## Phase 2 Prompts

### Search View

```
Create the main SearchView for the iOS app with:

1. SearchBar at top with:
   - Text input
   - Voice search button (iOS Speech)
   - Clear button

2. Active filters display (horizontal scroll of chips)

3. Results section:
   - Grid layout (LazyVGrid)
   - 2 columns on iPhone, 3-4 on iPad
   - Infinite scroll with pagination
   - Pull to refresh
   - Loading states

4. SearchViewModel with:
   - @Published searchQuery
   - @Published results: [SearchResult]
   - @Published isLoading
   - @Published filters (date, keywords, properties, location)
   - search() async function
   - loadMore() for pagination
```

### Filters Sheet

```
Create a FiltersView presented as a sheet with sections for:

1. Date Range
   - DatePicker for from/to
   - Quick presets (7 days, 30 days, year, all time)

2. Keywords
   - Grouped by category (use OutlineGroup or custom)
   - Categories: Location, Data Type, Time, Environment, Infrastructure, Agriculture, Satellite, Analysis
   - Multi-select checkboxes
   - Search filter for keywords

3. Location Hierarchy
   - Tree view with folders (continents > countries > regions)
   - Checkbox with indeterminate state for partial selection
   - Expand/collapse

4. Properties
   - Toggle switches for:
     - Has Spatial (geometry_type:*)
     - Has Thumbnail
     - Has Temporal
     - Is Downloadable

Include:
- "Apply" button
- "Clear All" button
- Selected count badges on each section
```

### Result Card Component

```
Create a SearchResultCard view component for displaying search results:

1. AsyncImage for thumbnail with:
   - Placeholder while loading
   - Error state fallback
   - Aspect ratio preservation

2. Content overlay at bottom:
   - Title (2 lines max)
   - Format badge (colored by type)
   - Date

3. Interaction:
   - Tap to navigate to detail
   - Long press for context menu (Preview, Save, Share)

4. Accessibility:
   - VoiceOver labels
   - Proper hit targets

Make it work in both grid and list layouts.
```

### Map Integration

```
Create a MapView for the iOS app using MapKit:

1. Map display with:
   - Toggle between standard and satellite imagery
   - Search results displayed as rectangles (footprints)
   - Clustering for dense results
   - Tap on footprint shows item preview

2. Draw-to-search tools:
   - Toolbar with draw mode buttons (box, point)
   - Box drawing with gesture recognizer
   - Point tap selection
   - Clear filter button

3. MapViewModel with:
   - @Published mapRegion
   - @Published selectedBounds (for spatial filter)
   - @Published drawMode: DrawMode enum
   - Integration with search filters

4. Overlay for hovered/selected items showing thumbnail

Use MapKit's latest iOS 17 APIs if targeting iOS 17+, otherwise use MKMapView wrapper.
```

---

## Phase 3 Prompts

### Item Detail View

```
Create ItemDetailView for showing full item information:

1. Header:
   - Large thumbnail (zoomable)
   - Title
   - Format and category badges

2. Metadata sections (collapsible):
   - Overview (description, date, size)
   - Location (map showing bounds)
   - Keywords (as tags)
   - Technical details (format, resolution, etc.)

3. Actions:
   - Download button
   - Share button (UIActivityViewController)
   - Save/Bookmark toggle

4. Related items carousel (if available)

5. Navigation:
   - Back button
   - Title in nav bar

Use ScrollView with LazyVStack for performance.
```

### Saved Searches

```
Create saved searches functionality:

1. SavedSearchesView:
   - List of saved searches
   - Swipe to delete
   - Tap to load
   - Pull to refresh
   - Empty state

2. SaveSearchSheet:
   - Name input
   - Preview of current filters
   - Save button

3. SavedSearchService:
   - Fetch saved searches from API
   - Create new saved search
   - Delete saved search
   - Local caching

4. SavedSearch model matching API:
   {
     "id": "search-id",
     "title": "My Search",
     "query": "water",
     "path": "/saved/path",
     "owner": "username"
     // plus filter params
   }

When loading a saved search, restore all filter state and execute search.
```

### Settings & Profile

```
Create SettingsView with:

1. Profile section:
   - User avatar/initials
   - Display name
   - Email
   - Sign out button

2. Preferences:
   - Default map style toggle
   - Results per page picker
   - Clear cache button with size display

3. About:
   - App version
   - API server URL (read-only)
   - Links to help/support

4. If not logged in:
   - Sign in prompt
   - Limited functionality message

Use Form with Sections for native iOS look.
```

---

## Utility Prompts

### Error Handling

```
Create a robust error handling system:

1. AppError enum covering:
   - Network errors (no connection, timeout, server error)
   - Auth errors (unauthorized, session expired)
   - API errors (not found, validation, rate limit)
   - Local errors (storage, parsing)

2. ErrorView component for displaying errors:
   - Icon based on error type
   - User-friendly message
   - Retry button where applicable
   - Report issue option

3. Global error handling:
   - Toast/banner for transient errors
   - Full-screen for blocking errors
   - Automatic retry for network issues
```

### Caching & Offline

```
Implement caching for offline support:

1. ImageCache using NSCache:
   - Memory cache for thumbnails
   - Disk cache for larger images
   - Cache eviction policy

2. SearchResultCache with SwiftData:
   - Store recent search results
   - TTL-based expiration
   - Manual clear option

3. OfflineManager:
   - Network reachability monitoring
   - Queue failed requests for retry
   - Sync when back online

4. UI indicators:
   - Offline banner
   - Cached content badge
   - Sync status
```

### Testing

```
Help me write tests for the iOS app:

1. Unit tests for:
   - SearchResult model parsing
   - Filter query building
   - Date formatting utilities

2. ViewModel tests:
   - SearchViewModel search flow
   - AuthViewModel login/logout
   - Mock API responses

3. UI tests:
   - Search and filter flow
   - Navigation between views
   - Error state display

Provide XCTest examples with async testing patterns.
```

---

## Tips for Working with Claude

1. **Provide Context**: Always mention you're working on the Analyst Search iOS app so Claude maintains context.

2. **Incremental Development**: Build one feature at a time. Get it working before moving to the next.

3. **Share Errors**: If you encounter build errors, share the full error message for accurate fixes.

4. **Reference Web App**: When behavior should match the web app, reference specific files from the existing codebase.

5. **Request Explanations**: Ask Claude to explain architectural decisions if you want to understand the "why".

6. **Iterate on UI**: SwiftUI previews make iteration fast. Ask for preview code for each view.

Example follow-up prompt:
```
The SearchResultCard is working but I want to add a shimmer loading effect
for the thumbnail. Can you update the AsyncImage section to show a shimmer
placeholder while loading?
```
