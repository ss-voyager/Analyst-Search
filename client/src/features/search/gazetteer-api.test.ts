import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildGazetteerUrl, queryGazetteer } from './gazetteer-api';

// Mock the config module
vi.mock('@/lib/config', () => ({
  getGazetteerBaseUrl: () => 'http://172.22.1.25:8888',
}));

describe('buildGazetteerUrl', () => {
  it('should throw error when no location names provided', () => {
    expect(() => buildGazetteerUrl([])).toThrow('At least one location name is required');
  });

  it('should build correct URL for single location', () => {
    const url = buildGazetteerUrl(['United States']);

    expect(url).toContain('http://172.22.1.25:8888/solr/gazetteer/select');
    expect(url).toContain('q=name%3A%22United%20States%22');
    expect(url).toContain('fl=geo%3A%5Bgeo%5D%2C+name');
    expect(url).toContain('wt=json');
  });

  it('should build correct URL for multiple locations with OR', () => {
    const url = buildGazetteerUrl(['United States', 'Canada', 'Mexico']);

    expect(url).toContain('http://172.22.1.25:8888/solr/gazetteer/select');
    expect(url).toContain('name%3A%22United%20States%22');
    expect(url).toContain('name%3A%22Canada%22');
    expect(url).toContain('name%3A%22Mexico%22');
    expect(url).toContain('%7C%7C'); // URL encoded '||'
  });

  it('should properly encode special characters in location names', () => {
    const url = buildGazetteerUrl(['São Paulo', 'Zürich']);

    expect(url).toContain('S%C3%A3o%20Paulo');
    expect(url).toContain('Z%C3%BCrich');
  });
});

describe('queryGazetteer', () => {
  beforeEach(() => {
    // Reset fetch mock before each test
    global.fetch = vi.fn();
  });

  it('should return empty array when no location names provided', async () => {
    const results = await queryGazetteer([]);
    expect(results).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should successfully fetch and parse gazetteer results', async () => {
    const mockResponse = {
      response: {
        docs: [
          {
            name: 'United States',
            geo: {
              type: 'MultiPolygon',
              coordinates: [
                [
                  [
                    [-125.0, 24.5],
                    [-125.0, 49.4],
                    [-66.9, 49.4],
                    [-66.9, 24.5],
                    [-125.0, 24.5],
                  ],
                ],
              ],
            },
          },
        ],
      },
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const results = await queryGazetteer(['United States']);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      name: 'United States',
      geo: mockResponse.response.docs[0].geo,
    });
  });

  it('should filter out results without geo data', async () => {
    const mockResponse = {
      response: {
        docs: [
          {
            name: 'United States',
            geo: {
              type: 'MultiPolygon',
              coordinates: [[[[0, 0]]]],
            },
          },
          {
            name: 'Canada',
            geo: null, // Missing geo
          },
          {
            name: 'Mexico',
            // Missing geo field entirely
          },
        ],
      },
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const results = await queryGazetteer(['United States', 'Canada', 'Mexico']);

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('United States');
  });

  it('should return empty array on fetch error', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const results = await queryGazetteer(['United States']);

    expect(results).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it('should return empty array on network error', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const results = await queryGazetteer(['United States']);

    expect(results).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Gazetteer query error:', expect.any(Error));

    consoleErrorSpy.mockRestore();
  });

  it('should handle multiple locations in single request', async () => {
    const mockResponse = {
      response: {
        docs: [
          {
            name: 'United States',
            geo: { type: 'MultiPolygon', coordinates: [[[[0, 0]]]] },
          },
          {
            name: 'Canada',
            geo: { type: 'MultiPolygon', coordinates: [[[[1, 1]]]] },
          },
        ],
      },
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const results = await queryGazetteer(['United States', 'Canada']);

    expect(results).toHaveLength(2);
    expect(results[0].name).toBe('United States');
    expect(results[1].name).toBe('Canada');
  });
});
