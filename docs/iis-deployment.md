# IIS Deployment Guide

This guide covers deploying Analyst-Search to IIS (Internet Information Services) as a static site with API proxy configuration.

## Overview

The `build:iis` command builds the React frontend as static files that can be served by IIS. Unlike the full-stack `build` command, this creates only the client-side assets without bundling the Express server.

### Build Commands Comparison

| Command | Output | Use Case |
|---------|--------|----------|
| `npm run build` | Full-stack (client + server) | Node.js hosting |
| `npm run build:iis` | Static files only | IIS / static hosting |

## Prerequisites

- Node.js 18+ (for building)
- IIS with URL Rewrite module installed
- Access to a Voyager API instance

## Build Process

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create `client/.env` with your Voyager API URL:

```bash
# Voyager/Navigo base URL for authentication
VITE_VOYAGER_BASE_URL=http://your-voyager-instance.com
```

This variable is embedded at build time into the client bundle.

### 3. Build Static Files

```bash
npm run build:iis
```

This runs `vite build` which:
- Compiles TypeScript and React code
- Bundles and minifies JavaScript
- Processes CSS with Tailwind
- Outputs to `dist/public/`

### Output Structure

```
dist/
└── public/
    ├── index.html          # Main HTML entry point
    ├── assets/
    │   ├── index-[hash].js    # Main JavaScript bundle
    │   ├── index-[hash].css   # Compiled CSS
    │   └── [other assets]     # Images, fonts, etc.
    └── [other static files]
```

## IIS Configuration

### 1. Create IIS Site

1. Open IIS Manager
2. Right-click **Sites** > **Add Website**
3. Configure:
   - **Site name**: `AnalystSearch`
   - **Physical path**: Point to `dist/public/` folder
   - **Binding**: Choose port (e.g., 80 or 443)

### 2. Configure URL Rewrite (SPA Routing)

Create `web.config` in the `dist/public/` folder:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <!-- Enable URL Rewrite for SPA routing -->
    <rewrite>
      <rules>
        <!-- API Proxy Rule -->
        <rule name="API Proxy" stopProcessing="true">
          <match url="^api/(.*)" />
          <action type="Rewrite" url="http://your-backend-server:5000/api/{R:1}" />
        </rule>

        <!-- SPA Fallback Rule -->
        <rule name="SPA Routes" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/index.html" />
        </rule>
      </rules>
    </rewrite>

    <!-- Static content caching -->
    <staticContent>
      <clientCache cacheControlMode="UseMaxAge" cacheControlMaxAge="30.00:00:00" />
      <mimeMap fileExtension=".json" mimeType="application/json" />
    </staticContent>

    <!-- Compression -->
    <httpCompression>
      <dynamicTypes>
        <add mimeType="application/json" enabled="true" />
      </dynamicTypes>
    </httpCompression>
  </system.webServer>
</configuration>
```

### 3. API Proxy Configuration

The frontend makes API calls to `/api/*` endpoints. You have two options:

#### Option A: Reverse Proxy to Express Backend

If running the Express server separately (e.g., on port 5000):

1. Install **Application Request Routing (ARR)** in IIS
2. Enable proxy in IIS: Server Farms > Create Farm > Add server
3. Use the `web.config` API proxy rule shown above

Update the proxy URL in `web.config`:
```xml
<action type="Rewrite" url="http://localhost:5000/api/{R:1}" />
```

#### Option B: Direct Voyager API Access

If the backend is not needed, configure the client to call Voyager directly by updating `VITE_VOYAGER_BASE_URL`.

## Port Configuration

### Development Ports

| Service | Port | Description |
|---------|------|-------------|
| Vite Dev Server | 3000 | Client development (`npm run dev:client`) |
| Express Server | 5000 | Backend API (`npm run dev`) |

### Production Ports

| Deployment | Port | Description |
|------------|------|-------------|
| IIS (HTTP) | 80 | Standard HTTP |
| IIS (HTTPS) | 443 | Secure HTTPS |
| Express Backend | 5000 | If running separately |

## Environment Variables

### Build-Time Variables (client/.env)

These are embedded into the JavaScript bundle during build:

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_VOYAGER_BASE_URL` | Yes | Voyager/Navigo base URL for authentication |

### Runtime Variables (server .env)

Only needed if running the Express backend:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 5000 | Server port |
| `VOYAGER_BASE_URL` | Yes | - | Voyager API base URL |
| `SESSION_SECRET` | Yes | - | Session encryption key |
| `NODE_ENV` | No | development | Environment mode |

## Voyager Configuration

The application behavior is controlled by `server/voyager-config.ts`. Key settings:

```typescript
export const voyagerConfig = {
  // Voyager Solr API endpoint
  baseUrl: "http://ec2-3-232-18-200.compute-1.amazonaws.com",

  // Solr display configuration ID
  displayId: "D187992491DF",

  // Filter visibility and behavior
  filters: {
    date: { enabled: true, ... },
    location: { enabled: false, ... },  // Hidden in UI
    keywords: { enabled: true, ... },
    properties: { enabled: true, ... },
  },

  pagination: {
    defaultPageSize: 48,
    maxPageSize: 100,
  },

  defaultSort: "score desc",
};
```

To modify filters or behavior:
1. Edit `server/voyager-config.ts`
2. Rebuild with `npm run build:iis`
3. Redeploy to IIS

## HTTPS Configuration

For production, always use HTTPS:

1. Obtain SSL certificate (Let's Encrypt, commercial, or self-signed for internal)
2. In IIS Manager, select site > **Bindings**
3. Add HTTPS binding (port 443) with certificate
4. Optionally add HTTP to HTTPS redirect rule in `web.config`:

```xml
<rule name="HTTPS Redirect" stopProcessing="true">
  <match url="(.*)" />
  <conditions>
    <add input="{HTTPS}" pattern="off" ignoreCase="true" />
  </conditions>
  <action type="Redirect" url="https://{HTTP_HOST}/{R:1}" redirectType="Permanent" />
</rule>
```

## Troubleshooting

### Common Issues

#### 1. Blank Page / 404 on Routes

**Cause**: URL Rewrite not configured for SPA routing.

**Fix**: Ensure `web.config` has the SPA fallback rule and URL Rewrite module is installed.

#### 2. API Calls Failing

**Cause**: API proxy not configured or backend not running.

**Fix**:
- Check `web.config` API proxy rule
- Verify backend server is running on configured port
- Check CORS settings if accessing different domain

#### 3. Authentication Not Working

**Cause**: `VITE_VOYAGER_BASE_URL` not set correctly during build.

**Fix**:
- Check `client/.env` has correct URL
- Rebuild with `npm run build:iis`
- Ensure Voyager/Navigo is accessible from client browser

#### 4. Static Assets Not Loading

**Cause**: Incorrect physical path or missing MIME types.

**Fix**:
- Verify IIS physical path points to `dist/public/`
- Add missing MIME types in `web.config` or IIS

### Verify Build Output

After building, check the output:

```bash
# List build output
dir dist\public

# Should contain:
# - index.html
# - assets/ folder with .js and .css files
```

### Check IIS Logs

IIS logs are typically at:
```
C:\inetpub\logs\LogFiles\W3SVC[SiteId]\
```

## Performance Optimization

### Enable Compression

In IIS Manager:
1. Select site
2. Open **Compression**
3. Enable both static and dynamic compression

### Enable Caching

The `web.config` above includes 30-day caching for static assets. Vite's content hashing ensures cache busting on updates.

### CDN Integration

For high-traffic deployments, consider serving static assets from a CDN:
1. Upload `dist/public/assets/` to CDN
2. Update `vite.config.ts` with `base` option pointing to CDN URL
3. Rebuild

## Deployment Checklist

- [ ] Node.js 18+ installed
- [ ] Dependencies installed (`npm install`)
- [ ] `client/.env` configured with `VITE_VOYAGER_BASE_URL`
- [ ] Build completed (`npm run build:iis`)
- [ ] IIS site created pointing to `dist/public/`
- [ ] URL Rewrite module installed
- [ ] `web.config` in place with SPA and API rules
- [ ] API proxy configured (if using Express backend)
- [ ] HTTPS configured (production)
- [ ] Test all routes work
- [ ] Test authentication flow
- [ ] Test search functionality
