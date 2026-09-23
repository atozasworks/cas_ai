import axios from 'axios';
import { getRuntimeConfig } from './runtimeConfig';

const ADMIN_TOKEN_KEY = 'adminToken';
const ADMIN_USER_KEY = 'adminUser';

const adminClient = axios.create({
  baseURL: getRuntimeConfig().apiUrl || '/api/v1',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

adminClient.interceptors.request.use((config) => {
  const runtimeUrl = String(getRuntimeConfig().apiUrl || '').trim().replace(/\/+$/, '');
  if (runtimeUrl) config.baseURL = runtimeUrl;

  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

adminClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const requestUrl = error.config?.url || '';
    const isLoginAttempt = requestUrl.includes('/admin/login');

    if (error.response?.status === 401 && !isLoginAttempt) {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      localStorage.removeItem(ADMIN_USER_KEY);
      if (window.location.pathname !== '/home/admin/login') {
        window.location.href = '/home/admin/login';
      }
    }
    return Promise.reject(error.response?.data || error);
  }
);

export const adminAPI = {
  login: (username, password) => adminClient.post('/admin/login', { username, password }),
  getDashboard: () => adminClient.get('/admin/dashboard'),
  getUsers: (params) => adminClient.get('/admin/users', { params }),
  getUser: (id) => adminClient.get(`/admin/users/${id}`),
  setUserBlocked: (id, blocked) => adminClient.patch(`/admin/users/${id}/block`, { blocked }),
  getAlerts: (params) => adminClient.get('/admin/alerts', { params }),
  getAlert: (id) => adminClient.get(`/admin/alerts/${id}`),
  getEmergencyContacts: (params) => adminClient.get('/admin/emergency-contacts', { params }),
  createEmergencyContact: (data) => adminClient.post('/admin/emergency-contacts', data),
  updateEmergencyContact: (id, data) => adminClient.patch(`/admin/emergency-contacts/${id}`, data),
  deleteEmergencyContact: (id) => adminClient.delete(`/admin/emergency-contacts/${id}`),
  getSettings: () => adminClient.get('/admin/settings'),
  updateSettings: (data) => adminClient.put('/admin/settings', data),
};

export const ADMIN_STORAGE = { token: ADMIN_TOKEN_KEY, user: ADMIN_USER_KEY };

export default adminClient;
