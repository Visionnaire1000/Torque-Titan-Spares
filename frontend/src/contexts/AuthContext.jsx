import { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import config from '../config';
import { toast } from 'react-toastify';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  console.log('[AuthProvider] render'); 
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('[AuthProvider] useEffect start');
    try {
      const stored = localStorage.getItem('farmartUser');
      console.log('[AuthProvider] storedUser:', stored);
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('[AuthProvider] parsedUser:', parsed);
        setUser(parsed);
      }
    } catch (err) {
      console.error('[AuthProvider] error reading localStorage:', err);
      localStorage.removeItem('farmartUser');
    } finally {
      setIsLoading(false);
      console.log('[AuthProvider] isLoading → false');
    }
  }, []);

  const login = async (email, password) => {
    console.log('[AuthProvider] login()', { email });
    setIsLoading(true);
    try {
      const res = await fetch(`${config.API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      console.log('[AuthProvider] login response status:', res.status);
      const data = await res.json();
      console.log('[AuthProvider] login response data:', data);
      if (!res.ok || !data.access_token) {
        throw new Error(data.error || 'No access_token');
      }
      let decoded;
      try {
        decoded = jwtDecode(data.access_token);
        console.log('[AuthProvider] decoded token:', decoded);
      } catch {
        throw new Error('Invalid JWT');
      }
      const userInfo = {
        id: decoded.sub,
        email,
        role: data.role,
        token: data.access_token,
      };
      localStorage.setItem('farmartUser', JSON.stringify(userInfo));
      setUser(userInfo);
      toast.success('Logged in successfully');
    } catch (err) {
      console.error('[AuthProvider] login error:', err);
      toast.error(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
      console.log('[AuthProvider] login() isLoading → false');
    }
  };

  const register = async (name, email, password, role) => {
    console.log('[AuthProvider] register()', { name, email, role });
    setIsLoading(true);
    try {
      const res = await fetch(`${config.API_BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });
      console.log('[AuthProvider] register status:', res.status);
      const data = await res.json();
      console.log('[AuthProvider] register data:', data);
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      
      toast.success('Registration successful');
    } catch (err) {
      console.error('[AuthProvider] register error:', err);
      toast.error(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
      console.log('[AuthProvider] register() isLoading → false');
    }
  };

  const logout = () => {
    console.log('[AuthProvider] logout()');
    localStorage.removeItem('farmartUser');
    setUser(null);
    toast.success('Logged out');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
        isFarmer: user?.role === 'farmer',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be inside AuthProvider');
  }
  return ctx;
};