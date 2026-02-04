import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { jwtDecode } from 'jwt-decode';
import config from '../config';
import { toast } from 'react-toastify';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);

  const refreshTimer = useRef(null);

  // ------------------ Load saved user ------------------
  useEffect(() => {
    try {
      const stored = localStorage.getItem('titanUser');
      if (stored) {
        const parsed = JSON.parse(stored);

        if (parsed.role === 'admin' || parsed.role === 'buyer') {
          setUser(parsed);
        } else {
          localStorage.removeItem('titanUser');
        }
      }
    } catch (err) {
      console.error('[AuthProvider] localStorage error:', err);
      localStorage.removeItem('titanUser');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ------------------ Token expiry check ------------------
  const isTokenExpired = (token) => {
    try {
      const decoded = jwtDecode(token);
      return !decoded.exp || decoded.exp < Date.now() / 1000;
    } catch {
      return true;
    }
  };

  // ------------------ Protected fetch ------------------
  const authFetch = async (url, options = {}) => {
    let tokenToUse = user?.token;

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
      const newToken = await refreshAccessToken(user.refreshToken);
      if (!newToken) throw new Error('Re-authentication required');

      return fetch(url, {
        ...options,
        headers: { ...headers, Authorization: `Bearer ${newToken}` },
      });
    }

    return res;
  };

  // ------------------ Refresh access token ------------------
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
      if (!res.ok || !data.access_token) throw new Error();

      const updatedUser = {
        ...user,
        token: data.access_token,
      };

      localStorage.setItem('titanUser', JSON.stringify(updatedUser));
      setUser(updatedUser);

      scheduleTokenRefresh(data.access_token, refreshToken);
      return data.access_token;
    } catch (err) {
      logout(false);
      toast.error('Session expired. Please log in again.');
      return null;
    }
  };

  // ------------------ Auto-schedule refresh ------------------
  const scheduleTokenRefresh = (accessToken, refreshToken) => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);

    try {
      const decoded = jwtDecode(accessToken);
      const refreshTime = decoded.exp * 1000 - Date.now() - 2 * 60 * 1000;

      if (refreshTime > 0) {
        refreshTimer.current = setTimeout(() => {
          refreshAccessToken(refreshToken);
        }, refreshTime);
      }
    } catch (err) {
      console.error('[AuthProvider] schedule error:', err);
    }
  };

  // ------------------ Login ------------------
  const login = async (email, password) => {
    setIsLoading(true);

    try {
      const res = await fetch(`${config.API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      const decoded = jwtDecode(data.access_token);

      const userInfo = {
        id: decoded.sub,
        email,
        role: data.role,
        token: data.access_token,
        refreshToken: data.refresh_token,
      };

      localStorage.setItem('titanUser', JSON.stringify(userInfo));
      setUser(userInfo);

      scheduleTokenRefresh(data.access_token, data.refresh_token);
      toast.success('Logged in successfully');
    } catch (err) {
      toast.error(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  // ------------------ Register ------------------
  const register = async (email, password) => {
    setIsLoading(true);

    try {
      const res = await fetch(`${config.API_BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      toast.success('Registration successful');
    } catch (err) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  // ------------------ Change password ------------------
  const changePassword = async (currentPassword, newPassword) => {
   setChangePasswordLoading(true);

  try {
    const res = await authFetch(`${config.API_BASE_URL}/change-password`, {
      method: 'POST',
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to change password');

    toast.success('Password changed. Please log in again.');
    logout(false); 
  } catch (err) {
    toast.error(err.message || 'Password change failed');
  } finally {
    setChangePasswordLoading(false);
  }
 };

  // ------------------ Delete account ------------------
  const deleteAccount = async (password) => {
    setDeleteAccountLoading(true);

  try {
    const res = await authFetch(`${config.API_BASE_URL}/delete-account`, {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete account');

    toast.success('Account deleted');
    logout(false);
  } catch (err) {
    toast.error(err.message || 'Account deletion failed');
  } finally {
    setDeleteAccountLoading(false);
  }
 };


  // ------------------ Logout ------------------
  const logout = (showToast = true) => {
    localStorage.removeItem('titanUser');
    setUser(null);
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    if (showToast) toast.success('Logged out successfully');
  };

  // ------------------ Start refresh on login ------------------
  useEffect(() => {
    if (user?.token && user.refreshToken) {
      scheduleTokenRefresh(user.token, user.refreshToken);
    }
    return () => refreshTimer.current && clearTimeout(refreshTimer.current);
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        changePassword,
        deleteAccount,
        changePasswordLoading,
        deleteAccountLoading,
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
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};



