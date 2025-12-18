import { describe, it, expect, vi, beforeEach } from 'vitest';

// We need to test via stubbing since import.meta.env is read at call time
describe('getVoyagerBaseUrl', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should return base URL from environment variable', async () => {
    vi.stubEnv('VITE_VOYAGER_BASE_URL', 'http://test-voyager.example.com');
    const { getVoyagerBaseUrl } = await import('./config');
    const result = getVoyagerBaseUrl();

    // Should return a string
    expect(typeof result).toBe('string');

    // Should not have trailing slash
    expect(result).not.toMatch(/\/$/);

    // Should be a valid URL format
    expect(result).toMatch(/^https?:\/\/.+/);

    vi.unstubAllEnvs();
  });

  it('should not have trailing slash', async () => {
    vi.stubEnv('VITE_VOYAGER_BASE_URL', 'http://test-voyager.example.com/');
    const { getVoyagerBaseUrl } = await import('./config');
    const result = getVoyagerBaseUrl();

    expect(result).not.toMatch(/\/$/);
    expect(result).toBe('http://test-voyager.example.com');

    vi.unstubAllEnvs();
  });

  it('should return consistent value', async () => {
    vi.stubEnv('VITE_VOYAGER_BASE_URL', 'http://test-voyager.example.com');
    const { getVoyagerBaseUrl } = await import('./config');
    const result1 = getVoyagerBaseUrl();
    const result2 = getVoyagerBaseUrl();

    expect(result1).toBe(result2);

    vi.unstubAllEnvs();
  });

  it('should throw error when env var is not set', async () => {
    vi.stubEnv('VITE_VOYAGER_BASE_URL', '');
    const { getVoyagerBaseUrl } = await import('./config');

    expect(() => getVoyagerBaseUrl()).toThrow('VITE_VOYAGER_BASE_URL environment variable is not set');

    vi.unstubAllEnvs();
  });
});

describe('getGazetteerBaseUrl', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should return default value when env var is not set', async () => {
    vi.stubEnv('VITE_GAZETTEER_BASE_URL', '');
    const { getGazetteerBaseUrl } = await import('./config');
    const result = getGazetteerBaseUrl();

    expect(result).toBe('http://172.22.1.25:8888');

    vi.unstubAllEnvs();
  });

  it('should return env var value when set', async () => {
    vi.stubEnv('VITE_GAZETTEER_BASE_URL', 'http://custom-gazetteer.example.com');
    const { getGazetteerBaseUrl } = await import('./config');
    const result = getGazetteerBaseUrl();

    expect(result).toBe('http://custom-gazetteer.example.com');

    vi.unstubAllEnvs();
  });
});
