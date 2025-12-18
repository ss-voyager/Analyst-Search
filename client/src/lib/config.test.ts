import { describe, it, expect } from 'vitest';
import { getVoyagerBaseUrl } from './config';

describe('getVoyagerBaseUrl', () => {
  it('should return base URL from environment variable', () => {
    // This test validates that the function works with the actual env var
    const result = getVoyagerBaseUrl();

    // Should return a string
    expect(typeof result).toBe('string');

    // Should not have trailing slash
    expect(result).not.toMatch(/\/$/);

    // Should be a valid URL format
    expect(result).toMatch(/^https?:\/\/.+/);
  });

  it('should not have trailing slash', () => {
    const result = getVoyagerBaseUrl();

    expect(result).not.toMatch(/\/$/);
  });

  it('should return consistent value', () => {
    const result1 = getVoyagerBaseUrl();
    const result2 = getVoyagerBaseUrl();

    expect(result1).toBe(result2);
  });
});
