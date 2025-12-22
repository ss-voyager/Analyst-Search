import { type Express } from "express";
import { createServer as createViteServer, createLogger, loadEnv } from "vite";
import { type Server } from "http";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export async function setupVite(server: Server, app: Express) {
  const clientDir = path.resolve(import.meta.dirname, "..", "client");
  const env = loadEnv("development", clientDir, "");

  // Get base path from client env (e.g., "/analyst-search/")
  const basePath = env.VITE_BASE_PATH?.replace(/\/$/, '') || '';

  const serverOptions = {
    middlewareMode: true,
    hmr: { server, path: `${basePath}/vite-hmr` },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    configFile: path.resolve(import.meta.dirname, "..", "vite.config.ts"),
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  // Handle SPA fallback for routes under the base path
  const spaHandler = async (req: any, res: any, next: any) => {
    const url = req.originalUrl;

    // Skip API routes - they should be handled by Express routes
    if (url.includes("/api")) {
      return next();
    }

    // Skip Vite's special paths and source files - let Vite middleware handle them
    const vitePatterns = ['/@', '/src/', '/node_modules/', '.tsx', '.ts', '.js', '.css', '.json', '.png', '.jpg', '.svg', '.woff', '.woff2', '/vite-hmr'];
    if (vitePatterns.some(pattern => url.includes(pattern))) {
      return next();
    }

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  };

  if (basePath) {
    // Redirect root to base path
    app.get("/", (_req, res) => {
      res.redirect(302, basePath);
    });

    // Handle all routes under the base path as SPA
    // These must be registered BEFORE Vite middlewares
    app.get(basePath, spaHandler);
    app.get(`${basePath}/*`, spaHandler);
  }

  // Mount Vite middlewares AFTER SPA routes so they handle asset requests
  // Vite's base config handles the URL prefixing in transformed HTML
  app.use(vite.middlewares);

  // Fallback for root when no base path configured
  if (!basePath) {
    app.use("*", spaHandler);
  }
}
