import { describe, it, expect } from 'vitest';
import { buildPropertyFilterQueries } from './voyager-api';

describe('buildPropertyFilterQueries', () => {
  it('should return empty array when no properties selected', () => {
    const queries = buildPropertyFilterQueries([]);
    expect(queries).toEqual([]);
  });

  it('should return empty array for null/undefined input', () => {
    const queries = buildPropertyFilterQueries(null as any);
    expect(queries).toEqual([]);
  });

  it('should build query for has_thumbnail', () => {
    const queries = buildPropertyFilterQueries(['has_thumbnail']);
    expect(queries).toHaveLength(1);
    expect(queries[0]).toContain('format_category');
    expect(queries[0]).toContain('GIS');
    expect(queries[0]).toContain('Image');
    expect(queries[0]).toContain('Map');
    expect(queries[0]).toContain('Document');
    // Should be wrapped in parentheses because it contains OR
    expect(queries[0]).toMatch(/^\(.*\)$/);
  });

  it('should build query for has_spatial', () => {
    const queries = buildPropertyFilterQueries(['has_spatial']);
    expect(queries).toHaveLength(1);
    expect(queries[0]).toBe('geometry_type:*');
    // Should NOT be wrapped in parentheses (no OR)
    expect(queries[0]).not.toMatch(/^\(.*\)$/);
  });

  it('should build query for has_temporal', () => {
    const queries = buildPropertyFilterQueries(['has_temporal']);
    expect(queries).toHaveLength(1);
    expect(queries[0]).toBe('fi_year:*');
  });

  it('should build query for is_downloadable', () => {
    const queries = buildPropertyFilterQueries(['is_downloadable']);
    expect(queries).toHaveLength(1);
    expect(queries[0]).toContain('format_type');
    expect(queries[0]).toContain('File');
    expect(queries[0]).toContain('Dataset');
    expect(queries[0]).toContain('Record');
    expect(queries[0]).toContain('Layer');
  });

  it('should build multiple queries for multiple properties', () => {
    const queries = buildPropertyFilterQueries(['has_thumbnail', 'has_spatial']);
    expect(queries).toHaveLength(2);
    expect(queries[0]).toContain('format_category');
    expect(queries[1]).toBe('geometry_type:*');
  });

  it('should ignore unknown properties', () => {
    const queries = buildPropertyFilterQueries(['unknown_property', 'has_spatial']);
    expect(queries).toHaveLength(1);
    expect(queries[0]).toBe('geometry_type:*');
  });

  it('should produce valid Solr fq queries', () => {
    const queries = buildPropertyFilterQueries(['has_thumbnail', 'has_spatial', 'has_temporal', 'is_downloadable']);

    expect(queries).toHaveLength(4);

    // Each query should be usable as a Solr fq parameter
    queries.forEach(query => {
      // Should contain field name followed by colon
      expect(query).toMatch(/\w+:/);
    });
  });
});
