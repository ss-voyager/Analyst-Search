import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authService } from './authService';

// Mock fetch
global.fetch = vi.fn();

// Mock getVoyagerBaseUrl
vi.mock('@/lib/config', () => ({
  getVoyagerBaseUrl: () => 'http://test-voyager-base.com',
}));

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('login', () => {
    let mockPopup: { closed: boolean; focus: () => void; close: () => void };

    beforeEach(() => {
      mockPopup = {
        closed: false,
        focus: vi.fn(),
        close: vi.fn(),
      };

      // Mock window.open
      vi.spyOn(window, 'open').mockReturnValue(mockPopup as any);

      // Mock window dimensions
      Object.defineProperty(window, 'screen', {
        writable: true,
        value: {
          width: 1920,
          height: 1080,
        },
      });

      // Mock window.addEventListener
      vi.spyOn(window, 'addEventListener');
      vi.spyOn(window, 'removeEventListener');
    });

    it('should open popup window with correct dimensions and URL', async () => {
      // Immediately close popup to resolve promise
      setTimeout(() => {
        mockPopup.closed = true;
      }, 0);

      await authService.login();

      expect(window.open).toHaveBeenCalledWith(
        'http://test-voyager-base.com/navigo/login',
        'auth_login',
        expect.stringContaining('width=900,height=700')
      );
    });

    it('should center popup window on screen', async () => {
      setTimeout(() => {
        mockPopup.closed = true;
      }, 0);

      await authService.login();

      const callArgs = (window.open as any).mock.calls[0][2];

      // Expected left = (1920 - 900) / 2 = 510
      // Expected top = (1080 - 700) / 2 = 190
      expect(callArgs).toContain('left=510');
      expect(callArgs).toContain('top=190');
    });

    it('should focus the popup window', async () => {
      setTimeout(() => {
        mockPopup.closed = true;
      }, 0);

      await authService.login();

      expect(mockPopup.focus).toHaveBeenCalled();
    });

    it('should alert user if popup is blocked', async () => {
      vi.spyOn(window, 'open').mockReturnValue(null);
      global.alert = vi.fn();

      await authService.login();

      expect(global.alert).toHaveBeenCalledWith(
        'Please allow popups for this site to log in'
      );
    });

    it('should return early if popup is blocked', async () => {
      vi.spyOn(window, 'open').mockReturnValue(null);
      global.alert = vi.fn();

      const result = await authService.login();

      expect(result).toBeUndefined();
    });

    it('should poll for popup closure and resolve when closed', async () => {
      vi.useFakeTimers();

      const loginPromise = authService.login();

      // Advance time and close popup
      vi.advanceTimersByTime(1000);
      mockPopup.closed = true;
      vi.advanceTimersByTime(500);

      await loginPromise;

      expect(mockPopup.closed).toBe(true);

      vi.useRealTimers();
    });

    it('should listen for postMessage AUTH_SUCCESS event', async () => {
      // Immediately close popup to resolve promise
      setTimeout(() => {
        mockPopup.closed = true;
      }, 0);

      await authService.login();

      expect(window.addEventListener).toHaveBeenCalledWith(
        'message',
        expect.any(Function)
      );
    });

    it('should remove event listeners after popup closes', async () => {
      vi.useFakeTimers();

      const loginPromise = authService.login();

      vi.advanceTimersByTime(500);
      mockPopup.closed = true;
      vi.advanceTimersByTime(500);

      await loginPromise;

      expect(window.removeEventListener).toHaveBeenCalledWith(
        'message',
        expect.any(Function)
      );

      vi.useRealTimers();
    });
  });

  describe('getAuthInfo', () => {
    it('should return null when response is not ok', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const result = await authService.getAuthInfo();

      expect(result).toBeNull();
    });

    it('should return null when state is not "loggedin"', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ state: 'loggedout' }),
      });

      const result = await authService.getAuthInfo();

      expect(result).toBeNull();
    });

    it('should return null when user data is missing', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ state: 'loggedin' }),
      });

      const result = await authService.getAuthInfo();

      expect(result).toBeNull();
    });

    it('should fetch from correct endpoint with credentials', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          state: 'loggedin',
          user: {
            id: 'user123',
            name: 'testuser',
            email: 'test@example.com',
          },
        }),
      });

      await authService.getAuthInfo();

      expect(global.fetch).toHaveBeenCalledWith(
        'http://test-voyager-base.com/api/rest/auth/info',
        expect.objectContaining({
          method: 'GET',
          credentials: 'include',
        })
      );
    });

    it('should map Navigo user fields to User interface', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          state: 'loggedin',
          user: {
            id: 'user123',
            name: 'testuser',
            email: 'test@example.com',
            first_name: 'Test',
            last_name: 'User',
            profile_image_url: 'http://example.com/avatar.jpg',
            groups: ['admin', 'users'],
          },
        }),
      });

      const result = await authService.getAuthInfo();

      expect(result).toEqual({
        id: 'user123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        profileImageUrl: 'http://example.com/avatar.jpg',
        username: 'testuser',
        name: 'testuser',
        roles: ['admin', 'users'],
      });
    });

    it('should handle partial user data with fallbacks', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          state: 'loggedin',
          user: {
            name: 'testuser',
          },
        }),
      });

      const result = await authService.getAuthInfo();

      expect(result).toEqual({
        id: 'testuser',
        email: null,
        firstName: null,
        lastName: null,
        profileImageUrl: null,
        username: 'testuser',
        name: 'testuser',
        roles: [],
      });
    });

    it('should use "user" as fallback id when no id or name provided', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          state: 'loggedin',
          user: {
            email: 'test@example.com',
          },
        }),
      });

      const result = await authService.getAuthInfo();

      expect(result?.id).toBe('user');
    });

    it('should return null on fetch error', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await authService.getAuthInfo();

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Auth info error:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('logout', () => {
    it('should call logout endpoint with credentials', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
      });

      await authService.logout();

      expect(global.fetch).toHaveBeenCalledWith(
        'http://test-voyager-base.com/api/rest/auth/logout',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
        })
      );
    });

    it('should handle logout errors gracefully', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await authService.logout();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Logout error:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should not throw error on logout failure', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));
      vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(authService.logout()).resolves.toBeUndefined();
    });
  });
});
