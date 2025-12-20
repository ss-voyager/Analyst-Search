# IIS Deployment Guide

This guide covers deploying Analyst-Search to IIS (Internet Information Services) as a static site with API proxy configuration.

## Overview

The `build:iis` command builds the React frontend as static files that can be served by IIS. Unlike the full-stack `build` command, this creates only the client-side assets without bundling the Express server.

### Build Commands Comparison

| Command | Output | Use Case |
|---------|--------|----------|
| `npm run build` | Full-stack (client + server) | Node.js hosting |
| `npm run build:iis` | Static files only | IIS / static hosting (frontend only) |
| `npm run build:iis-full` | Full-stack for IIS | IIS with HttpPlatformHandler (full app) |

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
| `NODE_ENV` | No | development | Environment mode |

## Voyager Configuration

The application behavior is controlled by `config/voyager.json`, which is loaded at runtime. This means you can change settings without rebuilding the application.

### Configuration File Location

- **Development**: `config/voyager.json` in the project root
- **Production (IIS)**: `dist/config/voyager.json` in the deployment folder

### Configuration Options

```json
{
  "baseUrl": "http://your-voyager-instance.com",
  "displayId": "YOUR_DISPLAY_ID",
  "filters": {
    "date": { "enabled": true, "defaultMode": "range" },
    "location": { "enabled": false },
    "keywords": { "enabled": true, "showSearch": true },
    "properties": { "enabled": true }
  },
  "pagination": {
    "defaultPageSize": 48,
    "maxPageSize": 100
  },
  "defaultSort": "score desc"
}
```

### Key Settings

| Setting | Description |
|---------|-------------|
| `baseUrl` | Voyager Solr API endpoint (server-side only) |
| `displayId` | Solr display configuration ID |
| `filters.*.enabled` | Show/hide filter in UI |
| `pagination.defaultPageSize` | Results per page |

### Modifying Configuration

**For full IIS deployment (HttpPlatformHandler):**
1. Edit `dist/config/voyager.json`
2. Restart the IIS application or site

**For frontend-only deployment:**
1. Edit `config/voyager.json` in source
2. Rebuild with `npm run build:iis`
3. Redeploy to IIS

The JSON file only needs to specify values that differ from defaults. Unspecified values use sensible defaults defined in `server/voyager-config.ts`.

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

## Deployment Checklist (Frontend Only)

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

---

## Full IIS Deployment with HttpPlatformHandler

This section covers running the **entire application** (React frontend + Express backend) inside IIS using HttpPlatformHandler. This eliminates the need for a separate Node.js process.

### What is HttpPlatformHandler?

HttpPlatformHandler is a native IIS module that:
1. Receives HTTP requests on standard ports (80/443)
2. Launches and manages a Node.js process
3. Passes a dynamic port via the `HTTP_PLATFORM_PORT` environment variable
4. Proxies requests to the Node.js process internally

**Benefits over iisnode:**
- Works with any Node.js version
- Microsoft-supported and actively maintained
- Simpler configuration
- Standard stdout/stderr logging

### Prerequisites (Full Deployment)

- Node.js 18+ installed on the server (must be in system PATH)
- IIS with HttpPlatformHandler module installed
  - Install via Web Platform Installer, or
  - Install via IIS > Server Manager > Add Roles and Features
- Access to a Voyager API instance

### Build Process (Full Deployment)

#### 1. Configure Environment Variables

Create `client/.env`:
```bash
VITE_VOYAGER_BASE_URL=http://your-voyager-instance.com
```

Create or edit `config/voyager.json` with your Voyager API settings:
```json
{
  "baseUrl": "http://your-voyager-instance.com",
  "displayId": "YOUR_DISPLAY_ID"
}
```

#### 2. Build Full Application

```bash
npm run build:iis-full
```

This command:
1. Runs the full build (client + server bundled to `dist/index.cjs`)
2. Copies `iis/web.config` to `dist/`
3. Copies `iis/env.example` to `dist/`
4. Copies `config/voyager.json` to `dist/config/`
5. Creates `dist/logs/` directory for HttpPlatformHandler logging

#### 3. Output Structure

```
dist/
├── index.cjs           # Bundled Express server
├── web.config          # HttpPlatformHandler configuration
├── env.example         # Environment variable template
├── config/
│   ├── voyager.json         # Runtime configuration (edit this!)
│   └── voyager.example.json # Configuration template
├── logs/               # Stdout/stderr logs (auto-created)
└── public/             # Static frontend assets
    ├── index.html
    └── assets/
        ├── index-[hash].js
        └── index-[hash].css
```

### IIS Configuration (Full Deployment)

#### 1. Deploy Files

Copy the entire `dist/` folder to your IIS site directory (e.g., `C:\inetpub\analyst-search\`).

#### 2. Create IIS Site

1. Open IIS Manager
2. Right-click **Sites** > **Add Website**
3. Configure:
   - **Site name**: `AnalystSearch`
   - **Physical path**: Point to `dist/` folder (NOT `dist/public/`)
   - **Binding**: Choose port (80 or 443)

#### 3. Set Permissions

The IIS Application Pool identity needs:
- **Read** access to the site directory
- **Write** access to the `logs/` directory

```powershell
# Grant IIS_IUSRS write access to logs
icacls "C:\inetpub\analyst-search\logs" /grant "IIS_IUSRS:(OI)(CI)M"
```

#### 4. Verify Node.js Path

Ensure `node` is in the system PATH, or update `web.config`:

```xml
<httpPlatform processPath="C:\Program Files\nodejs\node.exe" ...>
```

### Troubleshooting (Full Deployment)

#### 1. Site Returns 502 Bad Gateway

**Cause**: Node.js process failed to start or crashed.

**Fix**:
- Check `dist/logs/node.log` for errors
- Verify Node.js is in system PATH
- Check `startupTimeLimit` in web.config (increase if needed)

#### 2. Site Times Out on First Request

**Cause**: Node.js taking too long to start.

**Fix**: Increase `startupTimeLimit` in web.config:
```xml
<httpPlatform startupTimeLimit="120" ...>
```

#### 3. Static Assets Not Loading

**Cause**: Requests going to Node.js instead of static files.

**Fix**: The Express server serves static files from `public/`. Ensure the built assets are in `dist/public/`.

#### 4. Environment Variables Not Working

**Cause**: Variables not visible to IIS worker process.

**Fix**:
- Use system environment variables (not user variables)
- Restart IIS after changing variables: `iisreset`
- Verify with `echo %VOYAGER_BASE_URL%` in cmd as SYSTEM

### Viewing Logs

HttpPlatformHandler logs stdout/stderr to the `logs/` directory:

```
dist/logs/
├── node.log           # Stdout output
└── node_error.log     # Stderr output (if errors occur)
```

Logs are helpful for debugging startup issues and runtime errors.

### Deployment Checklist (Full IIS)

- [ ] Node.js 18+ installed and in system PATH
- [ ] HttpPlatformHandler module installed in IIS
- [ ] Dependencies installed (`npm install`)
- [ ] `client/.env` configured with `VITE_VOYAGER_BASE_URL`
- [ ] `config/voyager.json` configured with Voyager API URL
- [ ] Build completed (`npm run build:iis-full`)
- [ ] `dist/` folder deployed to IIS site directory
- [ ] `dist/config/voyager.json` edited with production Voyager settings
- [ ] IIS site created pointing to `dist/` folder
- [ ] `logs/` directory has write permissions for IIS AppPool
- [ ] HTTPS configured (production)
- [ ] Verify site starts: check `logs/node.log`
- [ ] Test all routes work
- [ ] Test authentication flow
- [ ] Test search functionality

---

## Virtual Application Deployment (Context Path)

If you need to run this application under a context path (e.g., `https://yourserver.com/analyst-search/`) alongside other applications on ports 80/443, deploy it as an IIS Virtual Application.

### How Virtual Applications Work

```
IIS Site (port 80/443)
├── / (root site or another app)
├── /analyst-search/ → Virtual Application (this app)
└── /other-app/ → Another Virtual Application
```

IIS routes requests based on the URL path prefix and strips the context path before forwarding to the application.

### Build for Virtual Application

#### 1. Configure Context Path

Set the base path in `client/.env` **before building**:

```bash
# client/.env
VITE_VOYAGER_BASE_URL=http://your-voyager-instance.com
VITE_BASE_PATH=/analyst-search/
```

**Important**: The trailing slash is required.

#### 2. Build the Application

```bash
npm run build:iis-full
```

The build will embed the base path into all asset URLs (JS, CSS, images).

#### 3. Verify Build Output

Check that `dist/public/index.html` references assets with the correct path:

```html
<!-- Should show /analyst-search/assets/... not just /assets/... -->
<script src="/analyst-search/assets/index-[hash].js"></script>
```

### IIS Configuration (Virtual Application)

#### 1. Create Virtual Application

1. Open IIS Manager
2. Expand your existing site (e.g., "Default Web Site")
3. Right-click the site > **Add Application**
4. Configure:
   - **Alias**: `analyst-search` (matches VITE_BASE_PATH without slashes)
   - **Physical path**: Point to the `dist/` folder
   - **Application pool**: Select or create an appropriate pool

#### 2. Application Pool Settings

The virtual application can use a dedicated or shared application pool:

**Dedicated pool (recommended)**:
1. Application Pools > Add Application Pool
2. Name: `AnalystSearchPool`
3. .NET CLR version: No Managed Code
4. Managed pipeline mode: Integrated

**Shared pool**:
- Use the parent site's pool if appropriate

#### 3. Set Permissions

```powershell
# Grant IIS_IUSRS access to the application directory
icacls "C:\path\to\dist" /grant "IIS_IUSRS:(OI)(CI)RX"
icacls "C:\path\to\dist\logs" /grant "IIS_IUSRS:(OI)(CI)M"
```

### Troubleshooting (Virtual Application)

#### 1. Assets Return 404

**Cause**: Base path not set during build.

**Fix**:
- Verify `VITE_BASE_PATH` was set in `client/.env` before building
- Check `dist/public/index.html` for correct asset paths
- Rebuild with `npm run build:iis-full`

#### 2. API Calls Fail

**Cause**: API routes not including context path.

**Fix**: The Express server handles this automatically. Verify that:
- The application is properly configured as a Virtual Application (not a Virtual Directory)
- HttpPlatformHandler is processing requests

#### 3. SPA Routes Return 404

**Cause**: Fallback to index.html not working.

**Fix**: Ensure the application is configured as a Virtual Application, not a Virtual Directory. Virtual Applications run their own web.config.

#### 4. Authentication Popup Fails

**Cause**: Voyager URL mismatch.

**Fix**: Ensure `VITE_VOYAGER_BASE_URL` is accessible from user browsers and allows the context path origin.

### Deployment Checklist (Virtual Application)

- [ ] `VITE_BASE_PATH` set in `client/.env` (e.g., `/analyst-search/`)
- [ ] `VITE_VOYAGER_BASE_URL` set in `client/.env`
- [ ] `config/voyager.json` configured with Voyager API URL
- [ ] Build completed (`npm run build:iis-full`)
- [ ] Verified asset paths in `dist/public/index.html`
- [ ] `dist/config/voyager.json` edited with production Voyager settings
- [ ] Virtual Application created in IIS (not Virtual Directory)
- [ ] Application pool configured (No Managed Code, Integrated)
- [ ] Physical path points to `dist/` folder
- [ ] `logs/` directory has write permissions
- [ ] Verify site starts: `https://yourserver.com/analyst-search/`
- [ ] Test all routes work with context path
- [ ] Test authentication flow
- [ ] Test search functionality
