import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Get base path - read from client/.env file manually to avoid dotenv dependency
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

  // Serve static files under the base path
  if (basePath) {
    app.use(basePath, express.static(distPath));

    // Redirect root to base path
    app.get("/", (_req, res) => {
      res.redirect(302, basePath);
    });

    // SPA fallback for routes under base path
    app.get(basePath, (_req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
    app.get(`${basePath}/*`, (_req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  } else {
    app.use(express.static(distPath));

    // fall through to index.html if the file doesn't exist
    app.use("*", (_req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }
}
