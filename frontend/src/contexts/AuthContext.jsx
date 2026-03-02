import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { jwtDecode } from 'jwt-decode';
import config from '../config';
import { toast } from 'react-toastify';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
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

// ------------------ OTP state ------------------
const [otpSent, setOtpSent] = useState(false);
const [otpCountdown, setOtpCountdown] = useState(0);
const otpTimerRef = useRef(null);

// ------------------ OTP countdown ------------------
const startOtpCountdown = (seconds) => {
  setOtpCountdown(seconds);
  setOtpSent(true);

  if (otpTimerRef.current) clearInterval(otpTimerRef.current);

  otpTimerRef.current = setInterval(() => {
    setOtpCountdown((prev) => {
      if (prev <= 1) {
        clearInterval(otpTimerRef.current);
        setOtpSent(false);
        return 0;
      }
      return prev - 1;
    });
  }, 1000);
};

// ------------------ Registration OTP ------------------
const sendRegistrationOtp = async (email, password) => {
  try {
    // Creating Unverified account then Sending OTP
    const res = await fetch(`${config.API_BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to send OTP');

    startOtpCountdown(data.wait_seconds);
    toast.success(data.message || 'OTP sent to your email');
    return true;
  } catch (err) {
    toast.error(err.message || 'Failed to send OTP');
    return false;
  }
};

// Verifying OTP Then Marking Account as Verified
const verifyRegistrationOtp = async (email, otp) => {
  try {
    const res = await fetch(`${config.API_BASE_URL}/verify-account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'OTP verification failed');

    toast.success(data.message || 'OTP verified');
    return true;
  } catch (err) {
    toast.error(err.message || 'OTP verification failed');
    return false;
  }
};

// ------------------ Resend OTP ------------------
const resendOtp = async (email = null) => {
  if (otpCountdown > 0 || resendLoading) {
    toast.info(`Please wait ${otpCountdown}s before resending OTP`);
    return false;
  }

  setResendLoading(true); 

  try {
    let res;

    // Registration flow (public)
    if (email) {
      res = await fetch(`${config.API_BASE_URL}/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
    }
    // Logged-in flows (change password)
    else {
      res = await authFetch(`${config.API_BASE_URL}/resend-otp`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to resend OTP');

    startOtpCountdown(data.wait_seconds || 60);
    toast.success(data.message || 'New OTP sent to your email');
    return true;
  } catch (err) {
    toast.error(err.message || 'Failed to resend OTP');
    return false;
  } finally {
    setResendLoading(false); 
  }
};

// ------------------ Password Change OTP ------------------
const sendChangePasswordOtp = async (currentPassword, resend = false) => {
  if (!user?.email) {
    toast.error('User not found');
    return false;
  }

  try {
    const res = await authFetch(`${config.API_BASE_URL}/change-password`, {
      method: 'POST',
      body: JSON.stringify({ current_password: currentPassword, resend }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to send OTP');

    startOtpCountdown(data.wait_seconds || 300);
    toast.success(data.message || 'OTP sent to your email');
    return true;
  } catch (err) {
    toast.error(err.message || 'Failed to send OTP');
    return false;
    
  }
};

// ------------------ Complete Password Change ------------------
const completeChangePassword = async (currentPassword, newPassword, otp) => {
  if (!user?.email) {
    toast.error('User not found');
    return false;
  }

  try {
    const res = await authFetch(`${config.API_BASE_URL}/change-password`, {
      method: 'POST',
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword, otp }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Password change failed');

    toast.success(data.message || 'Password changed successfully');
    logout(false); // force re-login
    return true;
  } catch (err) {
    toast.error(err.message || 'Password change failed');
  }
    finally {
      setChangePasswordLoading(true);
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
    setDeleteAccountLoading(true);
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
    // auth state
    user,
    isLoading,
    isAuthenticated: !!user,

    // auth actions
    login,
    logout,
    authFetch,

    // registration OTP
    sendRegistrationOtp,
    verifyRegistrationOtp,

    //resend OTP
    resendOtp,

    // password change OTP
    sendChangePasswordOtp,
    completeChangePassword,

    // account management
    deleteAccount,

    // loading states
    changePasswordLoading,
    deleteAccountLoading,

    // OTP UI state
    otpSent,
    otpCountdown,
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



