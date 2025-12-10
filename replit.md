# Voyager Geospatial Search

## Overview

Voyager is a next-generation geospatial search interface for discovering, analyzing, and acquiring satellite imagery and Earth observation data. The application enables users to search using natural language, draw spatial boundaries on interactive maps, and explore satellite imagery with detailed metadata, lineage tracking, and provenance information.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

- **Framework**: React 18 with TypeScript, bundled using Vite
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state and caching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS v4 with custom theme variables supporting light/dark modes
- **Mapping**: Leaflet with React-Leaflet for interactive geospatial visualization
- **Animations**: Framer Motion for UI transitions

The frontend follows a feature-based organization pattern where search-related components, API hooks, and types are grouped under `client/src/features/search/`.

### Backend Architecture

- **Runtime**: Node.js with Express
- **Language**: TypeScript with ES modules
- **API Design**: RESTful endpoints under `/api/` prefix
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Session Management**: Express sessions with PostgreSQL store (connect-pg-simple)

The server uses a storage abstraction layer (`server/storage.ts`) that implements database operations, making it easier to swap storage implementations if needed.

### Data Model

Core entities defined in `shared/schema.ts`:
- **Users**: Basic authentication with username/password
- **Satellite Items**: Imagery records with geospatial bounds, metadata, bands, keywords, and properties
- **Related Items**: Relationships between satellite items (derived from, co-located, etc.)
- **Provenance Events**: Timeline tracking of data lifecycle (ingestion, processing, archival)
- **Saved Searches**: User-saved query configurations with notification preferences

The schema uses JSONB for flexible metadata storage and text arrays for tags, keywords, and spectral bands.

### Key Design Decisions

1. **Unified Search with Intent Detection**: The search bar parses natural language to distinguish between keywords (e.g., "vegetation") and locations (e.g., "California"), providing visual feedback through badges.

2. **Map-Centric Interface**: The application tightly couples list results with an interactive map, allowing users to draw bounding boxes, points, or polygons for spatial filtering.

3. **Shared Schema**: Types and validation schemas are defined once in `shared/schema.ts` using Drizzle and Zod, ensuring consistency between frontend and backend.

4. **Theme System**: Custom CSS variables enable seamless light/dark mode switching with geospatial-appropriate color palettes.

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, connection via `DATABASE_URL` environment variable
- **Drizzle Kit**: Database migrations and schema management

### Frontend Libraries
- **Leaflet**: Open-source mapping library for interactive map components
- **React-Leaflet**: React bindings for Leaflet
- **Radix UI**: Accessible, unstyled component primitives
- **TanStack Query**: Data fetching and caching

### Build Tools
- **Vite**: Development server and production bundler
- **esbuild**: Server-side bundling for production
- **TypeScript**: Type checking across the entire codebase

### Fonts
- **Inter**: Primary sans-serif font for body text
- **Space Grotesk**: Display font for headings (loaded via Google Fonts)