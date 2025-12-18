import { getVoyagerBaseUrl } from '@/lib/config';

export interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  username?: string;
  name?: string;
  roles?: string[];
}

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

export const authService = {
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

  getAuthInfo: async (): Promise<User | null> => {
    try {
      const baseUrl = getVoyagerBaseUrl();
      const response = await fetch(`${baseUrl}/api/rest/auth/info`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

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
