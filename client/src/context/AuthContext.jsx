import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [xp, setXp] = useState(null);
  const [loading, setLoading] = useState(true);

  const bootstrap = useCallback(async () => {
    try {
      const data = await api.auth.me();
      setUser(data.user);
      setXp(data.xp);
    } catch (error) {
      if (error.status !== 401) {
        console.error('Session bootstrap failed:', error.message);
      }
      setUser(null);
      setXp(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
    const onUnauthorized = () => {
      setUser(null);
      setXp(null);
    };
    window.addEventListener('learnmate:unauthorized', onUnauthorized);
    return () => window.removeEventListener('learnmate:unauthorized', onUnauthorized);
  }, [bootstrap]);

  const login = useCallback(async (credentials) => {
    const data = await api.auth.login(credentials);
    setUser(data.user);
    setXp(data.xp);
    return data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const data = await api.auth.register(payload);
    setUser(data.user);
    setXp(data.xp);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } catch (error) {
      console.warn('Sign out request failed:', error.message);
    } finally {
      setUser(null);
      setXp(null);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const data = await api.auth.me();
      setUser(data.user);
      setXp(data.xp);
      return data;
    } catch (error) {
      if (error.status === 401) {
        setUser(null);
        setXp(null);
      }
      throw error;
    }
  }, []);

  const updateUser = useCallback((nextUser, nextXp) => {
    if (nextUser) setUser(nextUser);
    if (nextXp) setXp(nextXp);
  }, []);

  const value = useMemo(
    () => ({ user, xp, loading, login, register, logout, refresh, updateUser, isAuthenticated: Boolean(user) }),
    [user, xp, loading, login, register, logout, refresh, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

export default AuthContext;
