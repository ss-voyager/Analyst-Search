# Analyst-Search

A full-stack TypeScript application for searching and analyzing satellite imagery and geospatial data. Features a React frontend with Vite, Express backend, and integrates with the Voyager search API for all data operations.

## Table of Contents

- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Development](#development)
- [API Documentation](#api-documentation)
- [Architecture](#architecture)
- [Configuration](#configuration)
- [Testing](#testing)
- [Deployment](#deployment)

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Access to Voyager API instance

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd Analyst-Search

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Voyager API URL and configuration

# Start development server
npm run dev        # Unix/Mac
npm run dev:win    # Windows
```

The application will be available at:
- **Frontend**: http://localhost:5000
- **API**: http://localhost:5000/api
- **API Docs**: http://localhost:5000/api/docs

## Project Structure

```
Analyst-Search/
├── client/                 # React frontend (Vite)
│   └── src/
│       ├── components/     # Reusable UI components (shadcn/ui)
│       ├── contexts/       # React contexts (AuthContext)
│       ├── features/       # Feature-based modules
│       │   └── search/     # Search feature
│       │       ├── api.ts              # React Query hooks
│       │       ├── voyager-api.ts      # Voyager API integration
│       │       ├── location-hierarchy.ts # Location tree utilities
│       │       ├── types.ts            # Feature types
│       │       └── components/         # Feature components
│       ├── hooks/          # Custom React hooks
│       ├── lib/            # Utilities (queryClient, config)
│       ├── pages/          # Route components
│       └── services/       # Business logic (authService)
├── server/                 # Express backend
│   ├── index.ts            # Server entry point
│   ├── routes.ts           # API route definitions
│   ├── storage.ts          # Voyager API abstraction layer
│   ├── swagger.ts          # OpenAPI configuration
│   └── voyager-config.ts   # Voyager API configuration
├── shared/                 # Shared code (client & server)
│   └── schema.ts           # TypeScript interfaces + Zod validators
└── docs/                   # Additional documentation
```

## Development

### Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (concurrent client + server) |
| `npm run dev:win` | Start development server (Windows) |
| `npm run dev:client` | Start client only (Vite dev server) |
| `npm run build` | Build for production (client + server) |
| `npm run build:iis` | Build client only for IIS deployment |
| `npm start` | Run production server |
| `npm run check` | TypeScript type checking |
| `npm test` | Run tests in watch mode |
| `npm run test:run` | Run tests once |

### Path Aliases

TypeScript and Vite are configured with the following aliases:

```typescript
import { Button } from "@/components/ui/button";    // client/src/
import { schema } from "@shared/schema";            // shared/
import image from "@assets/image.png";              // attached_assets/
```

## API Documentation

### Interactive Documentation

Swagger UI is available at `/api/docs` when the server is running.

### OpenAPI Spec

The OpenAPI JSON spec is available at `/api/docs.json`.

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/saved-searches` | Get user's saved searches |
| POST | `/api/saved-searches` | Create a saved search |
| GET | `/api/saved-searches/:id` | Get saved search by ID |
| DELETE | `/api/saved-searches/:id` | Delete a saved search |
| GET | `/api/voyager/search` | Proxy to Voyager search API |
| GET | `/api/voyager/facets` | Get facet counts from Voyager |

## Architecture

### Frontend

- **React 18** with TypeScript
- **Vite** for development and bundling
- **TanStack Query (React Query)** for server state management
- **Wouter** for client-side routing
- **Radix UI + shadcn/ui** for accessible components
- **Tailwind CSS v4** for styling
- **Leaflet** for interactive maps

### Backend

- **Express** REST API
- **Voyager API** for all data operations
- **swagger-jsdoc** for API documentation

### State Management

```
┌─────────────────────────────────────────────────────────┐
│                    QueryClientProvider                   │
│  ┌───────────────────────────────────────────────────┐  │
│  │                   AuthProvider                     │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │              TooltipProvider                │  │  │
│  │  │  ┌───────────────────────────────────────┐  │  │  │
│  │  │  │           Router (wouter)             │  │  │  │
│  │  │  │                                       │  │  │  │
│  │  │  │    Pages use useQuery/useMutation     │  │  │  │
│  │  │  │    for data fetching                  │  │  │  │
│  │  │  └───────────────────────────────────────┘  │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Action → React Component → React Query Hook → API Request
                                                         ↓
                                              Express Route Handler
                                                         ↓
                                              Storage Layer
                                                         ↓
                                                  Voyager API
```

### Authentication Flow

The application uses popup-based authentication with Navigo:

1. User clicks "Login"
2. Popup opens to Navigo login page
3. User authenticates
4. Popup closes, parent window polls for auth status
5. Auth context updates with user data

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```bash
# Voyager API Base URL (required)
VOYAGER_BASE_URL=http://your-voyager-instance.com

# Session
SESSION_SECRET=your-secret-key

# Server
PORT=5000
```

Client-specific variables go in `client/.env`:

```bash
# Voyager/Navigo base URL for authentication
VITE_VOYAGER_BASE_URL=http://your-voyager-instance.com
```

### Voyager Configuration

The Voyager API configuration is centralized in `server/voyager-config.ts`:

```typescript
export const voyagerConfig = {
  baseUrl: process.env.VOYAGER_BASE_URL,
  locationFilter: {
    enabled: true,
    gazetteerUrl: "/api/rest/gazetteer/search",
    // ...
  },
  // ...
};
```

## Testing

### Running Tests

```bash
# Run all tests once
npm run test:run

# Run tests in watch mode
npm test

# Run tests with coverage
npm run test:run -- --coverage
```

### Test Structure

Tests are co-located with their source files:

```
features/search/
├── voyager-api.ts
├── voyager-api.test.ts
├── location-hierarchy.ts
├── location-hierarchy.test.ts
└── ...
```

### Test Utilities

- **Vitest** - Test runner
- **@testing-library/react** - React component testing
- **msw** (optional) - API mocking

## Deployment

### Node.js Deployment

```bash
# Build client and server
npm run build

# Start production server
npm start
```

The server runs on port 5000 by default (configurable via `PORT` env var).

### IIS Deployment

For deploying to IIS as a static site:

```bash
# Build client only
npm run build:iis
```

This outputs static files to `dist/public/` which can be served by IIS.

**Key steps:**
1. Configure `client/.env` with `VITE_VOYAGER_BASE_URL`
2. Run `npm run build:iis`
3. Create IIS site pointing to `dist/public/`
4. Configure URL Rewrite for SPA routing
5. Set up API proxy to backend (if needed)

See [IIS Deployment Guide](docs/iis-deployment.md) for detailed instructions.

### Ports

| Environment | Port | Description |
|-------------|------|-------------|
| Development (client) | 3000 | Vite dev server |
| Development (server) | 5000 | Express API |
| Production (Node.js) | 5000 | Full-stack server |
| Production (IIS) | 80/443 | Static files + API proxy |

### Environment Considerations

- Set `NODE_ENV=production`
- Configure `VOYAGER_BASE_URL` for your Voyager instance
- Set secure `SESSION_SECRET`
- Configure proper CORS if needed

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`npm run test:run`)
5. Run type checking (`npm run check`)
6. Commit your changes
7. Push to the branch
8. Open a Pull Request

## License

MIT License - see LICENSE file for details.
