# Windows Deployment Guide

This guide covers deploying Analyst-Search on Windows Server with Node.js, including automatic startup on reboot and IIS reverse proxy configuration.

## Overview

There are two main deployment approaches:

| Approach | Description | Best For |
|----------|-------------|----------|
| **Node.js + IIS Reverse Proxy** | Run Node.js as a Windows service, IIS proxies requests | Production, existing IIS infrastructure |
| **Standalone Node.js** | Run Node.js directly without IIS | Development, simple deployments |

## Prerequisites

- Windows Server 2016+ or Windows 10/11
- Node.js 18+ installed and in system PATH
- (Optional) IIS with URL Rewrite and ARR modules

## Build Commands

### Production Build

```cmd
npm run build
```

This creates:
- `dist/index.cjs` - Bundled Express server
- `dist/public/` - Static frontend assets

### Build Output Structure

```
dist/
├── index.cjs           # Bundled Express server (single file)
├── public/             # Static frontend assets
│   ├── index.html
│   └── assets/
│       ├── index-[hash].js
│       └── index-[hash].css
└── config/             # Runtime configuration (if using build:iis-full)
    └── voyager.json
```

## Environment Configuration

### Required Files

**Root `.env`** (server configuration):
```env
PORT=3000
VOYAGER_BASE_URL=http://your-voyager-server:8888
SESSION_SECRET=your-secret-key-change-in-production
```

**`client/.env`** (client configuration - embedded at build time):
```env
VITE_VOYAGER_BASE_URL=http://your-voyager-server:8888
VITE_BASE_PATH=/analyst-search
```

### Environment Variables Reference

| Variable | Location | Required | Description |
|----------|----------|----------|-------------|
| `PORT` | Root .env | No | Server port (default: 5000) |
| `VOYAGER_BASE_URL` | Root .env | Yes | Voyager API URL for server |
| `SESSION_SECRET` | Root .env | Yes | Session encryption key |
| `VITE_VOYAGER_BASE_URL` | client/.env | Yes | Voyager URL for client auth |
| `VITE_BASE_PATH` | client/.env | No | URL base path (e.g., `/analyst-search`) |

---

## Option 1: Standalone Node.js Deployment

### Running the Application

```cmd
:: Set environment variables and run
set PORT=3000 && node dist/index.cjs
```

Or with all variables:

```cmd
set PORT=3000 && set NODE_ENV=production && node dist/index.cjs
```

### Verify It's Running

```cmd
:: Check if port is in use
netstat -ano | findstr :3000

:: Test the application
curl http://localhost:3000
```

### Stop the Application

```cmd
:: Find and kill process on port 3000
for /f "tokens=5" %a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do taskkill /F /PID %a
```

---

## Option 2: Auto-Start with NSSM (Windows Service)

NSSM (Non-Sucking Service Manager) is the recommended way to run Node.js as a Windows service.

### Install NSSM

1. Download from https://nssm.cc/download
2. Extract to `C:\nssm\` (or add to PATH)

### Create the Service

```cmd
:: Open NSSM service installer GUI
C:\nssm\nssm.exe install AnalystSearch
```

Configure in the GUI:
- **Path**: `C:\Program Files\nodejs\node.exe`
- **Startup directory**: `C:\path\to\analyst-search`
- **Arguments**: `dist/index.cjs`

Or use command line:

```cmd
:: Install service via command line
C:\nssm\nssm.exe install AnalystSearch "C:\Program Files\nodejs\node.exe" "dist/index.cjs"
C:\nssm\nssm.exe set AnalystSearch AppDirectory "C:\path\to\analyst-search"
C:\nssm\nssm.exe set AnalystSearch AppEnvironmentExtra "PORT=3000" "NODE_ENV=production"
C:\nssm\nssm.exe set AnalystSearch DisplayName "Analyst Search Application"
C:\nssm\nssm.exe set AnalystSearch Description "Analyst Search web application"
C:\nssm\nssm.exe set AnalystSearch Start SERVICE_AUTO_START
```

### Configure Logging

```cmd
:: Set up log files for stdout and stderr
C:\nssm\nssm.exe set AnalystSearch AppStdout "C:\path\to\analyst-search\logs\service.log"
C:\nssm\nssm.exe set AnalystSearch AppStderr "C:\path\to\analyst-search\logs\error.log"
C:\nssm\nssm.exe set AnalystSearch AppRotateFiles 1
C:\nssm\nssm.exe set AnalystSearch AppRotateBytes 1048576
```

### Manage the Service

```cmd
:: Start the service
C:\nssm\nssm.exe start AnalystSearch

:: Stop the service
C:\nssm\nssm.exe stop AnalystSearch

:: Restart the service
C:\nssm\nssm.exe restart AnalystSearch

:: Check service status
C:\nssm\nssm.exe status AnalystSearch

:: Edit service configuration
C:\nssm\nssm.exe edit AnalystSearch

:: Remove the service
C:\nssm\nssm.exe remove AnalystSearch confirm
```

### Using Windows Service Control

Once installed, you can also use standard Windows commands:

```cmd
:: Start/stop via sc command
sc start AnalystSearch
sc stop AnalystSearch

:: Or via net command
net start AnalystSearch
net stop AnalystSearch

:: Check status
sc query AnalystSearch
```

---

## Option 3: Auto-Start with PM2

PM2 is a Node.js process manager with built-in Windows service support.

### Install PM2

```cmd
npm install -g pm2
npm install -g pm2-windows-startup
```

### Start the Application

```cmd
:: Navigate to project directory
cd C:\path\to\analyst-search

:: Start with PM2
pm2 start dist/index.cjs --name analyst-search

:: Set environment variables
pm2 start dist/index.cjs --name analyst-search -- --env production
```

Or create an ecosystem file `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'analyst-search',
    script: 'dist/index.cjs',
    cwd: 'C:\\path\\to\\analyst-search',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
};
```

Then start with:

```cmd
pm2 start ecosystem.config.js
```

### Configure Auto-Start on Boot

```cmd
:: Save current process list
pm2 save

:: Install Windows startup script
pm2-startup install
```

### PM2 Management Commands

```cmd
:: List all processes
pm2 list

:: View logs
pm2 logs analyst-search

:: Monitor processes
pm2 monit

:: Restart application
pm2 restart analyst-search

:: Stop application
pm2 stop analyst-search

:: Delete from PM2
pm2 delete analyst-search
```

---

## Option 4: IIS with URL Rewrite (Reverse Proxy)

Use IIS as a reverse proxy to forward requests to the Node.js application.

### Prerequisites

1. **IIS installed** with:
   - URL Rewrite Module ([download](https://www.iis.net/downloads/microsoft/url-rewrite))
   - Application Request Routing (ARR) ([download](https://www.iis.net/downloads/microsoft/application-request-routing))

2. **Node.js running** as a service (via NSSM or PM2) on port 3000

### Enable ARR Proxy

1. Open **IIS Manager**
2. Select the server node (top level)
3. Double-click **Application Request Routing Cache**
4. Click **Server Proxy Settings** in the Actions pane
5. Check **Enable proxy**
6. Click **Apply**

### Create IIS Site

1. Open **IIS Manager**
2. Right-click **Sites** > **Add Website**
3. Configure:
   - **Site name**: `AnalystSearch`
   - **Physical path**: `C:\inetpub\analyst-search` (can be empty folder)
   - **Binding**: Port 80 or 443 (with SSL certificate)

### Configure URL Rewrite Rules

Create `web.config` in the site's physical path:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <!-- Reverse Proxy to Node.js -->
        <rule name="ReverseProxyToNode" stopProcessing="true">
          <match url="(.*)" />
          <action type="Rewrite" url="http://localhost:3000/{R:1}" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
```

### URL Rewrite for Context Path

If running under a context path (e.g., `/analyst-search`), create a Virtual Application:

1. Right-click your site > **Add Application**
2. **Alias**: `analyst-search`
3. **Physical path**: `C:\inetpub\analyst-search`

Update `web.config`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <!-- Proxy /analyst-search/* to Node.js -->
        <rule name="AnalystSearchProxy" stopProcessing="true">
          <match url="(.*)" />
          <action type="Rewrite" url="http://localhost:3000/analyst-search/{R:1}" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
```

### URL Rewrite Rule Explanation

| Component | Value | Description |
|-----------|-------|-------------|
| `match url` | `(.*)` | Matches any URL path |
| `{R:1}` | Captured group | The matched URL path |
| `action type` | `Rewrite` | Internally rewrites (not redirect) |
| `stopProcessing` | `true` | Stop processing further rules |

### Add HTTPS Redirect (Optional)

```xml
<rule name="HTTPS Redirect" stopProcessing="true">
  <match url="(.*)" />
  <conditions>
    <add input="{HTTPS}" pattern="off" ignoreCase="true" />
  </conditions>
  <action type="Redirect" url="https://{HTTP_HOST}/{R:1}" redirectType="Permanent" />
</rule>
```

### Preserve Host Headers

To pass the original host header to Node.js:

1. In IIS Manager, select server node
2. Open **Application Request Routing Cache**
3. Click **Server Proxy Settings**
4. Check **Preserve client host header in request**

### Complete web.config Example

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <!-- HTTPS Redirect -->
        <rule name="HTTPS Redirect" stopProcessing="true">
          <match url="(.*)" />
          <conditions>
            <add input="{HTTPS}" pattern="off" ignoreCase="true" />
          </conditions>
          <action type="Redirect" url="https://{HTTP_HOST}/{R:1}" redirectType="Permanent" />
        </rule>

        <!-- Reverse Proxy to Node.js -->
        <rule name="ReverseProxyToNode" stopProcessing="true">
          <match url="(.*)" />
          <action type="Rewrite" url="http://localhost:3000/{R:1}" />
        </rule>
      </rules>
    </rewrite>

    <!-- Disable caching for dynamic content -->
    <caching enabled="false" />
  </system.webServer>
</configuration>
```

---

## Troubleshooting

### Port Already in Use

```cmd
:: Find process using port 3000
netstat -ano | findstr :3000

:: Kill by PID (replace 12345 with actual PID)
taskkill /F /PID 12345
```

### Node.js Not Found

Ensure Node.js is in the system PATH:

```cmd
:: Check Node.js installation
node --version

:: If not found, add to PATH or use full path
"C:\Program Files\nodejs\node.exe" dist/index.cjs
```

### Service Won't Start

Check logs:
- NSSM: Check configured log files
- PM2: `pm2 logs analyst-search`
- Event Viewer: Windows Logs > Application

Common issues:
- Missing environment variables
- Port already in use
- Incorrect working directory

### IIS 502 Bad Gateway

- Verify Node.js is running: `netstat -ano | findstr :3000`
- Check ARR is enabled
- Verify URL Rewrite rule syntax
- Check IIS Application Pool is running

### IIS 500 Error

- Check `web.config` syntax
- Enable Failed Request Tracing in IIS
- Check Event Viewer for details

---

## Deployment Checklist

### Initial Setup

- [ ] Node.js 18+ installed
- [ ] Project files deployed to server
- [ ] `npm install` completed
- [ ] `.env` files configured (root and client)
- [ ] `npm run build` successful

### Service Configuration

- [ ] NSSM or PM2 installed
- [ ] Service created and configured
- [ ] Environment variables set in service
- [ ] Log files configured
- [ ] Service set to auto-start

### IIS Configuration (if using)

- [ ] URL Rewrite module installed
- [ ] ARR module installed and proxy enabled
- [ ] IIS site or virtual application created
- [ ] `web.config` in place
- [ ] SSL certificate configured (production)

### Verification

- [ ] Service starts successfully
- [ ] Application accessible on configured port
- [ ] IIS proxy working (if configured)
- [ ] Authentication flow works
- [ ] Search functionality works
- [ ] Logs are being written

### Post-Deployment

- [ ] Test server reboot - service auto-starts
- [ ] Monitor logs for errors
- [ ] Set up log rotation
- [ ] Configure firewall rules as needed
