import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';
//http://localhost:5000
const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

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
    if (error.response?.status === 401) {
      localStorage.removeItem('cas_token');
      localStorage.removeItem('cas_user');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
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
