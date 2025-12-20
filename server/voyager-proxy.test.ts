/**
 * @fileoverview Voyager proxy endpoint tests
 * @module server/voyager-proxy.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';
import { createServer, Server } from 'http';

// Mock the storage module
vi.mock('./storage', () => ({
  storage: {
    getSavedSearches: vi.fn(),
    getSavedSearch: vi.fn(),
    createSavedSearch: vi.fn(),
    deleteSavedSearch: vi.fn(),
  },
}));

// Mock voyager-config
vi.mock('./voyager-config', () => ({
  voyagerConfig: {
    baseUrl: 'http://mock-voyager.local',
    filters: {
      date: {
        enabled: true,
        defaultMode: 'range',
        defaultSinceValue: 7,
        defaultSinceUnit: 'days',
        fields: {
          available: ['modified', 'created'],
          defaultField: 'modified',
        },
      },
    },
    pagination: {
      defaultPageSize: 20,
      maxPageSize: 100,
    },
    defaultSort: 'score desc',
  },
}));

import { registerRoutes } from './routes';

// Sample Voyager API response
const voyagerSearchResponse = {
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
};

const voyagerFacetsResponse = {
  response: {
    numFound: 100,
    start: 0,
    docs: [],
  },
  facet_counts: {
    facet_fields: {
      format: ['GeoTIFF', 50, 'JPEG', 30, 'PNG', 20],
      grp_Country: ['United States', 40, 'Canada', 20],
    },
  },
};

describe('Voyager Proxy Endpoints', () => {
  let app: Express;
  let httpServer: Server;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    httpServer = createServer(app);
    await registerRoutes(httpServer, app);

    // Mock global fetch
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('GET /api/voyager/search', () => {
    it('should proxy search requests to Voyager API', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(voyagerSearchResponse),
      });

      const response = await request(app)
        .get('/api/voyager/search')
        .query({ q: '*:*', rows: 10 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('response');
      expect(response.body.response.numFound).toBe(100);
      expect(response.body.response.docs).toHaveLength(2);

      // Verify fetch was called with correct URL
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('mock-voyager.local/solr/v0/select')
      );
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('q=*%3A*')
      );
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('rows=10')
      );
    });

    it('should handle multiple filter query (fq) parameters', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(voyagerSearchResponse),
      });

      const response = await request(app)
        .get('/api/voyager/search')
        .query({
          q: '*:*',
          fq: ['format:GeoTIFF', 'grp_Country:"United States"'],
        });

      expect(response.status).toBe(200);

      // Verify multiple fq parameters are passed
      const callUrl = fetchMock.mock.calls[0][0];
      expect(callUrl).toContain('fq=format%3AGeoTIFF');
      expect(callUrl).toContain('fq=grp_Country');
    });

    it('should return 500 when Voyager API fails', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
      });

      const response = await request(app)
        .get('/api/voyager/search')
        .query({ q: '*:*' });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Failed to fetch from Voyager API');
    });

    it('should return 500 when fetch throws an error', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'));

      const response = await request(app)
        .get('/api/voyager/search')
        .query({ q: '*:*' });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Failed to fetch from Voyager API');
    });

    it('should handle sort parameter', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(voyagerSearchResponse),
      });

      await request(app)
        .get('/api/voyager/search')
        .query({ q: '*:*', sort: 'modified desc' });

      const callUrl = fetchMock.mock.calls[0][0];
      expect(callUrl).toContain('sort=modified+desc');
    });

    it('should handle pagination parameters', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(voyagerSearchResponse),
      });

      await request(app)
        .get('/api/voyager/search')
        .query({ q: '*:*', start: 20, rows: 10 });

      const callUrl = fetchMock.mock.calls[0][0];
      expect(callUrl).toContain('start=20');
      expect(callUrl).toContain('rows=10');
    });
  });

  describe('POST /api/voyager/search', () => {
    it('should proxy POST search requests to Voyager API', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(voyagerSearchResponse),
      });

      const response = await request(app)
        .post('/api/voyager/search')
        .send({ q: '*:*', rows: 10 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('response');
      expect(response.body.response.numFound).toBe(100);
    });

    it('should handle array parameters in POST body', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(voyagerSearchResponse),
      });

      await request(app)
        .post('/api/voyager/search')
        .send({
          q: '*:*',
          fq: ['format:GeoTIFF', 'has_spatial:true'],
        });

      const callUrl = fetchMock.mock.calls[0][0];
      expect(callUrl).toContain('fq=format%3AGeoTIFF');
      expect(callUrl).toContain('fq=has_spatial%3Atrue');
    });

    it('should return 500 when Voyager API fails', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const response = await request(app)
        .post('/api/voyager/search')
        .send({ q: '*:*' });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Failed to fetch from Voyager API');
    });
  });

  describe('GET /api/voyager/facets', () => {
    it('should proxy facet requests to Voyager API', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(voyagerFacetsResponse),
      });

      const response = await request(app)
        .get('/api/voyager/facets')
        .query({
          q: '*:*',
          facet: 'true',
          'facet.field': ['format', 'grp_Country'],
          rows: 0,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('facet_counts');
      expect(response.body.facet_counts.facet_fields).toHaveProperty('format');
      expect(response.body.facet_counts.facet_fields).toHaveProperty('grp_Country');
    });

    it('should handle multiple facet.field parameters', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(voyagerFacetsResponse),
      });

      await request(app)
        .get('/api/voyager/facets')
        .query({
          q: '*:*',
          facet: 'true',
          'facet.field': ['format', 'grp_Country', 'keywords'],
        });

      const callUrl = fetchMock.mock.calls[0][0];
      expect(callUrl).toContain('facet.field=format');
      expect(callUrl).toContain('facet.field=grp_Country');
      expect(callUrl).toContain('facet.field=keywords');
    });

    it('should return 500 when Voyager API fails', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
      });

      const response = await request(app)
        .get('/api/voyager/facets')
        .query({ q: '*:*', facet: 'true' });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Failed to fetch facets from Voyager API');
    });
  });

  describe('POST /api/voyager/facets', () => {
    it('should proxy POST facet requests to Voyager API', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(voyagerFacetsResponse),
      });

      const response = await request(app)
        .post('/api/voyager/facets')
        .send({
          q: '*:*',
          facet: true,
          'facet.field': ['format'],
          rows: 0,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('facet_counts');
    });

    it('should return 500 when Voyager API fails', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const response = await request(app)
        .post('/api/voyager/facets')
        .send({ q: '*:*', facet: true });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Failed to fetch facets from Voyager API');
    });
  });
});
