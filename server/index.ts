import express, { type Request, Response, NextFunction } from "express";
import swaggerUi from "swagger-ui-express";
import path from "path";
import fs from "fs";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { swaggerSpec } from "./swagger";

const app = express();
const httpServer = createServer(app);

// Load base path from client env (e.g., "/analyst-search")
// Read manually to avoid Vite dependency in production
let basePath = process.env.VITE_BASE_PATH?.replace(/\/$/, '') || '';
if (!basePath) {
  const clientEnvPath = path.resolve(__dirname, "..", "client", ".env");
  if (fs.existsSync(clientEnvPath)) {
    const envContent = fs.readFileSync(clientEnvPath, "utf-8");
    const match = envContent.match(/VITE_BASE_PATH=(.+)/);
    if (match) {
      basePath = match[1].trim().replace(/\/$/, '');
    }
  }
}

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

// Swagger API documentation
const swaggerSetup = swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "Analyst Search API Documentation",
});

app.use("/api/docs", swaggerUi.serve, swaggerSetup);
if (basePath) {
  app.use(`${basePath}/api/docs`, swaggerUi.serve, swaggerSetup);
}

// Serve OpenAPI spec as JSON
const serveOpenApiSpec = (_req: Request, res: Response) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
};
app.get("/api/docs.json", serveOpenApiSpec);
if (basePath) {
  app.get(`${basePath}/api/docs.json`, serveOpenApiSpec);
}

/**
 * Logs a message with timestamp and source label
 * @param message - The message to log
 * @param source - The source of the log message (default: "express")
 */
export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    // Log API requests from both /api and basePath/api
    if (path.includes("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app, basePath);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();
