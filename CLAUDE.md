# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Analyst-Search is a full-stack TypeScript application for searching and analyzing satellite imagery and geospatial data. It features a React frontend with Vite, Express backend, PostgreSQL database with Drizzle ORM, and integrates with an external Voyager search API.

## Development Commands

### Running the Application

**Development mode (concurrent client + server):**
```bash
npm run dev           # Unix/Mac
npm run dev:win       # Windows
```

**Client only (Vite dev server on port 5000):**
```bash
npm run dev:client        # Unix/Mac
npm run dev:client:win    # Windows
```

### Building & Production

```bash
npm run build    # Builds both client and server
npm start        # Runs production server
```

### Type Checking & Testing

```bash
npm run check      # TypeScript type checking
npm test           # Run tests in watch mode
npm run test:run   # Run tests once
```

### Database Operations

```bash
npm run db:push    # Push schema changes to PostgreSQL
```

## Architecture

### Monorepo Structure

```
project/
├── client/          # React frontend (Vite)
│   └── src/
│       ├── components/    # Reusable UI components (Radix UI + shadcn/ui)
│       ├── contexts/      # React contexts (AuthContext)
│       ├── features/      # Feature-based modules
│       │   └── search/    # Search feature
│       │       ├── api.ts           # API hooks (React Query)
│       │       ├── voyager-api.ts   # Voyager search integration
│       │       ├── components/      # Feature components
│       │       └── types.ts         # Feature types
│       ├── hooks/         # Custom React hooks
│       ├── lib/           # Utilities (queryClient, config, utils)
│       ├── pages/         # Route components
│       └── services/      # Business logic services
├── server/          # Express backend
│   ├── index.ts     # Server entry point
│   ├── routes.ts    # API route definitions
│   ├── storage.ts   # Database abstraction layer
│   └── db.ts        # Drizzle database connection
├── shared/          # Code shared between client and server
│   └── schema.ts    # Drizzle schema and Zod validators
└── docs/            # Documentation
```

### Path Aliases

TypeScript and Vite are configured with the following aliases:
- `@/*` → `client/src/*`
- `@shared/*` → `shared/*`
- `@assets/*` → `attached_assets/*`

Always use these aliases for imports to ensure consistency.

### State Management

**React Query (TanStack Query):**
- Global query client in `client/src/lib/queryClient.ts`
- Default config: no refetch, infinite staleTime, no retry
- Custom `apiRequest()` helper with `credentials: "include"` for session cookies
- Feature-specific API hooks in `features/*/api.ts`

**React Context:**
- `AuthContext` (`client/src/contexts/AuthContext.tsx`) manages authentication state
- Provides `user`, `isLoading`, `isAuthenticated`, `login()`, `logout()`, `refreshAuth()`
- Wraps app in `App.tsx` below QueryClientProvider

### Authentication Flow

**Popup-based authentication** with Navigo endpoints (configured via `VITE_VOYAGER_BASE_URL`):

1. **Login**: Opens popup to `${VITE_VOYAGER_BASE_URL}/navigo/login`
2. **Polling**: Checks popup closure every 500ms
3. **Auth Check**: Calls `${VITE_VOYAGER_BASE_URL}/api/rest/auth/info` with credentials
4. **State Update**: Updates AuthContext with user data

**Key files:**
- `client/src/services/authService.ts` - Core auth logic (login, getAuthInfo, logout)
- `client/src/contexts/AuthContext.tsx` - Auth state management
- `client/src/hooks/useAuth.ts` - Re-exports from AuthContext for backward compatibility

**Environment variable:**
- `VITE_VOYAGER_BASE_URL` - Base URL for Navigo authentication (required)

### Database Layer

**Drizzle ORM** with PostgreSQL:
- Schema defined in `shared/schema.ts` (tables: users, satelliteItems, relatedItems, provenanceEvents, savedSearches)
- Storage abstraction in `server/storage.ts` implements `IStorage` interface
- Zod validators auto-generated from schema using `drizzle-zod`

**Key patterns:**
- All database operations go through `storage` instance
- Use `createInsertSchema()` for validation
- Return types are inferred from schema (`$inferSelect`, `$inferInsert`)

### External API Integration

**Voyager Search API:**
- Base URL: `http://ec2-3-232-18-200.compute-1.amazonaws.com/solr/v0/select`
- Implemented in `client/src/features/search/voyager-api.ts`
- Uses `useInfiniteQuery` for pagination
- Complex faceting and filter building
- Transforms Voyager responses to app's SearchResult type

**Key patterns:**
- Build filter queries using helper functions (buildLocationFilterQueries, buildKeywordFilterQuery)
- Facet fields configured in FACET_FIELDS array
- Display names in FACET_DISPLAY_NAMES map

### UI Components

**Radix UI + shadcn/ui pattern:**
- Base components in `client/src/components/ui/`
- Always use existing components before creating new ones
- Tailwind CSS v4 for styling
- Dark theme with storage support via `ThemeProvider`

**Component hierarchy in App.tsx:**
```
ThemeProvider
  └─ QueryClientProvider
      └─ AuthProvider
          └─ TooltipProvider
              └─ Router (wouter)
```

### Routing

**Wouter** (lightweight React router):
- Routes defined in `client/src/App.tsx`
- Key routes:
  - `/` - LandingPage
  - `/search` - SearchResultsPage
  - `/item/:id` - ItemDetailPage
  - `/voyager` - VoyagerSearchPage

Use `useLocation()` for navigation, `useSearch()` for query params.

### Feature Organization

Features are organized by domain in `client/src/features/`:
- Each feature has its own `api.ts` for React Query hooks
- Component files in `components/` subdirectory
- Types in `types.ts`
- Feature-specific utilities as needed

**Example (search feature):**
```
features/search/
├── api.ts              # useSaveSearch, useSavedSearches, etc.
├── voyager-api.ts      # Voyager API integration
├── components/         # SearchFilters, SearchResultsList, SearchMap
├── types.ts            # SearchResult, VoyagerSearchResult, etc.
└── mock-data.ts        # Dev data
```

## Key Technical Patterns

### API Requests

All API requests use `credentials: "include"` for cookie-based session management:

```typescript
fetch(url, {
  credentials: "include",
  // ...other options
});
```

This is critical for Navigo authentication to work correctly.

### Error Handling

- React Query hooks handle errors automatically
- Use `toast` from Sonner for user-facing error messages
- Console.error for debug logging
- API errors are thrown from `apiRequest()` helper

### Type Safety

- Shared types in `shared/schema.ts` ensure type consistency between client and server
- Zod schemas for runtime validation
- TypeScript strict mode enabled

### Development Notes

**Windows-specific commands:**
- Use `dev:win`, `dev:client:win` scripts on Windows
- Scripts use `SET` instead of inline environment variables

**Environment variables:**
- Server: `DATABASE_URL`, `SESSION_SECRET`, `PORT`
- Client: `VITE_VOYAGER_BASE_URL` (required for auth)
- Set in `.env` (root) and `client/.env` (client-specific)

**Styling conventions:**
- Keep existing component styling when modifying
- Use Tailwind utility classes
- Dark mode support via `dark:` prefix
- Preserve data-testid attributes for testing

## Important Constraints

1. **Authentication**: The app now uses Navigo popup-based authentication. Do not revert to Replit OIDC patterns.

2. **Backward Compatibility**: The `useAuth()` hook interface must remain stable as it's used throughout the application.

3. **Feature Isolation**: Keep feature-specific code in `features/` directories. Don't pollute global scope.

4. **Database Migrations**: Use `drizzle-kit push` carefully in development. Production migrations should be planned.

5. **Voyager API**: This is an external service. Do not modify Voyager-specific configuration without understanding impact.
