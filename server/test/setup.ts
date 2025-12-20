/**
 * @fileoverview Server test setup and utilities
 * @module server/test/setup
 */

import { vi } from 'vitest';
import express, { Express } from 'express';
import { createServer, Server } from 'http';

/**
 * Creates a test Express app with JSON middleware
 */
export function createTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  return app;
}

/**
 * Creates an HTTP server for testing
 */
export function createTestServer(app: Express): Server {
  return createServer(app);
}

/**
 * Mock fetch responses for Voyager API
 */
export function mockFetch(responses: Record<string, { ok: boolean; status?: number; json?: any; text?: string }>) {
  const mockFn = vi.fn().mockImplementation((url: string) => {
    // Find matching response by URL pattern
    for (const [pattern, response] of Object.entries(responses)) {
      if (url.includes(pattern)) {
        return Promise.resolve({
          ok: response.ok,
          status: response.status || (response.ok ? 200 : 500),
          statusText: response.ok ? 'OK' : 'Error',
          json: () => Promise.resolve(response.json || {}),
          text: () => Promise.resolve(response.text || JSON.stringify(response.json || {})),
        });
      }
    }
    // Default response
    return Promise.resolve({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve({}),
      text: () => Promise.resolve('{}'),
    });
  });

  // Replace global fetch
  vi.stubGlobal('fetch', mockFn);

  return mockFn;
}

/**
 * Reset all mocks after each test
 */
export function resetMocks() {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
}

/**
 * Sample saved search data for testing
 */
export const sampleSavedSearch = {
  id: 'test-search-1',
  userId: 'user-123',
  name: 'Test Search',
  keyword: 'satellite',
  location: 'California',
  locationIds: ['na', 'us', 'ca'],
  keywords: ['imagery', 'geospatial'],
  properties: ['has_thumbnail'],
  createdAt: new Date('2024-01-15T10:00:00Z'),
};

/**
 * Sample Voyager API response for saved searches
 */
export const voyagerSearchResponse = {
  response: {
    numFound: 1,
    start: 0,
    docs: [
      {
        id: 'test-search-1',
        owner: 'user-123',
        title: 'Test Search',
        keyword: 'satellite',
        location: 'California',
        locationIds: ['na', 'us', 'ca'],
        keywords: ['imagery', 'geospatial'],
        properties: ['has_thumbnail'],
        saved: '2024-01-15T10:00:00Z',
        param_fq: [
          'keyword:satellite',
          'location:California',
          'locationId:na',
          'locationId:us',
          'locationId:ca',
          'keywords:imagery',
          'keywords:geospatial',
        ],
      },
    ],
  },
};

/**
 * Sample Voyager search results for proxy tests
 */
export const voyagerProxySearchResponse = {
  response: {
    numFound: 100,
    start: 0,
    docs: [
      {
        id: 'item-1',
        title: 'Satellite Image 1',
        format: 'GeoTIFF',
        modified: '2024-01-10T00:00:00Z',
      },
      {
        id: 'item-2',
        title: 'Satellite Image 2',
        format: 'JPEG',
        modified: '2024-01-11T00:00:00Z',
      },
    ],
  },
  facet_counts: {
    facet_fields: {
      format: ['GeoTIFF', 50, 'JPEG', 30, 'PNG', 20],
    },
  },
};
