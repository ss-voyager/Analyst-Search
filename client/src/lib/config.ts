export function getVoyagerBaseUrl(): string {
  const baseUrl = import.meta.env.VITE_VOYAGER_BASE_URL;
  if (!baseUrl) {
    throw new Error('VITE_VOYAGER_BASE_URL environment variable is not set');
  }
  // Ensure no trailing slash
  return baseUrl.replace(/\/$/, '');
}
