import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('cas_token'));
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const data = await authAPI.getMe();
      setUser(data.user);
    } catch {
      localStorage.removeItem('cas_token');
      localStorage.removeItem('cas_user');
      setToken(null);
      setUser(null);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (email, password) => {
    const data = await authAPI.login({ email, password });
    localStorage.setItem('cas_token', data.token);
    localStorage.setItem('cas_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const register = async (name, email, password, phone) => {
    const data = await authAPI.register({ name, email, password, phone });
    localStorage.setItem('cas_token', data.token);
    localStorage.setItem('cas_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('cas_show_welcome_splash', '1');
    }
    return data;
  };

  const logout = () => {
    localStorage.removeItem('cas_token');
    localStorage.removeItem('cas_user');
    setToken(null);
    setUser(null);
  };

  const updatePreferences = async (prefs) => {
    const data = await authAPI.updatePreferences(prefs);
    setUser((prev) => ({ ...prev, preferences: data.preferences }));
  };

  return (
    <AuthContext.Provider value={{
      user, token, loading, login, register, logout, updatePreferences,
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
