import { describe, it, expect } from 'vitest';
import { buildDateRangeQuery } from './voyager-api';

describe('buildDateRangeQuery', () => {
  describe('basic functionality', () => {
    it('should return null when no dates are provided', () => {
      const query = buildDateRangeQuery(undefined, undefined);
      expect(query).toBeNull();
    });

    it('should return null when both dates are undefined', () => {
      const query = buildDateRangeQuery();
      expect(query).toBeNull();
    });

    it('should build query with only dateFrom (open-ended to)', () => {
      const from = new Date(2024, 0, 15); // Jan 15, 2024 in local time
      const query = buildDateRangeQuery(from, undefined);

      expect(query).not.toBeNull();
      expect(query).toContain('modified:[');
      expect(query).toContain(' TO *]');
      // Should contain a valid ISO date string
      expect(query).toMatch(/\d{4}-\d{2}-\d{2}T/);
    });

    it('should build query with only dateTo (open-ended from)', () => {
      const to = new Date(2024, 5, 30); // June 30, 2024 in local time
      const query = buildDateRangeQuery(undefined, to);

      expect(query).not.toBeNull();
      expect(query).toContain('modified:[* TO ');
      expect(query).toMatch(/\d{4}-\d{2}-\d{2}T/);
    });

    it('should build query with both dateFrom and dateTo', () => {
      const from = new Date(2024, 0, 1); // Jan 1, 2024
      const to = new Date(2024, 11, 31); // Dec 31, 2024
      const query = buildDateRangeQuery(from, to);

      expect(query).not.toBeNull();
      expect(query).toContain('modified:[');
      expect(query).toContain(' TO ');
      expect(query).not.toContain('*');
    });
  });

  describe('custom field names', () => {
    it('should use default field "modified" when not specified', () => {
      const from = new Date(2024, 0, 1);
      const query = buildDateRangeQuery(from, undefined);

      expect(query).toContain('modified:[');
    });

    it('should use custom field when specified', () => {
      const from = new Date(2024, 0, 1);
      const query = buildDateRangeQuery(from, undefined, 'fd_acquisition_date');

      expect(query).toContain('fd_acquisition_date:[');
      expect(query).not.toContain('modified');
    });

    it('should work with fd_publish_date field', () => {
      const from = new Date(2024, 0, 1);
      const to = new Date(2024, 5, 30);
      const query = buildDateRangeQuery(from, to, 'fd_publish_date');

      expect(query).toContain('fd_publish_date:[');
    });

    it('should work with created field', () => {
      const from = new Date(2024, 0, 1);
      const query = buildDateRangeQuery(from, undefined, 'created');

      expect(query).toContain('created:[');
    });
  });

  describe('date formatting', () => {
    it('should format dateFrom as start of day (00:00:00 local time)', () => {
      const from = new Date(2024, 2, 15, 14, 30, 0); // March 15, 2024 at 2:30 PM local
      const query = buildDateRangeQuery(from, undefined);

      expect(query).not.toBeNull();

      // Extract the from date from the query
      const match = query!.match(/\[(.+?) TO/);
      expect(match).not.toBeNull();

      const fromDateStr = match![1];
      const fromDate = new Date(fromDateStr);

      // The from date should be set to start of day (local time)
      expect(fromDate.getHours()).toBe(0);
      expect(fromDate.getMinutes()).toBe(0);
      expect(fromDate.getSeconds()).toBe(0);
    });

    it('should format dateTo as end of day (23:59:59 local time)', () => {
      const to = new Date(2024, 2, 15, 10, 0, 0); // March 15, 2024 at 10 AM local
      const query = buildDateRangeQuery(undefined, to);

      expect(query).not.toBeNull();

      // Extract the to date from the query
      const match = query!.match(/TO (.+?)\]/);
      expect(match).not.toBeNull();

      const toDateStr = match![1];
      const toDate = new Date(toDateStr);

      // The to date should be set to end of day (local time)
      expect(toDate.getHours()).toBe(23);
      expect(toDate.getMinutes()).toBe(59);
      expect(toDate.getSeconds()).toBe(59);
    });

    it('should output ISO 8601 format for Solr', () => {
      const from = new Date(2024, 5, 15);
      const to = new Date(2024, 5, 20);
      const query = buildDateRangeQuery(from, to);

      expect(query).not.toBeNull();
      // ISO format includes T and Z
      expect(query).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
    });
  });

  describe('Solr query format', () => {
    it('should produce valid Solr range query syntax', () => {
      const from = new Date(2024, 0, 1);
      const to = new Date(2024, 11, 31);
      const query = buildDateRangeQuery(from, to);

      expect(query).not.toBeNull();
      // Solr range query format: field:[from TO to]
      expect(query).toMatch(/^[\w_]+:\[.+ TO .+\]$/);
    });

    it('should use square brackets for inclusive range', () => {
      const from = new Date(2024, 0, 1);
      const to = new Date(2024, 11, 31);
      const query = buildDateRangeQuery(from, to);

      expect(query).toContain('[');
      expect(query).toContain(']');
      // Should not use curly braces (exclusive)
      expect(query).not.toContain('{');
      expect(query).not.toContain('}');
    });

    it('should use asterisk for unbounded range', () => {
      const from = new Date(2024, 0, 1);
      const queryOpenEnd = buildDateRangeQuery(from, undefined);
      expect(queryOpenEnd).toContain('TO *]');

      const to = new Date(2024, 11, 31);
      const queryOpenStart = buildDateRangeQuery(undefined, to);
      expect(queryOpenStart).toContain('[* TO');
    });
  });

  describe('edge cases', () => {
    it('should handle same date for from and to', () => {
      const date = new Date(2024, 5, 15); // June 15, 2024
      const query = buildDateRangeQuery(date, date);

      expect(query).not.toBeNull();

      // Extract both dates
      const fromMatch = query!.match(/\[(.+?) TO/);
      const toMatch = query!.match(/TO (.+?)\]/);

      expect(fromMatch).not.toBeNull();
      expect(toMatch).not.toBeNull();

      const fromDate = new Date(fromMatch![1]);
      const toDate = new Date(toMatch![1]);

      // From should be start of day, To should be end of day
      expect(fromDate.getHours()).toBe(0);
      expect(toDate.getHours()).toBe(23);
      expect(toDate.getMinutes()).toBe(59);
    });

    it('should handle dates at year boundaries', () => {
      const from = new Date(2023, 11, 31); // Dec 31, 2023
      const to = new Date(2024, 0, 1); // Jan 1, 2024
      const query = buildDateRangeQuery(from, to);

      expect(query).not.toBeNull();
      expect(query).toContain('2023');
      expect(query).toContain('2024');
    });

    it('should handle leap year date', () => {
      const leapDay = new Date(2024, 1, 29); // Feb 29, 2024
      const query = buildDateRangeQuery(leapDay, leapDay);

      expect(query).not.toBeNull();
      // Should contain February dates
      expect(query).toMatch(/2024-02/);
    });

    it('should handle dates from different years', () => {
      const oldDate = new Date(1990, 0, 1); // Jan 1, 1990
      const query = buildDateRangeQuery(oldDate, undefined);

      expect(query).not.toBeNull();
      expect(query).toContain('1990');
    });

    it('should handle future dates', () => {
      const futureDate = new Date(2030, 5, 15); // June 15, 2030 (mid-year to avoid timezone issues)
      const query = buildDateRangeQuery(undefined, futureDate);

      expect(query).not.toBeNull();
      expect(query).toContain('2030');
    });
  });

  describe('integration with filter queries', () => {
    it('should produce query usable as Solr fq parameter', () => {
      const from = new Date(2024, 0, 1);
      const to = new Date(2024, 5, 30);
      const query = buildDateRangeQuery(from, to, 'modified');

      expect(query).not.toBeNull();
      // Should have the format: field:[date TO date]
      expect(query).toMatch(/^modified:\[.+Z TO .+Z\]$/);
    });

    it('should work correctly when combined with other filters', () => {
      const from = new Date(2024, 0, 1);
      const to = new Date(2024, 11, 31);
      const dateQuery = buildDateRangeQuery(from, to);

      // Simulate combining with other filter queries
      const allFilters = [
        dateQuery,
        'grp_Country:("United States")',
        'format:("GeoTIFF")'
      ].filter(Boolean);

      expect(allFilters).toHaveLength(3);
      expect(allFilters[0]).toContain('modified:[');
    });
  });
});
