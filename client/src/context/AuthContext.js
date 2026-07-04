import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('cas_token'));
  const [loading, setLoading] = useState(true);
  const skipNextLoadUserRef = useRef(false);

  const loadUser = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    // Google auth already set user — skip redundant /me round-trip
    if (skipNextLoadUserRef.current) {
      skipNextLoadUserRef.current = false;
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

  const requestOtp = async (email, purpose = 'login') => authAPI.requestOtp({ email, purpose });

  const verifySignupOtp = async (email, otp) => authAPI.verifySignupOtp({ email, otp });

  const login = async (email, otp) => {
    const data = await authAPI.login({ email, otp });
    localStorage.setItem('cas_token', data.token);
    localStorage.setItem('cas_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const register = async (name, email, phone, otp) => {
    const data = await authAPI.registerWithOtp({ name, email, phone, otp });
    localStorage.setItem('cas_token', data.token);
    localStorage.setItem('cas_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('cas_show_welcome_splash', '1');
    }
    return data;
  };

  const googleAuth = async (credential) => {
    const data = await authAPI.googleAuth({ credential });
    localStorage.setItem('cas_token', data.token);
    localStorage.setItem('cas_user', JSON.stringify(data.user));
    skipNextLoadUserRef.current = true;
    setUser(data.user);
    setToken(data.token);
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
    setUser((prev) => {
      const nextUser = { ...prev, preferences: data.preferences };
      localStorage.setItem('cas_user', JSON.stringify(nextUser));
      return nextUser;
    });
  };

  const updateProfile = async (profile) => {
    const data = await authAPI.updateProfile(profile);
    setUser(data.user);
    localStorage.setItem('cas_user', JSON.stringify(data.user));
    return data.user;
  };

  return (
    <AuthContext.Provider value={{
      user, token, loading, login, register, logout, updatePreferences, updateProfile,
      requestOtp, verifySignupOtp, googleAuth,
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
