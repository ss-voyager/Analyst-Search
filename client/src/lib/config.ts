export function getVoyagerBaseUrl(): string {
  const baseUrl = import.meta.env.VITE_VOYAGER_BASE_URL;
  if (!baseUrl) {
    throw new Error('VITE_VOYAGER_BASE_URL environment variable is not set');
  }
  // Ensure no trailing slash
  return baseUrl.replace(/\/$/, '');
}

export function getGazetteerBaseUrl(): string {
  return import.meta.env.VITE_GAZETTEER_BASE_URL || 'http://172.22.1.25:8888';
}
