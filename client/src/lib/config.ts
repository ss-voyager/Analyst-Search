/**
 * @fileoverview Configuration utilities for API endpoints
 * @module client/lib/config
 */

/**
 * Retrieves the Voyager API base URL from environment variables
 *
 * @returns The Voyager base URL without trailing slash
 * @throws Error if VITE_VOYAGER_BASE_URL environment variable is not set
 *
 * @example
 * ```typescript
 * const baseUrl = getVoyagerBaseUrl();
 * // Returns: "http://example.com/voyager"
 * ```
 */
export function getVoyagerBaseUrl(): string {
  const baseUrl = import.meta.env.VITE_VOYAGER_BASE_URL;
  if (!baseUrl) {
    throw new Error('VITE_VOYAGER_BASE_URL environment variable is not set');
  }
  // Ensure no trailing slash
  return baseUrl.replace(/\/$/, '');
}

/**
 * Retrieves the Gazetteer API base URL from environment variables
 *
 * @returns The Gazetteer base URL (defaults to internal IP if not set)
 *
 * @example
 * ```typescript
 * const baseUrl = getGazetteerBaseUrl();
 * // Returns: "http://172.22.1.25:8888" (default) or custom value
 * ```
 */
export function getGazetteerBaseUrl(): string {
  return import.meta.env.VITE_GAZETTEER_BASE_URL || 'http://172.22.1.25:8888';
}
