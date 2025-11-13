import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { jwtDecode } from 'jwt-decode';
import config from '../config';
import { toast } from 'react-toastify';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  console.log('[AuthProvider] render');
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshTimer = useRef(null);

  // ------------------ Load user from localStorage ------------------
  useEffect(() => {
    console.log('[AuthProvider] useEffect start');
    try {
      const stored = localStorage.getItem('titanUser');
      if (stored) {
        const parsed = JSON.parse(stored);
        setUser(parsed);
      }
    } catch (err) {
      console.error('[AuthProvider] error reading localStorage:', err);
      localStorage.removeItem('titanUser');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ------------------ Helper: Check if token expired ------------------
  const isTokenExpired = (token) => {
    try {
      const decoded = jwtDecode(token);
      if (!decoded.exp) return true;
      const now = Date.now() / 1000;
      return decoded.exp < now;
    } catch {
      return true;
    }
  };

  // ------------------ Secure fetch wrapper ------------------
  const authFetch = async (url, options = {}) => {
    let tokenToUse = user?.token;

    // Auto-refresh if expired
    if (user?.token && isTokenExpired(user.token) && user.refreshToken) {
      tokenToUse = await refreshAccessToken(user.refreshToken);
      if (!tokenToUse) throw new Error('Token refresh failed');
    }

    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };
    if (tokenToUse) headers.Authorization = `Bearer ${tokenToUse}`;

    const res = await fetch(url, { ...options, headers });

    if (res.status === 401 && user?.refreshToken) {
      console.warn('[authFetch] 401 detected, attempting refresh...');
      const newToken = await refreshAccessToken(user.refreshToken);
      if (!newToken) throw new Error('Re-authentication required');

      const retryRes = await fetch(url, {
        ...options,
        headers: { ...headers, Authorization: `Bearer ${newToken}` },
      });
      return retryRes;
    }

    return res;
  };

  // ------------------ Helper: Refresh access token ------------------
  const refreshAccessToken = async (refreshToken) => {
    try {
      const res = await fetch(`${config.API_BASE_URL}/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${refreshToken}`,
        },
      });

      const data = await res.json();
      if (!res.ok || !data.access_token) throw new Error(data.error || 'Failed to refresh token');

      const updatedUser = { ...user, token: data.access_token };
      localStorage.setItem('titanUser', JSON.stringify({ ...updatedUser, refreshToken }));
      setUser(updatedUser);

      console.log('[AuthProvider] Access token refreshed');
      scheduleTokenRefresh(data.access_token, refreshToken);
      return data.access_token;
    } catch (err) {
      console.error('[AuthProvider] refresh failed:', err);
      toast.error('Session expired, please log in again');
      logout(false);
      return null;
    }
  };

  // ------------------ Auto refresh scheduler ------------------
  const scheduleTokenRefresh = (accessToken, refreshToken) => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    try {
      const decoded = jwtDecode(accessToken);
      if (!decoded.exp) return;

      const expTime = decoded.exp * 1000; // ms
      const refreshTime = expTime - Date.now() - 2 * 60 * 1000; // 2 mins before expiry

      if (refreshTime > 0) {
        console.log(`[AuthProvider] scheduling refresh in ${Math.floor(refreshTime / 1000)}s`);
        refreshTimer.current = setTimeout(() => {
          refreshAccessToken(refreshToken);
        }, refreshTime);
      }
    } catch (err) {
      console.error('[AuthProvider] schedule refresh error:', err);
    }
  };

  // ------------------ Login ------------------
  const login = async (email, password) => {
    console.log('[AuthProvider] login()', { email });
    setIsLoading(true);

    try {
      const res = await authFetch(`${config.API_BASE_URL}/login`, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.access_token) throw new Error(data.error || 'Login failed');

      const decoded = jwtDecode(data.access_token);
      const userInfo = {
        id: decoded.sub,
        email,
        token: data.access_token,
        refreshToken: data.refresh_token,
      };

      localStorage.setItem('titanUser', JSON.stringify(userInfo));
      setUser(userInfo);
      scheduleTokenRefresh(data.access_token, data.refresh_token);
      toast.success('Logged in successfully');
    } catch (err) {
      console.error('[AuthProvider] login error:', err);
      toast.error(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  // ------------------ Register ------------------
  const register = async (email, password) => {
    console.log('[AuthProvider] register()', { email });
    setIsLoading(true);

    try {
      const res = await authFetch(`${config.API_BASE_URL}/register`, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      toast.success('Registration successful');
    } catch (err) {
      console.error('[AuthProvider] register error:', err);
      toast.error(err.message || ' Registration failed');
    } finally {
      setIsLoading(false);
    }
  };


  // ------------------ Logout ------------------
  const logout = (showToast = true) => {
    localStorage.removeItem('titanUser');
    setUser(null);
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    if (showToast) {
       toast.success('Logged out successfully');
    }
  };

  // ------------------ Auto-start refresh timer when user loads ------------------
  useEffect(() => {
    if (user?.token && user.refreshToken) {
      scheduleTokenRefresh(user.token, user.refreshToken);
    }
    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        authFetch,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};


