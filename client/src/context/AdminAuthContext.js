import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { adminAPI, ADMIN_STORAGE } from '../services/adminApi';

const AdminAuthContext = createContext(null);

const readStoredAdmin = () => {
  try {
    const token = localStorage.getItem(ADMIN_STORAGE.token);
    const rawUser = localStorage.getItem(ADMIN_STORAGE.user);
    return {
      token,
      adminUser: rawUser ? JSON.parse(rawUser) : null,
    };
  } catch {
    return { token: null, adminUser: null };
  }
};

export function AdminAuthProvider({ children }) {
  const stored = readStoredAdmin();
  const [adminToken, setAdminToken] = useState(stored.token);
  const [adminUser, setAdminUser] = useState(stored.adminUser);

  const login = useCallback(async (username, password) => {
    const data = await adminAPI.login(username, password);
    if (!data?.token || !data?.adminUser) {
      throw new Error('Admin login failed');
    }
    localStorage.setItem(ADMIN_STORAGE.token, data.token);
    localStorage.setItem(ADMIN_STORAGE.user, JSON.stringify(data.adminUser));
    setAdminToken(data.token);
    setAdminUser(data.adminUser);
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(ADMIN_STORAGE.token);
    localStorage.removeItem(ADMIN_STORAGE.user);
    setAdminToken(null);
    setAdminUser(null);
  }, []);

  const value = useMemo(() => ({
    adminToken,
    adminUser,
    login,
    logout,
    isAdminAuthenticated: Boolean(adminToken && adminUser),
  }), [adminToken, adminUser, login, logout]);

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export const useAdminAuth = () => {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
};
