import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { authService } from '@/services/authService';
import type { ReactNode } from 'react';

// Mock authService
vi.mock('@/services/authService', () => ({
  authService: {
    login: vi.fn(),
    getAuthInfo: vi.fn(),
    logout: vi.fn(),
  },
}));

describe('AuthContext', () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('useAuth hook', () => {
    it('should throw error when used outside AuthProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');

      consoleSpy.mockRestore();
    });

    it('should return auth context when used within AuthProvider', () => {
      (authService.getAuthInfo as any).mockResolvedValue(null);

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current).toHaveProperty('user');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('isAuthenticated');
      expect(result.current).toHaveProperty('login');
      expect(result.current).toHaveProperty('logout');
      expect(result.current).toHaveProperty('refreshAuth');
    });
  });

  describe('initial state', () => {
    it('should start with loading true', () => {
      (authService.getAuthInfo as any).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should call getAuthInfo on mount', async () => {
      (authService.getAuthInfo as any).mockResolvedValue(null);

      renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(authService.getAuthInfo).toHaveBeenCalledTimes(1);
      });
    });

    it('should set loading to false after initial auth check', async () => {
      (authService.getAuthInfo as any).mockResolvedValue(null);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('authentication state', () => {
    it('should set user when getAuthInfo returns user data', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        profileImageUrl: null,
        username: 'testuser',
        name: 'testuser',
        roles: ['user'],
      };

      (authService.getAuthInfo as any).mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should set user to null when getAuthInfo returns null', async () => {
      (authService.getAuthInfo as any).mockResolvedValue(null);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).toBeNull();
        expect(result.current.isAuthenticated).toBe(false);
      });
    });

    it('should handle getAuthInfo errors gracefully', async () => {
      (authService.getAuthInfo as any).mockRejectedValue(
        new Error('Network error')
      );
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).toBeNull();
        expect(result.current.isLoading).toBe(false);
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to refresh auth:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('login', () => {
    it('should call authService.login and refresh auth', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        profileImageUrl: null,
        username: 'testuser',
        name: 'testuser',
        roles: ['user'],
      };

      (authService.getAuthInfo as any).mockResolvedValue(null);
      (authService.login as any).mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Now mock successful login
      (authService.getAuthInfo as any).mockResolvedValue(mockUser);

      await act(async () => {
        await result.current.login();
      });

      expect(authService.login).toHaveBeenCalled();
      expect(authService.getAuthInfo).toHaveBeenCalledTimes(2); // Initial + after login

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
        expect(result.current.isAuthenticated).toBe(true);
      });
    });

    it('should handle login errors', async () => {
      (authService.getAuthInfo as any).mockResolvedValue(null);
      (authService.login as any).mockRejectedValue(new Error('Login failed'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.login();
        })
      ).rejects.toThrow('Login failed');
    });
  });

  describe('logout', () => {
    it('should call authService.logout and clear user state', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        profileImageUrl: null,
        username: 'testuser',
        name: 'testuser',
        roles: ['user'],
      };

      (authService.getAuthInfo as any).mockResolvedValue(mockUser);
      (authService.logout as any).mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(authService.logout).toHaveBeenCalled();
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should handle logout errors gracefully', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        profileImageUrl: null,
        username: 'testuser',
        name: 'testuser',
        roles: ['user'],
      };

      (authService.getAuthInfo as any).mockResolvedValue(mockUser);
      (authService.logout as any).mockRejectedValue(new Error('Logout failed'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Logout failed:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('refreshAuth', () => {
    it('should update user state when called', async () => {
      const initialUser = {
        id: 'user123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        profileImageUrl: null,
        username: 'testuser',
        name: 'testuser',
        roles: ['user'],
      };

      const updatedUser = {
        ...initialUser,
        firstName: 'Updated',
      };

      (authService.getAuthInfo as any).mockResolvedValue(initialUser);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).toEqual(initialUser);
      });

      // Mock updated user data
      (authService.getAuthInfo as any).mockResolvedValue(updatedUser);

      await act(async () => {
        await result.current.refreshAuth();
      });

      expect(result.current.user).toEqual(updatedUser);
    });

    it('should clear user state if refreshAuth returns null', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        profileImageUrl: null,
        username: 'testuser',
        name: 'testuser',
        roles: ['user'],
      };

      (authService.getAuthInfo as any).mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      // Mock session expired
      (authService.getAuthInfo as any).mockResolvedValue(null);

      await act(async () => {
        await result.current.refreshAuth();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('isAuthenticated', () => {
    it('should be true when user is set', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        profileImageUrl: null,
        username: 'testuser',
        name: 'testuser',
        roles: ['user'],
      };

      (authService.getAuthInfo as any).mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });
    });

    it('should be false when user is null', async () => {
      (authService.getAuthInfo as any).mockResolvedValue(null);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false);
      });
    });
  });
});
