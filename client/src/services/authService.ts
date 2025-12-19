/**
 * @fileoverview Authentication service for Navigo popup-based login
 * @module client/services/authService
 */

import { getVoyagerBaseUrl } from '@/lib/config';

/**
 * Authenticated user information
 */
export interface User {
  /** Unique user identifier */
  id: string;
  /** User's email address */
  email: string | null;
  /** User's first name */
  firstName: string | null;
  /** User's last name */
  lastName: string | null;
  /** URL to user's profile image */
  profileImageUrl: string | null;
  /** Username for display */
  username?: string;
  /** Full display name */
  name?: string;
  /** User's assigned roles/groups */
  roles?: string[];
}

/**
 * Response structure from the Navigo auth info endpoint
 * @internal
 */
interface NavigoAuthResponse {
  state: 'loggedin' | 'loggedout';
  user?: {
    id?: string;
    name?: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    profile_image_url?: string;
    groups?: string[];
  };
}

/**
 * Authentication service providing login, logout, and auth state checking
 *
 * @remarks
 * Uses Navigo popup-based authentication flow:
 * 1. Opens popup window to Navigo login page
 * 2. Polls for popup closure
 * 3. Checks auth state via REST API
 *
 * @example
 * ```typescript
 * // Login flow
 * await authService.login();
 * const user = await authService.getAuthInfo();
 *
 * // Logout
 * await authService.logout();
 * ```
 */
export const authService = {
  /**
   * Opens a popup window for user authentication
   *
   * @returns Promise that resolves when the popup is closed
   *
   * @remarks
   * - Opens a centered 900x700 popup to the Navigo login URL
   * - Listens for postMessage AUTH_SUCCESS events
   * - Polls every 500ms to detect popup closure
   * - Shows alert if popups are blocked
   */
  login: async (): Promise<void> => {
    const baseUrl = getVoyagerBaseUrl();
    const loginUrl = `${baseUrl}/navigo/login`;

    const width = 900;
    const height = 700;
    const left = Math.round((window.screen.width - width) / 2);
    const top = Math.round((window.screen.height - height) / 2);

    const windowFeatures = `popup=yes,width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`;

    const popup = window.open(loginUrl, 'auth_login', windowFeatures);

    if (!popup) {
      alert('Please allow popups for this site to log in');
      return;
    }

    popup.focus();

    return new Promise<void>((resolve) => {
      // Optional: Listen for postMessage from auth page
      const messageHandler = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (event.data.type === 'AUTH_SUCCESS') {
          window.removeEventListener('message', messageHandler);
          resolve();
        }
      };
      window.addEventListener('message', messageHandler);

      // Poll for popup close
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', messageHandler);
          resolve();
        }
      }, 500);
    });
  },

  /**
   * Retrieves the current authenticated user's information
   *
   * @returns Promise resolving to User object if authenticated, null otherwise
   *
   * @remarks
   * Makes a request to the Navigo auth info endpoint with credentials included.
   * Returns null on network errors or if user is not logged in.
   */
  getAuthInfo: async (): Promise<User | null> => {
    try {
      const baseUrl = getVoyagerBaseUrl();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${baseUrl}/api/rest/auth/info`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return null;
      }

      const data: NavigoAuthResponse = await response.json();

      if (data.state === 'loggedin' && data.user) {
        return {
          id: data.user.id || data.user.name || 'user',
          email: data.user.email || null,
          firstName: data.user.first_name || null,
          lastName: data.user.last_name || null,
          profileImageUrl: data.user.profile_image_url || null,
          username: data.user.name,
          name: data.user.name || data.user.id,
          roles: data.user.groups || [],
        };
      }

      return null;
    } catch (error) {
      console.error('Auth info error:', error);
      return null;
    }
  },

  /**
   * Logs out the current user
   *
   * @returns Promise that resolves when logout is complete
   *
   * @remarks
   * Sends a POST request to the Navigo logout endpoint.
   * Errors are logged to console but not thrown.
   */
  logout: async (): Promise<void> => {
    try {
      const baseUrl = getVoyagerBaseUrl();
      await fetch(`${baseUrl}/api/rest/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  },
};
