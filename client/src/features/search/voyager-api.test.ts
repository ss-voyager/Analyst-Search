import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  parseFacetFields,
  buildFilterQuery,
  buildDateRangeQuery,
  buildKeywordFilterQuery,
  buildPropertyFilterQueries,
  buildLocationFilterQueries,
  toSearchResultFromVoyager,
  FACET_DISPLAY_NAMES,
  DEFAULT_THUMBNAIL,
  VoyagerDoc,
} from './voyager-api';

describe('voyager-api', () => {
  describe('parseFacetFields', () => {
    it('should return empty array for empty input', () => {
      const result = parseFacetFields({});
      expect(result).toEqual([]);
    });

    it('should parse facet fields with name-count pairs', () => {
      const facetFields = {
        format: ['GeoTIFF', 10, 'Shapefile', 5, 'JPEG', 3],
      };

      const result = parseFacetFields(facetFields);

      expect(result).toHaveLength(1);
      expect(result[0].field).toBe('format');
      expect(result[0].displayName).toBe('Format');
      expect(result[0].values).toEqual([
        { name: 'GeoTIFF', count: 10 },
        { name: 'Shapefile', count: 5 },
        { name: 'JPEG', count: 3 },
      ]);
    });

    it('should use display name from FACET_DISPLAY_NAMES', () => {
      const facetFields = {
        grp_Country: ['USA', 100],
        grp_Agency: ['NASA', 50],
      };

      const result = parseFacetFields(facetFields);

      expect(result.find(c => c.field === 'grp_Country')?.displayName).toBe('Country');
      expect(result.find(c => c.field === 'grp_Agency')?.displayName).toBe('Agency');
    });

    it('should skip empty facet fields', () => {
      const facetFields = {
        format: [],
        grp_Country: ['USA', 100],
      };

      const result = parseFacetFields(facetFields);

      expect(result).toHaveLength(1);
      expect(result[0].field).toBe('grp_Country');
    });

    it('should handle fields not in display names map', () => {
      const facetFields = {
        unknown_field: ['value1', 10],
      };

      // Since unknown_field is not in FACET_FIELDS, it won't be processed
      const result = parseFacetFields(facetFields);
      expect(result).toEqual([]);
    });

    it('should skip incomplete pairs', () => {
      const facetFields = {
        format: ['GeoTIFF', 10, 'Shapefile'], // Missing count for Shapefile
      };

      const result = parseFacetFields(facetFields);

      expect(result[0].values).toHaveLength(1);
      expect(result[0].values[0]).toEqual({ name: 'GeoTIFF', count: 10 });
    });

    it('should order results by FACET_FIELDS order', () => {
      const facetFields = {
        keywords: ['climate', 5],
        format: ['GeoTIFF', 10],
        grp_Country: ['USA', 100],
      };

      const result = parseFacetFields(facetFields);

      // grp_Country comes before keywords in FACET_FIELDS
      const countryIndex = result.findIndex(c => c.field === 'grp_Country');
      const keywordsIndex = result.findIndex(c => c.field === 'keywords');
      expect(countryIndex).toBeLessThan(keywordsIndex);
    });
  });

  describe('buildFilterQuery', () => {
    it('should return null for empty values array', () => {
      expect(buildFilterQuery('format', [])).toBeNull();
    });

    it('should return null for undefined values', () => {
      expect(buildFilterQuery('format', undefined as any)).toBeNull();
    });

    it('should build query for single value', () => {
      const result = buildFilterQuery('format', ['GeoTIFF']);
      expect(result).toBe('{!tag=format}format:("GeoTIFF")');
    });

    it('should build OR query for multiple values', () => {
      const result = buildFilterQuery('format', ['GeoTIFF', 'Shapefile']);
      expect(result).toBe('{!tag=format}format:("GeoTIFF" OR "Shapefile")');
    });

    it('should escape quotes in values', () => {
      const result = buildFilterQuery('title', ['Test "quoted" value']);
      expect(result).toBe('{!tag=title}title:("Test \\"quoted\\" value")');
    });

    it('should handle special characters in field names', () => {
      const result = buildFilterQuery('grp_Bureau_/_Department', ['DOD']);
      expect(result).toBe('{!tag=grp_Bureau_/_Department}grp_Bureau_/_Department:("DOD")');
    });
  });

  describe('buildKeywordFilterQuery', () => {
    it('should return null for empty keywords array', () => {
      expect(buildKeywordFilterQuery([])).toBeNull();
    });

    it('should return null for null/undefined input', () => {
      expect(buildKeywordFilterQuery(null as any)).toBeNull();
      expect(buildKeywordFilterQuery(undefined as any)).toBeNull();
    });

    it('should build query for single keyword', () => {
      const result = buildKeywordFilterQuery(['climate']);
      expect(result).toBe('keywords:("climate")');
    });

    it('should build OR query for multiple keywords', () => {
      const result = buildKeywordFilterQuery(['climate', 'weather']);
      expect(result).toBe('keywords:("climate" OR "weather")');
    });

    it('should use custom field when specified', () => {
      const result = buildKeywordFilterQuery(['tag1', 'tag2'], 'tag_tags');
      expect(result).toBe('tag_tags:("tag1" OR "tag2")');
    });

    it('should escape quotes in keywords', () => {
      const result = buildKeywordFilterQuery(['test "quoted" keyword']);
      expect(result).toBe('keywords:("test \\"quoted\\" keyword")');
    });
  });

  describe('buildLocationFilterQueries', () => {
    const locationMapping = {
      us: { field: 'grp_Country', value: 'United States' },
      uk: { field: 'grp_Country', value: 'United Kingdom' },
      ca: { field: 'grp_State', value: 'California' },
      ny: { field: 'grp_State', value: 'New York' },
      na: { field: 'grp_Region', value: 'North America' },
    };

    it('should return empty array for empty selection', () => {
      expect(buildLocationFilterQueries([], locationMapping)).toEqual([]);
    });

    it('should return empty array for null/undefined input', () => {
      expect(buildLocationFilterQueries(null as any, locationMapping)).toEqual([]);
      expect(buildLocationFilterQueries(undefined as any, locationMapping)).toEqual([]);
    });

    it('should build query for single location', () => {
      const result = buildLocationFilterQueries(['us'], locationMapping);
      expect(result).toHaveLength(1);
      expect(result[0]).toBe('(grp_Country:("United States"))');
    });

    it('should combine same-field locations with OR', () => {
      const result = buildLocationFilterQueries(['us', 'uk'], locationMapping);
      expect(result).toHaveLength(1);
      expect(result[0]).toContain('grp_Country');
      expect(result[0]).toContain('United States');
      expect(result[0]).toContain('United Kingdom');
      expect(result[0]).toContain(' OR ');
    });

    it('should combine different-field locations with OR', () => {
      const result = buildLocationFilterQueries(['us', 'ca'], locationMapping);
      expect(result).toHaveLength(1);
      // Should contain both field queries connected by OR
      expect(result[0]).toContain('grp_Country:("United States")');
      expect(result[0]).toContain('grp_State:("California")');
      expect(result[0]).toContain(' OR ');
    });

    it('should handle multiple locations across multiple fields', () => {
      const result = buildLocationFilterQueries(['us', 'uk', 'ca', 'ny', 'na'], locationMapping);
      expect(result).toHaveLength(1);
      // Single combined query with all fields
      expect(result[0]).toContain('grp_Country');
      expect(result[0]).toContain('grp_State');
      expect(result[0]).toContain('grp_Region');
    });

    it('should ignore unknown location IDs', () => {
      const result = buildLocationFilterQueries(['unknown', 'us'], locationMapping);
      expect(result).toHaveLength(1);
      expect(result[0]).toBe('(grp_Country:("United States"))');
    });

    it('should return empty array if all IDs are unknown', () => {
      const result = buildLocationFilterQueries(['unknown1', 'unknown2'], locationMapping);
      expect(result).toEqual([]);
    });
  });

  describe('toSearchResultFromVoyager', () => {
    it('should convert basic document fields', () => {
      const doc: VoyagerDoc = {
        id: 'test-123',
        title: 'Test Document',
        format: 'GeoTIFF',
        abstract: 'Test description',
      };

      const result = toSearchResultFromVoyager(doc);

      expect(result.id).toBe('test-123');
      expect(result.title).toBe('Test Document');
      expect(result.format).toBe('GeoTIFF');
      expect(result.description).toBe('Test description');
    });

    it('should fallback to name when title is missing', () => {
      const doc: VoyagerDoc = {
        id: 'test-123',
        name: 'Document Name',
      };

      const result = toSearchResultFromVoyager(doc);
      expect(result.title).toBe('Document Name');
    });

    it('should fallback to "Untitled" when both title and name are missing', () => {
      const doc: VoyagerDoc = {
        id: 'test-123',
      };

      const result = toSearchResultFromVoyager(doc);
      expect(result.title).toBe('Untitled');
    });

    it('should fallback to format_type when format is missing', () => {
      const doc: VoyagerDoc = {
        id: 'test-123',
        format_type: 'Image',
      };

      const result = toSearchResultFromVoyager(doc);
      expect(result.format).toBe('Image');
    });

    it('should fallback to description when abstract is missing', () => {
      const doc: VoyagerDoc = {
        id: 'test-123',
        description: 'Fallback description',
      };

      const result = toSearchResultFromVoyager(doc);
      expect(result.description).toBe('Fallback description');
    });

    it('should use DEFAULT_THUMBNAIL when no thumbnail is available', () => {
      const doc: VoyagerDoc = {
        id: 'test-123',
      };

      const result = toSearchResultFromVoyager(doc);
      expect(result.thumbnail).toBe(DEFAULT_THUMBNAIL);
    });

    it('should prefer thumb over path_to_thumb', () => {
      const doc: VoyagerDoc = {
        id: 'test-123',
        thumb: 'http://example.com/thumb.jpg',
        path_to_thumb: 'http://example.com/path_thumb.jpg',
      };

      const result = toSearchResultFromVoyager(doc);
      expect(result.thumbnail).toBe('http://example.com/thumb.jpg');
    });

    it('should fallback to path_to_thumb when thumb is missing', () => {
      const doc: VoyagerDoc = {
        id: 'test-123',
        path_to_thumb: 'http://example.com/path_thumb.jpg',
      };

      const result = toSearchResultFromVoyager(doc);
      expect(result.thumbnail).toBe('http://example.com/path_thumb.jpg');
    });

    it('should parse space-separated bbox correctly', () => {
      const doc: VoyagerDoc = {
        id: 'test-123',
        bbox: '-122.5 37.0 -121.5 38.0', // minLng minLat maxLng maxLat
      };

      const result = toSearchResultFromVoyager(doc);

      expect(result.bounds).toEqual([
        [37.0, -122.5],  // [minLat, minLng]
        [38.0, -121.5],  // [maxLat, maxLng]
      ]);
    });

    it('should parse comma-separated bbox correctly', () => {
      const doc: VoyagerDoc = {
        id: 'test-123',
        bbox: '-122.5,37.0,-121.5,38.0',
      };

      const result = toSearchResultFromVoyager(doc);

      expect(result.bounds).toEqual([
        [37.0, -122.5],
        [38.0, -121.5],
      ]);
    });

    it('should handle invalid bbox gracefully', () => {
      const doc: VoyagerDoc = {
        id: 'test-123',
        bbox: 'invalid bbox string',
      };

      const result = toSearchResultFromVoyager(doc);
      expect(result.bounds).toBeNull();
    });

    it('should handle incomplete bbox gracefully', () => {
      const doc: VoyagerDoc = {
        id: 'test-123',
        bbox: '-122.5 37.0', // Only 2 values
      };

      const result = toSearchResultFromVoyager(doc);
      expect(result.bounds).toBeNull();
    });

    it('should return null bounds when bbox is missing', () => {
      const doc: VoyagerDoc = {
        id: 'test-123',
      };

      const result = toSearchResultFromVoyager(doc);
      expect(result.bounds).toBeNull();
    });

    it('should include optional metadata fields', () => {
      const doc: VoyagerDoc = {
        id: 'test-123',
        bytes: 1024000,
        modified: '2024-01-15T10:30:00Z',
        keywords: ['satellite', 'imagery'],
        grp_Country: 'USA',
        grp_Agency: 'NASA',
        fd_acquisition_date: '2024-01-10',
        fd_publish_date: '2024-01-14',
        geometry_type: 'Polygon',
        download: 'http://example.com/download',
        fullpath: '/data/test.tif',
      };

      const result = toSearchResultFromVoyager(doc);

      expect(result.bytes).toBe(1024000);
      expect(result.modified).toBe('2024-01-15T10:30:00Z');
      expect(result.keywords).toEqual(['satellite', 'imagery']);
      expect(result.country).toBe('USA');
      expect(result.agency).toBe('NASA');
      expect(result.acquisitionDate).toBe('2024-01-10');
      expect(result.publishDate).toBe('2024-01-14');
      expect(result.geometryType).toBe('Polygon');
      expect(result.download).toBe('http://example.com/download');
      expect(result.fullpath).toBe('/data/test.tif');
    });

    it('should prefer keywords over tag_tags', () => {
      const doc: VoyagerDoc = {
        id: 'test-123',
        keywords: ['keyword1'],
        tag_tags: ['tag1'],
      };

      const result = toSearchResultFromVoyager(doc);
      expect(result.keywords).toEqual(['keyword1']);
    });

    it('should fallback to tag_tags when keywords is missing', () => {
      const doc: VoyagerDoc = {
        id: 'test-123',
        tag_tags: ['tag1', 'tag2'],
      };

      const result = toSearchResultFromVoyager(doc);
      expect(result.keywords).toEqual(['tag1', 'tag2']);
    });

    it('should prefer fullpath over absolute_path', () => {
      const doc: VoyagerDoc = {
        id: 'test-123',
        fullpath: '/full/path',
        absolute_path: '/absolute/path',
      };

      const result = toSearchResultFromVoyager(doc);
      expect(result.fullpath).toBe('/full/path');
    });

    it('should fallback to absolute_path when fullpath is missing', () => {
      const doc: VoyagerDoc = {
        id: 'test-123',
        absolute_path: '/absolute/path',
      };

      const result = toSearchResultFromVoyager(doc);
      expect(result.fullpath).toBe('/absolute/path');
    });
  });

  describe('FACET_DISPLAY_NAMES', () => {
    it('should have display names for common facet fields', () => {
      expect(FACET_DISPLAY_NAMES.grp_Country).toBe('Country');
      expect(FACET_DISPLAY_NAMES.grp_State).toBe('State');
      expect(FACET_DISPLAY_NAMES.format).toBe('Format');
      expect(FACET_DISPLAY_NAMES.keywords).toBe('Keywords');
    });

    it('should handle special field names with slashes', () => {
      expect(FACET_DISPLAY_NAMES['grp_Bureau_/_Department']).toBe('Bureau/Department');
    });
  });

  describe('DEFAULT_THUMBNAIL', () => {
    it('should be a valid SVG data URL', () => {
      expect(DEFAULT_THUMBNAIL).toMatch(/^data:image\/svg\+xml/);
    });

    it('should contain "No Preview" text', () => {
      const decoded = decodeURIComponent(DEFAULT_THUMBNAIL);
      expect(decoded).toContain('No Preview');
    });
  });
});
