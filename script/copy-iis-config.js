/**
 * Copies IIS configuration files to the dist folder for full IIS deployment.
 *
 * This script is run after the main build to prepare the dist folder
 * for deployment with HttpPlatformHandler.
 *
 * Usage: node script/copy-iis-config.js
 */

import { copyFile, mkdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const distDir = join(rootDir, "dist");
const iisDir = join(rootDir, "iis");
const configDir = join(rootDir, "config");

async function copyIISConfig() {
  console.log("Copying IIS configuration files...");

  // Copy web.config to dist/
  await copyFile(join(iisDir, "web.config"), join(distDir, "web.config"));
  console.log("  ✓ web.config");

  // Copy env.example to dist/
  await copyFile(join(iisDir, "env.example"), join(distDir, "env.example"));
  console.log("  ✓ env.example");

  // Create logs directory for HttpPlatformHandler stdout/stderr
  await mkdir(join(distDir, "logs"), { recursive: true });
  console.log("  ✓ logs/ directory created");

  // Copy config folder to dist/
  await mkdir(join(distDir, "config"), { recursive: true });

  // Copy voyager.json if it exists, otherwise copy example
  const voyagerConfigPath = join(configDir, "voyager.json");
  const voyagerExamplePath = join(configDir, "voyager.example.json");

  if (fs.existsSync(voyagerConfigPath)) {
    await copyFile(voyagerConfigPath, join(distDir, "config", "voyager.json"));
    console.log("  ✓ config/voyager.json");
  } else if (fs.existsSync(voyagerExamplePath)) {
    await copyFile(voyagerExamplePath, join(distDir, "config", "voyager.json"));
    console.log("  ✓ config/voyager.json (copied from example)");
  }

  // Always copy example for reference
  if (fs.existsSync(voyagerExamplePath)) {
    await copyFile(voyagerExamplePath, join(distDir, "config", "voyager.example.json"));
    console.log("  ✓ config/voyager.example.json");
  }

  console.log("\nIIS configuration complete!");
  console.log("\nNext steps:");
  console.log("  1. Deploy the dist/ folder to your IIS site");
  console.log("  2. Edit dist/config/voyager.json with your Voyager settings");
  console.log("  3. Ensure logs/ has write permissions for IIS AppPool identity");
  console.log("  4. Start the IIS site");
}

copyIISConfig().catch((err) => {
  console.error("Error copying IIS config:", err);
  process.exit(1);
});
