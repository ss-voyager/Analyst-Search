import { describe, it, expect } from 'vitest';
import { buildLocationFilterQueries } from './voyager-api';
import {
  HIERARCHY_TREE,
  LOCATION_TO_VOYAGER,
  getAllDescendantIds,
  expandSelectedLocations,
} from './mock-data';

describe('getAllDescendantIds', () => {
  it('should return just the node ID for a leaf node', () => {
    const ids = getAllDescendantIds('ca', HIERARCHY_TREE);
    expect(ids).toEqual(['ca']);
  });

  it('should return node and all children for a parent node', () => {
    const ids = getAllDescendantIds('usa', HIERARCHY_TREE);
    expect(ids).toContain('usa');
    expect(ids).toContain('ca');
    expect(ids).toContain('ny');
    expect(ids).toContain('tx');
    expect(ids).toContain('fl');
    expect(ids).toHaveLength(5);
  });

  it('should return all descendants for a top-level region', () => {
    const ids = getAllDescendantIds('na', HIERARCHY_TREE);
    expect(ids).toContain('na');
    expect(ids).toContain('usa');
    expect(ids).toContain('can');
    expect(ids).toContain('mex');
    expect(ids).toContain('ca');
    expect(ids).toContain('ny');
    expect(ids).toContain('tx');
    expect(ids).toContain('fl');
    expect(ids).toHaveLength(8);
  });

  it('should return empty array for non-existent node', () => {
    const ids = getAllDescendantIds('nonexistent', HIERARCHY_TREE);
    expect(ids).toEqual([]);
  });
});

describe('expandSelectedLocations', () => {
  it('should return same ID for leaf node', () => {
    const expanded = expandSelectedLocations(['ca'], HIERARCHY_TREE);
    expect(expanded).toEqual(['ca']);
  });

  it('should expand parent to include all children', () => {
    const expanded = expandSelectedLocations(['usa'], HIERARCHY_TREE);
    expect(expanded).toContain('usa');
    expect(expanded).toContain('ca');
    expect(expanded).toContain('ny');
    expect(expanded).toContain('tx');
    expect(expanded).toContain('fl');
  });

  it('should expand multiple selections', () => {
    const expanded = expandSelectedLocations(['usa', 'uk'], HIERARCHY_TREE);
    // USA and its children
    expect(expanded).toContain('usa');
    expect(expanded).toContain('ca');
    // UK and its children
    expect(expanded).toContain('uk');
    expect(expanded).toContain('eng');
    expect(expanded).toContain('sct');
    expect(expanded).toContain('wls');
  });

  it('should deduplicate when parent and child are both selected', () => {
    const expanded = expandSelectedLocations(['usa', 'ca'], HIERARCHY_TREE);
    // Should not have duplicates
    const uniqueExpanded = [...new Set(expanded)];
    expect(expanded.length).toBe(uniqueExpanded.length);
  });
});

describe('buildLocationFilterQueries', () => {
  it('should return empty array when no locations selected', () => {
    const queries = buildLocationFilterQueries([], LOCATION_TO_VOYAGER);
    expect(queries).toEqual([]);
  });

  it('should build query for single country', () => {
    const queries = buildLocationFilterQueries(['usa'], LOCATION_TO_VOYAGER);
    expect(queries).toHaveLength(1);
    expect(queries[0]).toContain('grp_Country');
    expect(queries[0]).toContain('United States');
  });

  it('should build query for single state', () => {
    const queries = buildLocationFilterQueries(['ca'], LOCATION_TO_VOYAGER);
    expect(queries).toHaveLength(1);
    expect(queries[0]).toContain('grp_State');
    expect(queries[0]).toContain('California');
  });

  it('should combine multiple countries with OR', () => {
    const queries = buildLocationFilterQueries(['usa', 'can', 'mex'], LOCATION_TO_VOYAGER);
    expect(queries).toHaveLength(1);
    expect(queries[0]).toContain('grp_Country');
    expect(queries[0]).toContain('United States');
    expect(queries[0]).toContain('Canada');
    expect(queries[0]).toContain('Mexico');
    expect(queries[0]).toContain(' OR ');
  });

  it('should combine different field types with OR (not AND)', () => {
    // This is the key test - selecting a region + country + state should OR them
    const queries = buildLocationFilterQueries(['na', 'usa', 'ca'], LOCATION_TO_VOYAGER);
    expect(queries).toHaveLength(1);
    // Should be a single query with OR between different field types
    expect(queries[0]).toContain('grp_Region');
    expect(queries[0]).toContain('grp_Country');
    expect(queries[0]).toContain('grp_State');
    expect(queries[0]).toContain(' OR ');
  });

  it('should handle expanded North America selection correctly', () => {
    // Simulate what happens when user clicks "North America"
    const expandedIds = expandSelectedLocations(['na'], HIERARCHY_TREE);
    const queries = buildLocationFilterQueries(expandedIds, LOCATION_TO_VOYAGER);

    expect(queries).toHaveLength(1);
    const query = queries[0];

    // Should contain the region
    expect(query).toContain('grp_Region:("North America")');

    // Should contain countries with OR
    expect(query).toContain('grp_Country');
    expect(query).toContain('United States');
    expect(query).toContain('Canada');
    expect(query).toContain('Mexico');

    // Should contain US states with OR
    expect(query).toContain('grp_State');
    expect(query).toContain('California');
    expect(query).toContain('New York');
    expect(query).toContain('Texas');
    expect(query).toContain('Florida');

    // All parts should be ORed together (single query, not multiple)
    expect(query).toMatch(/^\(.*\)$/); // Wrapped in parentheses
  });

  it('should properly escape quotes in values', () => {
    // Create a test mapping with quotes
    const testMapping = {
      'test': { field: 'test_field', value: 'Value "with" quotes' }
    };
    const queries = buildLocationFilterQueries(['test'], testMapping);
    expect(queries).toHaveLength(1);
    expect(queries[0]).toContain('\\"');
  });
});
