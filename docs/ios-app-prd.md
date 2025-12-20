# Product Requirements Document: Analyst Search iOS App

## Executive Summary

Transform the existing Analyst Search web application into a native iOS application using Swift and SwiftUI. The app enables analysts to search, filter, and explore geospatial/satellite imagery data through an intuitive mobile interface optimized for field use and on-the-go research.

## Product Overview

### Vision
Provide analysts with a powerful, mobile-native tool to search and discover satellite imagery and geospatial datasets from anywhere, leveraging the device's native capabilities for an optimal user experience.

### Target Users
- Intelligence analysts
- Geospatial researchers
- Remote sensing specialists
- Field operatives needing quick data access

### Platform Requirements
- iOS 16.0+
- iPhone and iPad support (Universal app)
- Optimized for both portrait and landscape orientations

## Core Features

### 1. Authentication
**Priority: P0 (Critical)**

- Integrate with existing Navigo authentication system
- Support for ASWebAuthenticationSession for OAuth/popup-based auth
- Secure credential storage using iOS Keychain
- Biometric authentication (Face ID/Touch ID) for quick re-login
- Session persistence and automatic token refresh

### 2. Search Functionality
**Priority: P0 (Critical)**

- Full-text search with query input
- Search history (locally stored)
- Recent searches display
- Voice search using iOS Speech framework
- Autocomplete suggestions

### 3. Filters Panel
**Priority: P0 (Critical)**

#### Date Range Filter
- Native iOS date picker integration
- Quick presets (Last 7 days, Last 30 days, Last year, Custom)
- From/To date selection

#### Location Hierarchy Filter
- Collapsible tree view using native OutlineGroup
- Multi-select with parent/child cascade logic
- Search within locations
- Integration with Gazetteer API for bbox resolution

#### Keywords Filter
- Grouped keywords with collapsible sections
- Category-based organization:
  - Location & Geography
  - Data Type & Format
  - Time & Date
  - Environment & Nature
  - Infrastructure & Urban
  - Agriculture & Land Use
  - Satellite & Sensor
  - Analysis & Processing
- Multi-select support
- Search/filter within keywords

#### Properties Filter
- Has Spatial
- Has Thumbnail
- Has Temporal
- Is Downloadable

### 4. Results Display
**Priority: P0 (Critical)**

- Grid view (2-column on iPhone, 3-4 columns on iPad)
- List view option
- Infinite scroll pagination
- Pull-to-refresh
- Result count display
- Sort options (Relevance, Date Desc, Date Asc)

#### Result Card Components
- Thumbnail image with lazy loading
- Title (2 lines max, truncated)
- Format badge
- Date display
- Quick actions (Preview, Save, Share)

### 5. Map Integration
**Priority: P1 (High)**

- Native MapKit integration
- Toggle between standard and satellite imagery
- Display result footprints as rectangles
- Thumbnail overlay on hover/tap
- Draw-to-search functionality:
  - Bounding box drawing
  - Point selection
  - Polygon drawing (stretch goal)
- Spatial filter visualization
- Cluster markers for dense results

### 6. Item Detail View
**Priority: P0 (Critical)**

- Full metadata display
- Large thumbnail/preview
- Download options
- Share functionality (iOS Share Sheet)
- Related items section
- Map showing item location
- Full description with expandable text

### 7. Saved Searches
**Priority: P1 (High)**

- Save current search with name
- List saved searches
- Load saved search (restore all filters)
- Delete saved searches
- Sync with server (Voyager API)

### 8. Offline Capabilities
**Priority: P2 (Medium)**

- Cache recent search results
- Offline viewing of cached items
- Queue downloads for when online
- Clear cache option in settings

## Technical Architecture

### Data Layer

```
┌─────────────────────────────────────────┐
│           Presentation Layer            │
│  (SwiftUI Views, ViewModels)            │
├─────────────────────────────────────────┤
│            Domain Layer                 │
│  (Use Cases, Business Logic)            │
├─────────────────────────────────────────┤
│            Data Layer                   │
│  (Repositories, API Services, Cache)    │
├─────────────────────────────────────────┤
│          Infrastructure                 │
│  (Networking, Storage, Auth)            │
└─────────────────────────────────────────┘
```

### Key Components

#### Networking
- URLSession-based API client
- Async/await pattern for all network calls
- Request/Response interceptors for auth
- Retry logic with exponential backoff

#### State Management
- SwiftUI @Observable (iOS 17+) or ObservableObject
- Combine for reactive data flow
- Environment objects for shared state

#### Persistence
- SwiftData or Core Data for local storage
- UserDefaults for preferences
- Keychain for sensitive data
- FileManager for cached images

### API Integration

#### Voyager API Endpoints
```
Base URL: {VOYAGER_BASE_URL}

GET  /solr/v0/select          - Search with filters
GET  /solr/v0/select?id=      - Get item by ID
GET  /solr/ssearch/select     - Saved searches
POST /solr/ssearch/update     - Create saved search
POST /solr/ssearch/update     - Delete saved search
GET  /api/rest/auth/info      - Auth check
GET  /api/rest/gazetteer/     - Gazetteer lookup
```

#### Request Authentication
- Pass session cookies with all requests
- Handle 401/403 with re-authentication flow

## UI/UX Design Guidelines

### Design Principles
1. **Native Feel** - Follow iOS Human Interface Guidelines
2. **Efficient** - Minimize taps to complete tasks
3. **Responsive** - Immediate feedback on all interactions
4. **Accessible** - Support VoiceOver, Dynamic Type

### Navigation Structure
```
TabBar
├── Search (Home)
│   ├── Search Results
│   │   └── Item Detail
│   └── Filters (Sheet)
├── Map
│   └── Item Detail
├── Saved
│   └── Item Detail
└── Profile/Settings
```

### Color Scheme
- Support Light and Dark mode
- Primary: Blue (#3B82F6)
- Accent colors for categories
- Semantic colors for status

### Typography
- SF Pro for all text
- Dynamic Type support
- Consistent hierarchy

## Non-Functional Requirements

### Performance
- App launch < 2 seconds
- Search results < 3 seconds
- Smooth 60fps scrolling
- Image loading with placeholders

### Security
- Certificate pinning (optional)
- No sensitive data in logs
- Secure storage for tokens
- App Transport Security compliance

### Analytics (Optional)
- Search query analytics
- Feature usage tracking
- Crash reporting
- Performance monitoring

## Release Phases

### Phase 1: MVP (8-10 weeks)
- Authentication
- Basic search
- Results grid
- Item detail
- Core filters (date, keywords)

### Phase 2: Enhanced (4-6 weeks)
- Map integration
- Location hierarchy filter
- Saved searches
- Properties filter

### Phase 3: Polish (2-4 weeks)
- Offline support
- Performance optimization
- iPad optimization
- Accessibility audit

## Success Metrics

- App Store rating > 4.0
- Crash-free rate > 99%
- Search latency p95 < 3s
- User retention (7-day) > 40%

## Appendix

### Existing Web App Reference
- Repository: Analyst-Search
- Tech Stack: React, TypeScript, Vite
- Key Files:
  - `client/src/pages/search-results-page.tsx` - Main search UI
  - `client/src/features/search/voyager-api.ts` - API integration
  - `client/src/features/search/components/` - UI components
  - `server/routes.ts` - API proxy routes

### Voyager API Response Structure
```json
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
        "abstract": "Description...",
        "thumb": "thumbnail-url",
        "geo": { "type": "Polygon", "coordinates": [...] },
        "bbox": "-180,-90,180,90",
        "keywords": ["keyword1", "keyword2"],
        "modified": "2024-01-15T00:00:00Z",
        "bytes": 1234567
      }
    ]
  },
  "facet_counts": {
    "facet_fields": {
      "format": ["GeoTIFF", 100, "Shapefile", 50],
      "keywords": ["water", 200, "urban", 150]
    }
  }
}
```
