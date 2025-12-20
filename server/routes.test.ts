/**
 * @fileoverview API route tests
 * @module server/routes.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';
import { createServer, Server } from 'http';

// Mock the storage module before importing routes
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
import { storage } from './storage';

// Sample test data
const sampleSavedSearch = {
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

describe('API Routes', () => {
  let app: Express;
  let httpServer: Server;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    httpServer = createServer(app);
    await registerRoutes(httpServer, app);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/config', () => {
    it('should return application configuration', async () => {
      const response = await request(app).get('/api/config');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('filters');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body).toHaveProperty('defaultSort');
      expect(response.body.filters.date).toHaveProperty('enabled', true);
      expect(response.body.pagination).toHaveProperty('defaultPageSize', 20);
    });
  });

  describe('GET /api/saved-searches', () => {
    it('should return empty array when no userId provided', async () => {
      const response = await request(app).get('/api/saved-searches');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
      expect(storage.getSavedSearches).not.toHaveBeenCalled();
    });

    it('should return saved searches for a user', async () => {
      const mockSearches = [sampleSavedSearch];
      vi.mocked(storage.getSavedSearches).mockResolvedValue(mockSearches);

      const response = await request(app)
        .get('/api/saved-searches')
        .query({ userId: 'user-123' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe('Test Search');
      expect(storage.getSavedSearches).toHaveBeenCalledWith('user-123', undefined);
    });

    it('should forward cookies to storage layer', async () => {
      vi.mocked(storage.getSavedSearches).mockResolvedValue([]);

      await request(app)
        .get('/api/saved-searches')
        .query({ userId: 'user-123' })
        .set('Cookie', 'session=abc123');

      expect(storage.getSavedSearches).toHaveBeenCalledWith('user-123', 'session=abc123');
    });

    it('should return 500 on storage error', async () => {
      vi.mocked(storage.getSavedSearches).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/saved-searches')
        .query({ userId: 'user-123' });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Failed to fetch saved searches');
    });
  });

  describe('POST /api/saved-searches', () => {
    const validSearchData = {
      userId: 'user-123',
      name: 'New Search',
      keyword: 'satellite',
      location: 'Texas',
    };

    it('should create a saved search with valid data', async () => {
      const createdSearch = { ...sampleSavedSearch, ...validSearchData, id: 'new-id' };
      vi.mocked(storage.createSavedSearch).mockResolvedValue(createdSearch);

      const response = await request(app)
        .post('/api/saved-searches')
        .send(validSearchData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('New Search');
      expect(storage.createSavedSearch).toHaveBeenCalled();
    });

    it('should return 400 for invalid data (missing required fields)', async () => {
      const response = await request(app)
        .post('/api/saved-searches')
        .send({ keyword: 'test' }); // Missing userId and name

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should forward cookies to storage layer', async () => {
      vi.mocked(storage.createSavedSearch).mockResolvedValue(sampleSavedSearch);

      await request(app)
        .post('/api/saved-searches')
        .set('Cookie', 'session=abc123')
        .send(validSearchData);

      expect(storage.createSavedSearch).toHaveBeenCalledWith(
        expect.any(Object),
        'session=abc123'
      );
    });

    it('should return 500 on storage error', async () => {
      vi.mocked(storage.createSavedSearch).mockRejectedValue(new Error('Storage error'));

      const response = await request(app)
        .post('/api/saved-searches')
        .send(validSearchData);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/saved-searches/:id', () => {
    it('should return a saved search by ID', async () => {
      vi.mocked(storage.getSavedSearch).mockResolvedValue(sampleSavedSearch);

      const response = await request(app).get('/api/saved-searches/test-search-1');

      expect(response.status).toBe(200);
      expect(response.body.id).toBe('test-search-1');
      expect(response.body.name).toBe('Test Search');
      expect(storage.getSavedSearch).toHaveBeenCalledWith('test-search-1', undefined);
    });

    it('should return 404 when search not found', async () => {
      vi.mocked(storage.getSavedSearch).mockResolvedValue(undefined);

      const response = await request(app).get('/api/saved-searches/non-existent');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Saved search not found');
    });

    it('should forward cookies to storage layer', async () => {
      vi.mocked(storage.getSavedSearch).mockResolvedValue(sampleSavedSearch);

      await request(app)
        .get('/api/saved-searches/test-search-1')
        .set('Cookie', 'session=abc123');

      expect(storage.getSavedSearch).toHaveBeenCalledWith('test-search-1', 'session=abc123');
    });

    it('should return 500 on storage error', async () => {
      vi.mocked(storage.getSavedSearch).mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/api/saved-searches/test-search-1');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Failed to fetch saved search');
    });
  });

  describe('DELETE /api/saved-searches/:id', () => {
    it('should delete a saved search', async () => {
      vi.mocked(storage.deleteSavedSearch).mockResolvedValue();

      const response = await request(app).delete('/api/saved-searches/test-search-1');

      expect(response.status).toBe(204);
      expect(storage.deleteSavedSearch).toHaveBeenCalledWith('test-search-1', undefined);
    });

    it('should forward cookies to storage layer', async () => {
      vi.mocked(storage.deleteSavedSearch).mockResolvedValue();

      await request(app)
        .delete('/api/saved-searches/test-search-1')
        .set('Cookie', 'session=abc123');

      expect(storage.deleteSavedSearch).toHaveBeenCalledWith('test-search-1', 'session=abc123');
    });

    it('should return 500 on storage error', async () => {
      vi.mocked(storage.deleteSavedSearch).mockRejectedValue(new Error('Database error'));

      const response = await request(app).delete('/api/saved-searches/test-search-1');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Failed to delete saved search');
    });
  });
});
