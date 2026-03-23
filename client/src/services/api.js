import axios from 'axios';
import { getRuntimeConfig } from './runtimeConfig';

const initialRuntimeConfig = getRuntimeConfig();

const api = axios.create({
  baseURL: initialRuntimeConfig.apiUrl || '/api/v1',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

export const setApiBaseUrl = (baseUrl) => {
  const normalized = String(baseUrl || '').trim().replace(/\/+$/, '');
  if (normalized) {
    api.defaults.baseURL = normalized;
  }
};







api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cas_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const requestUrl = error.config?.url || '';
    const isAuthAttempt = requestUrl.includes('/auth/login')
      || requestUrl.includes('/auth/request-otp')
      || requestUrl.includes('/auth/register')
      || requestUrl.includes('/auth/register-otp')
      || requestUrl.includes('/auth/verify-signup-otp')
      || requestUrl.includes('/auth/google');

    if (error.response?.status === 401 && !isAuthAttempt) {
      localStorage.removeItem('cas_token');
      localStorage.removeItem('cas_user');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  requestOtp: (data) => api.post('/auth/request-otp', data),
  registerWithOtp: (data) => api.post('/auth/register-otp', data),
  verifySignupOtp: (data) => api.post('/auth/verify-signup-otp', data),
  login: (data) => api.post('/auth/login', data),
  googleAuth: (data) => api.post('/auth/google', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.patch('/auth/profile', data),
  updatePreferences: (data) => api.patch('/auth/preferences', data),
};

export const vehicleAPI = {
  create: (data) => api.post('/vehicles', data),
  getAll: () => api.get('/vehicles'),
  getAllForMap: () => api.get('/vehicles/map-all'),
  getById: (id) => api.get(`/vehicles/${id}`),
  update: (id, data) => api.patch(`/vehicles/${id}`, data),
  remove: (id) => api.delete(`/vehicles/${id}`),
};

export const analyticsAPI = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getDriverScore: () => api.get('/analytics/driver-score'),
  getRiskEvents: (params) => api.get('/analytics/risk-events', { params }),
  getTrips: (params) => api.get('/analytics/trips', { params }),
  getIncidents: (params) => api.get('/analytics/incidents', { params }),
};

export const aiAPI = {
  chat: (message, drivingContext) => api.post('/ai/chat', { message, drivingContext }),
};

export default api;
