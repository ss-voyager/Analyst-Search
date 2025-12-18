# Prompt: Implement Popup-Based Authentication Flow

**Goal:** Implement a login flow that opens an external authentication page in a popup window, waits for the user to complete login, then updates the app's auth state.

## Requirements

### 1. Open Login as Popup (not tab)
- Use `window.open()` with features: `popup=yes,width=900,height=700,left=${centered},top=${centered},scrollbars=yes,resizable=yes`
- Calculate centered position using `window.screen.width/height`
- Target URL: `${baseUrl}/login` (configurable base URL)

### 2. Wait for Popup to Close
- Use `setInterval` to poll `popup.closed` every 500ms
- Clear interval when popup closes
- Also listen for `window.postMessage` in case the auth page can signal completion

### 3. Check Auth Status After Popup Closes
- Call auth info endpoint: `GET ${baseUrl}/api/auth/info` with `credentials: 'include'`
- Check response for logged-in state (e.g., `state === 'loggedin'`)
- Parse user data from response (e.g., `response.user.name`, `response.user.id`, `response.user.groups`)

### 4. Update Auth State in React Context
- After `login()` function resolves, call `refreshAuth()` to update user state
- This ensures UI updates automatically without manual page refresh

## Key Files Structure

```
src/
├── services/authService.ts    # login(), getAuthInfo(), logout()
├── contexts/AuthContext.tsx   # AuthProvider with user state, login/logout/refreshAuth
└── components/LoginButton.tsx # UI trigger
```

## Auth Service Pattern

```typescript
// services/authService.ts

export interface User {
  username: string;
  email?: string;
  name?: string;
  roles?: string[];
}

export const authService = {
  login: async () => {
    const baseUrl = getBaseUrl(); // From config
    const loginUrl = `${baseUrl}navigo/login`;

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
      const baseUrl = getBaseUrl();
      const response = await fetch(`${baseUrl}api/rest/auth/info`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      if (data.state === 'loggedin') {
        return {
          username: data.user?.name || data.user?.id || 'user',
          email: data.user?.email,
          name: data.user?.name || data.user?.id,
          roles: data.user?.groups || [],
        };
      }

      return null;
    } catch (error) {
      console.error('Auth info error:', error);
      return null;
    }
  },

  logout: async () => {
    const baseUrl = getBaseUrl();
    await fetch(`${baseUrl}api/rest/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  },
};
```

## Auth Context Pattern

```typescript
// contexts/AuthContext.tsx

import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService, User } from '../services/authService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshAuth = async () => {
    try {
      const authInfo = await authService.getAuthInfo();
      setUser(authInfo);
    } catch (error) {
      console.error('Failed to refresh auth:', error);
      setUser(null);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      setLoading(true);
      await refreshAuth();
      setLoading(false);
    };
    checkAuth();
  }, []);

  const login = async () => {
    await authService.login();
    // Auto-refresh auth state after popup closes
    await refreshAuth();
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

## Login Button Component

```typescript
// components/LoginButton.tsx

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export const LoginButton: React.FC = () => {
  const { login } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await login();
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <button
      onClick={handleLogin}
      disabled={isLoggingIn}
    >
      {isLoggingIn ? 'Opening...' : 'Sign In'}
    </button>
  );
};
```

## Important Notes

1. **Credentials:** Use `credentials: 'include'` on all auth API calls to send cookies

2. **Same-Origin Policy:** App must be on same domain (or subdomain with shared cookies) as auth server

3. **Cookie Settings:** For subdomain cookie sharing:
   - Cookie `Path` should be `/` (not restricted to a specific path)
   - Cookie `Domain` should be `.yourdomain.com` (parent domain)
   - `SameSite` should be `Lax` or `None` (not `Strict`)

4. **Response Format:** Check the actual response format from your auth server - it may use `'loggedin'`, `'authenticated'`, or other values

5. **Popup Blockers:** Handle the case where popup is blocked by returning early with an alert

6. **CORS:** If auth server is on a different domain, ensure proper CORS headers are set:
   - `Access-Control-Allow-Origin: https://yourapp.com`
   - `Access-Control-Allow-Credentials: true`
