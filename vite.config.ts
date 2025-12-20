import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig(({ mode }) => {
  // Load env from client folder to get VITE_BASE_PATH
  const clientDir = path.resolve(import.meta.dirname, "client");
  const env = loadEnv(mode, clientDir, "");

  return {
    // Set base path for deployment under a context path (e.g., /analyst-search/)
    // Use VITE_BASE_PATH env var or default to root
    base: env.VITE_BASE_PATH || "/",
    plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  css: {
    postcss: {
      plugins: [],
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    proxy: {
      "/api": {
        target: "http://172.22.1.25:5000",
        changeOrigin: true,
      },
    },
  },
  };
});
