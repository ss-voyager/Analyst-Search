import { describe, it, expect } from 'vitest';
import {
  HIERARCHY_TREE,
  LOCATION_TO_VOYAGER,
  PLATFORMS,
  KEYWORDS,
  LEAF_IDS,
  getAllDescendantIds,
  expandSelectedLocations,
  getParentId,
  getDirectChildrenIds,
  getAllAncestorIds,
  areAllChildrenSelected,
  areSomeChildrenSelected,
  getCheckboxState,
  findNodeById,
  generateMockResults,
} from './location-hierarchy';
import { TreeNode } from './types';

describe('location-hierarchy', () => {
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

    it('should work with UK hierarchy (nested country)', () => {
      const ids = getAllDescendantIds('uk', HIERARCHY_TREE);
      expect(ids).toContain('uk');
      expect(ids).toContain('eng');
      expect(ids).toContain('sct');
      expect(ids).toContain('wls');
      expect(ids).toHaveLength(4);
    });

    it('should work with Europe (mixed depth children)', () => {
      const ids = getAllDescendantIds('eu', HIERARCHY_TREE);
      expect(ids).toContain('eu');
      expect(ids).toContain('uk');
      expect(ids).toContain('eng');
      expect(ids).toContain('fr');
      expect(ids).toContain('de');
      expect(ids).toContain('it');
      expect(ids).toContain('es');
      expect(ids).toHaveLength(9); // eu + uk + eng/sct/wls + fr/de/it/es
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
      expect(expanded).toContain('usa');
      expect(expanded).toContain('ca');
      expect(expanded).toContain('uk');
      expect(expanded).toContain('eng');
      expect(expanded).toContain('sct');
      expect(expanded).toContain('wls');
    });

    it('should deduplicate when parent and child are both selected', () => {
      const expanded = expandSelectedLocations(['usa', 'ca'], HIERARCHY_TREE);
      const uniqueExpanded = [...new Set(expanded)];
      expect(expanded.length).toBe(uniqueExpanded.length);
    });

    it('should handle empty array', () => {
      const expanded = expandSelectedLocations([], HIERARCHY_TREE);
      expect(expanded).toEqual([]);
    });
  });

  describe('getParentId', () => {
    it('should return null for root-level nodes', () => {
      expect(getParentId('na', HIERARCHY_TREE)).toBeNull();
      expect(getParentId('eu', HIERARCHY_TREE)).toBeNull();
      expect(getParentId('as', HIERARCHY_TREE)).toBeNull();
    });

    it('should return parent for second-level nodes', () => {
      expect(getParentId('usa', HIERARCHY_TREE)).toBe('na');
      expect(getParentId('can', HIERARCHY_TREE)).toBe('na');
      expect(getParentId('uk', HIERARCHY_TREE)).toBe('eu');
    });

    it('should return parent for third-level nodes', () => {
      expect(getParentId('ca', HIERARCHY_TREE)).toBe('usa');
      expect(getParentId('ny', HIERARCHY_TREE)).toBe('usa');
      expect(getParentId('eng', HIERARCHY_TREE)).toBe('uk');
    });

    it('should return null for non-existent node', () => {
      expect(getParentId('nonexistent', HIERARCHY_TREE)).toBeNull();
    });
  });

  describe('getDirectChildrenIds', () => {
    it('should return direct children for root node', () => {
      const children = getDirectChildrenIds('na', HIERARCHY_TREE);
      expect(children).toEqual(['usa', 'can', 'mex']);
    });

    it('should return direct children for country node', () => {
      const children = getDirectChildrenIds('usa', HIERARCHY_TREE);
      expect(children).toEqual(['ca', 'ny', 'tx', 'fl']);
    });

    it('should return empty array for leaf node', () => {
      const children = getDirectChildrenIds('ca', HIERARCHY_TREE);
      expect(children).toEqual([]);
    });

    it('should return empty array for non-existent node', () => {
      const children = getDirectChildrenIds('nonexistent', HIERARCHY_TREE);
      expect(children).toEqual([]);
    });

    it('should return direct children for UK (nested structure)', () => {
      const children = getDirectChildrenIds('uk', HIERARCHY_TREE);
      expect(children).toEqual(['eng', 'sct', 'wls']);
    });
  });

  describe('getAllAncestorIds', () => {
    it('should return empty array for root node', () => {
      const ancestors = getAllAncestorIds('na', HIERARCHY_TREE);
      expect(ancestors).toEqual([]);
    });

    it('should return parent for second-level node', () => {
      const ancestors = getAllAncestorIds('usa', HIERARCHY_TREE);
      expect(ancestors).toEqual(['na']);
    });

    it('should return all ancestors for leaf node', () => {
      const ancestors = getAllAncestorIds('ca', HIERARCHY_TREE);
      expect(ancestors).toEqual(['usa', 'na']);
    });

    it('should return all ancestors for deeply nested node', () => {
      const ancestors = getAllAncestorIds('eng', HIERARCHY_TREE);
      expect(ancestors).toEqual(['uk', 'eu']);
    });

    it('should return empty array for non-existent node', () => {
      const ancestors = getAllAncestorIds('nonexistent', HIERARCHY_TREE);
      expect(ancestors).toEqual([]);
    });
  });

  describe('areAllChildrenSelected', () => {
    it('should return false for leaf node', () => {
      expect(areAllChildrenSelected('ca', ['ca'], HIERARCHY_TREE)).toBe(false);
    });

    it('should return true when all children are selected', () => {
      const selected = ['ca', 'ny', 'tx', 'fl'];
      expect(areAllChildrenSelected('usa', selected, HIERARCHY_TREE)).toBe(true);
    });

    it('should return false when some children are selected', () => {
      const selected = ['ca', 'ny'];
      expect(areAllChildrenSelected('usa', selected, HIERARCHY_TREE)).toBe(false);
    });

    it('should return false when no children are selected', () => {
      const selected: string[] = [];
      expect(areAllChildrenSelected('usa', selected, HIERARCHY_TREE)).toBe(false);
    });

    it('should return false for non-existent node', () => {
      expect(areAllChildrenSelected('nonexistent', ['ca'], HIERARCHY_TREE)).toBe(false);
    });
  });

  describe('areSomeChildrenSelected', () => {
    it('should return false for leaf node', () => {
      expect(areSomeChildrenSelected('ca', ['ca'], HIERARCHY_TREE)).toBe(false);
    });

    it('should return false when all children are selected', () => {
      const selected = ['ca', 'ny', 'tx', 'fl'];
      expect(areSomeChildrenSelected('usa', selected, HIERARCHY_TREE)).toBe(false);
    });

    it('should return true when some (but not all) children are selected', () => {
      const selected = ['ca', 'ny'];
      expect(areSomeChildrenSelected('usa', selected, HIERARCHY_TREE)).toBe(true);
    });

    it('should return false when no children are selected', () => {
      const selected: string[] = [];
      expect(areSomeChildrenSelected('usa', selected, HIERARCHY_TREE)).toBe(false);
    });

    it('should return true when exactly one child is selected', () => {
      const selected = ['ca'];
      expect(areSomeChildrenSelected('usa', selected, HIERARCHY_TREE)).toBe(true);
    });
  });

  describe('getCheckboxState', () => {
    it('should return true for selected leaf node', () => {
      expect(getCheckboxState('ca', ['ca'], HIERARCHY_TREE)).toBe(true);
    });

    it('should return false for unselected leaf node', () => {
      expect(getCheckboxState('ca', [], HIERARCHY_TREE)).toBe(false);
    });

    it('should return true when all children are selected', () => {
      const selected = ['ca', 'ny', 'tx', 'fl'];
      expect(getCheckboxState('usa', selected, HIERARCHY_TREE)).toBe(true);
    });

    it('should return "indeterminate" when some children are selected', () => {
      const selected = ['ca', 'ny'];
      expect(getCheckboxState('usa', selected, HIERARCHY_TREE)).toBe('indeterminate');
    });

    it('should return false when no children are selected', () => {
      expect(getCheckboxState('usa', [], HIERARCHY_TREE)).toBe(false);
    });

    it('should return "indeterminate" when node is directly selected but not all children', () => {
      const selected = ['usa']; // Node selected but not all children
      expect(getCheckboxState('usa', selected, HIERARCHY_TREE)).toBe('indeterminate');
    });
  });

  describe('findNodeById', () => {
    it('should find root-level node', () => {
      const node = findNodeById('na', HIERARCHY_TREE);
      expect(node).not.toBeNull();
      expect(node?.id).toBe('na');
      expect(node?.label).toBe('North America');
    });

    it('should find second-level node', () => {
      const node = findNodeById('usa', HIERARCHY_TREE);
      expect(node).not.toBeNull();
      expect(node?.id).toBe('usa');
      expect(node?.label).toBe('United States');
    });

    it('should find leaf node', () => {
      const node = findNodeById('ca', HIERARCHY_TREE);
      expect(node).not.toBeNull();
      expect(node?.id).toBe('ca');
      expect(node?.label).toBe('California');
    });

    it('should return null for non-existent node', () => {
      const node = findNodeById('nonexistent', HIERARCHY_TREE);
      expect(node).toBeNull();
    });

    it('should find deeply nested node (UK regions)', () => {
      const node = findNodeById('eng', HIERARCHY_TREE);
      expect(node).not.toBeNull();
      expect(node?.id).toBe('eng');
      expect(node?.label).toBe('England');
    });
  });

  describe('HIERARCHY_TREE structure', () => {
    it('should have 5 continents/regions at root level', () => {
      expect(HIERARCHY_TREE).toHaveLength(5);
    });

    it('should have correct root node IDs', () => {
      const rootIds = HIERARCHY_TREE.map(n => n.id);
      expect(rootIds).toEqual(['na', 'eu', 'as', 'sa', 'af']);
    });

    it('should have North America with expected children', () => {
      const na = HIERARCHY_TREE.find(n => n.id === 'na');
      expect(na?.children).toHaveLength(3);
      expect(na?.children?.map(c => c.id)).toEqual(['usa', 'can', 'mex']);
    });

    it('should have USA with 4 states', () => {
      const na = HIERARCHY_TREE.find(n => n.id === 'na');
      const usa = na?.children?.find(c => c.id === 'usa');
      expect(usa?.children).toHaveLength(4);
    });
  });

  describe('LOCATION_TO_VOYAGER mapping', () => {
    it('should map regions to grp_Region field', () => {
      expect(LOCATION_TO_VOYAGER['na'].field).toBe('grp_Region');
      expect(LOCATION_TO_VOYAGER['eu'].field).toBe('grp_Region');
      expect(LOCATION_TO_VOYAGER['as'].field).toBe('grp_Region');
    });

    it('should map countries to grp_Country field', () => {
      expect(LOCATION_TO_VOYAGER['usa'].field).toBe('grp_Country');
      expect(LOCATION_TO_VOYAGER['uk'].field).toBe('grp_Country');
      expect(LOCATION_TO_VOYAGER['jp'].field).toBe('grp_Country');
    });

    it('should map states to grp_State field', () => {
      expect(LOCATION_TO_VOYAGER['ca'].field).toBe('grp_State');
      expect(LOCATION_TO_VOYAGER['ny'].field).toBe('grp_State');
      expect(LOCATION_TO_VOYAGER['eng'].field).toBe('grp_State');
    });

    it('should have flag emojis for country values', () => {
      expect(LOCATION_TO_VOYAGER['usa'].value).toContain('United States');
      expect(LOCATION_TO_VOYAGER['uk'].value).toContain('United Kingdom');
    });
  });

  describe('PLATFORMS', () => {
    it('should have 10 platforms', () => {
      expect(PLATFORMS).toHaveLength(10);
    });

    it('should have SAR platforms', () => {
      const sarPlatforms = PLATFORMS.filter(p => p.type === 'SAR');
      expect(sarPlatforms.length).toBeGreaterThan(0);
    });

    it('should have optical platforms', () => {
      const opticalPlatforms = PLATFORMS.filter(p => p.type === 'Optical');
      expect(opticalPlatforms.length).toBeGreaterThan(0);
    });

    it('should have required properties for each platform', () => {
      PLATFORMS.forEach(platform => {
        expect(platform).toHaveProperty('name');
        expect(platform).toHaveProperty('provider');
        expect(platform).toHaveProperty('type');
      });
    });
  });

  describe('KEYWORDS', () => {
    it('should have keyword entries', () => {
      expect(KEYWORDS.length).toBeGreaterThan(0);
    });

    it('should contain expected categories', () => {
      expect(KEYWORDS).toContain('Vegetation');
      expect(KEYWORDS).toContain('Water');
      expect(KEYWORDS).toContain('Urban');
    });
  });

  describe('LEAF_IDS', () => {
    it('should contain only leaf node IDs', () => {
      LEAF_IDS.forEach(id => {
        const node = findNodeById(id, HIERARCHY_TREE);
        if (node) {
          // Should not have children (leaf node)
          expect(node.children).toBeUndefined();
        }
      });
    });

    it('should match all leaf nodes in tree', () => {
      const allLeafIds: string[] = [];

      function collectLeaves(nodes: TreeNode[]) {
        for (const node of nodes) {
          if (!node.children || node.children.length === 0) {
            allLeafIds.push(node.id);
          } else {
            collectLeaves(node.children);
          }
        }
      }

      collectLeaves(HIERARCHY_TREE);

      // All LEAF_IDS should be in allLeafIds
      LEAF_IDS.forEach(id => {
        expect(allLeafIds).toContain(id);
      });
    });
  });

  describe('generateMockResults', () => {
    it('should generate the requested number of results', () => {
      const results = generateMockResults(10);
      expect(results).toHaveLength(10);
    });

    it('should generate results with required properties', () => {
      const results = generateMockResults(5);

      results.forEach(result => {
        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('title');
        expect(result).toHaveProperty('date');
        expect(result).toHaveProperty('platform');
        expect(result).toHaveProperty('provider');
        expect(result).toHaveProperty('thumbnail');
        expect(result).toHaveProperty('bounds');
      });
    });

    it('should generate unique IDs', () => {
      const results = generateMockResults(100);
      const ids = results.map(r => r.id);
      const uniqueIds = [...new Set(ids)];
      expect(uniqueIds).toHaveLength(100);
    });

    it('should assign valid platform names', () => {
      const results = generateMockResults(20);
      const validPlatformNames = PLATFORMS.map(p => p.name);

      results.forEach(result => {
        expect(validPlatformNames).toContain(result.platform);
      });
    });

    it('should generate valid bounds arrays', () => {
      const results = generateMockResults(10);

      results.forEach(result => {
        expect(Array.isArray(result.bounds)).toBe(true);
        expect(result.bounds).toHaveLength(2);
      });
    });

    it('should handle zero count', () => {
      const results = generateMockResults(0);
      expect(results).toHaveLength(0);
    });
  });
});
