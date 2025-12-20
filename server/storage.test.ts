/**
 * @fileoverview Storage layer tests
 * @module server/storage.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VoyagerStorage } from './storage';

// Mock voyager-config
vi.mock('./voyager-config', () => ({
  voyagerConfig: {
    baseUrl: 'http://mock-voyager.local',
  },
}));

// Sample Voyager API responses
const voyagerSearchListResponse = {
  response: {
    numFound: 2,
    start: 0,
    docs: [
      {
        id: 'search-1',
        owner: 'user-123',
        title: 'Test Search 1',
        keyword: 'satellite',
        location: 'California',
        saved: '2024-01-15T10:00:00Z',
      },
      {
        id: 'search-2',
        owner: 'user-123',
        title: 'Test Search 2',
        keyword: 'imagery',
        location: 'Texas',
        saved: '2024-01-16T10:00:00Z',
      },
    ],
  },
};

const voyagerSearchDetailResponse = {
  response: {
    numFound: 1,
    start: 0,
    docs: [
      {
        id: 'search-1',
        owner: 'user-123',
        title: 'Test Search 1',
        param_fq: [
          'keyword:satellite',
          'location:California',
          'locationId:na',
          'locationId:us',
          'keywords:imagery',
          'properties:has_thumbnail',
        ],
        saved: '2024-01-15T10:00:00Z',
      },
    ],
  },
};

const voyagerCreateResponse = {
  display: 'new-search-123',
};

describe('VoyagerStorage', () => {
  let storage: VoyagerStorage;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    storage = new VoyagerStorage();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('getSavedSearches', () => {
    it('should return empty array when no userId provided', async () => {
      const result = await storage.getSavedSearches();
      expect(result).toEqual([]);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should return empty array when userId is undefined', async () => {
      const result = await storage.getSavedSearches(undefined);
      expect(result).toEqual([]);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should fetch saved searches from Voyager API', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(voyagerSearchListResponse),
      });

      const result = await storage.getSavedSearches('user-123');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('search-1');
      expect(result[0].name).toBe('Test Search 1');
      expect(result[0].userId).toBe('user-123');

      // Verify correct URL was called
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/solr/ssearch/select'),
        expect.any(Object)
      );
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('owner%3Auser-123'),
        expect.any(Object)
      );
    });

    it('should forward cookies in request headers', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(voyagerSearchListResponse),
      });

      await storage.getSavedSearches('user-123', 'session=abc123');

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Cookie: 'session=abc123',
          }),
        })
      );
    });

    it('should return empty array on API error', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve('Server error'),
      });

      const result = await storage.getSavedSearches('user-123');
      expect(result).toEqual([]);
    });

    it('should return empty array on network error', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'));

      const result = await storage.getSavedSearches('user-123');
      expect(result).toEqual([]);
    });

    it('should handle empty response', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ response: { numFound: 0, docs: [] } }),
      });

      const result = await storage.getSavedSearches('user-123');
      expect(result).toEqual([]);
    });
  });

  describe('getSavedSearch', () => {
    it('should fetch a single saved search by ID', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(voyagerSearchDetailResponse),
      });

      const result = await storage.getSavedSearch('search-1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('search-1');
      expect(result?.name).toBe('Test Search 1');
      expect(result?.keyword).toBe('satellite');
      expect(result?.location).toBe('California');
      expect(result?.locationIds).toEqual(['na', 'us']);
      expect(result?.keywords).toEqual(['imagery']);
      expect(result?.properties).toEqual(['has_thumbnail']);
    });

    it('should forward cookies in request headers', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(voyagerSearchDetailResponse),
      });

      await storage.getSavedSearch('search-1', 'session=abc123');

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Cookie: 'session=abc123',
          }),
        })
      );
    });

    it('should return undefined when search not found', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ response: { numFound: 0, docs: [] } }),
      });

      const result = await storage.getSavedSearch('non-existent');
      expect(result).toBeUndefined();
    });

    it('should return undefined on API error', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: () => Promise.resolve('Not found'),
      });

      const result = await storage.getSavedSearch('search-1');
      expect(result).toBeUndefined();
    });

    it('should return undefined on network error', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'));

      const result = await storage.getSavedSearch('search-1');
      expect(result).toBeUndefined();
    });
  });

  describe('createSavedSearch', () => {
    const newSearch = {
      userId: 'user-123',
      name: 'New Search',
      keyword: 'satellite',
      location: 'California',
      locationIds: ['na', 'us'],
      keywords: ['imagery'],
      properties: ['has_thumbnail'],
    };

    it('should create a saved search via Voyager API', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 201,
        json: () => Promise.resolve(voyagerCreateResponse),
      });

      const result = await storage.createSavedSearch(newSearch);

      expect(result).toBeDefined();
      expect(result.id).toBe('new-search-123');
      expect(result.name).toBe('New Search');
      expect(result.keyword).toBe('satellite');

      // Verify POST request was made
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/rest/display/ssearch'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: expect.any(String),
        })
      );
    });

    it('should forward cookies in request headers', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 201,
        json: () => Promise.resolve(voyagerCreateResponse),
      });

      await storage.createSavedSearch(newSearch, 'session=abc123');

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Cookie: 'session=abc123',
          }),
        })
      );
    });

    it('should include all search parameters in request body', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 201,
        json: () => Promise.resolve(voyagerCreateResponse),
      });

      await storage.createSavedSearch(newSearch);

      const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(requestBody.title).toBe('New Search');
      expect(requestBody.keyword).toBe('satellite');
      expect(requestBody.location).toBe('California');
      expect(requestBody.locationIds).toEqual(['na', 'us']);
      expect(requestBody.keywords).toEqual(['imagery']);
    });

    it('should throw error on API failure', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: () => Promise.resolve('Invalid request'),
      });

      await expect(storage.createSavedSearch(newSearch)).rejects.toThrow();
    });

    it('should throw error with message for duplicate name', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 409,
        statusText: 'Conflict',
        text: () => Promise.resolve('Search already exists'),
      });

      await expect(storage.createSavedSearch(newSearch)).rejects.toThrow();
    });

    it('should handle date fields correctly', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 201,
        json: () => Promise.resolve(voyagerCreateResponse),
      });

      const searchWithDates = {
        ...newSearch,
        dateFrom: new Date('2024-01-01'),
        dateTo: new Date('2024-06-30'),
      };

      await storage.createSavedSearch(searchWithDates);

      const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(requestBody.dateFrom).toContain('2024-01-01');
      expect(requestBody.dateTo).toContain('2024-06-30');
    });
  });

  describe('deleteSavedSearch', () => {
    it('should delete a saved search via Voyager API', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 204,
      });

      await expect(storage.deleteSavedSearch('search-1')).resolves.not.toThrow();

      // Verify DELETE request was made
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/rest/display/ssearch/search-1'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    it('should forward cookies in request headers', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 204,
      });

      await storage.deleteSavedSearch('search-1', 'session=abc123');

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Cookie: 'session=abc123',
          }),
        })
      );
    });

    it('should throw error on API failure', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: () => Promise.resolve('Search not found'),
      });

      await expect(storage.deleteSavedSearch('non-existent')).rejects.toThrow();
    });

    it('should throw error on network failure', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'));

      await expect(storage.deleteSavedSearch('search-1')).rejects.toThrow('Network error');
    });
  });
});
