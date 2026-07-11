import { io } from 'socket.io-client';
import { getRuntimeConfig } from './runtimeConfig';

const normalizeBaseUrl = (value) => String(value || '').trim().replace(/\/+$/, '');

/*
 * Easy manual switch (if needed):
 * HOME URLs:
 *   // http://localhost:7760/home
 *   // https://casai.testatozas.in/home
 *   // https://www.ucasaapp.com/home
 *
 * SOCKET origins (use one of these if you want manual forcing):
 *   // const MANUAL_SOCKET_URL = 'http://localhost:5000';
 *   // const MANUAL_SOCKET_URL = 'https://casai.testatozas.in';
 *   // const MANUAL_SOCKET_URL = 'https://www.ucasaapp.com';
 */
const MANUAL_SOCKET_URL = '';

const deriveSocketUrl = () => {
  const forcedManualUrl = normalizeBaseUrl(MANUAL_SOCKET_URL);
  if (forcedManualUrl) return forcedManualUrl;

  const envSocketUrl = normalizeBaseUrl(process.env.REACT_APP_SOCKET_URL);
  if (envSocketUrl) return envSocketUrl;

  const runtimeApiUrl = normalizeBaseUrl(getRuntimeConfig()?.apiUrl);
  if (runtimeApiUrl) {
    // Convert full API URL like https://domain.com/api/v1 to socket origin https://domain.com
    try {
      const parsed = new URL(runtimeApiUrl, window.location.origin);
      return `${parsed.protocol}//${parsed.host}`;
    } catch (_) {
      // Ignore parse errors and continue fallback chain.
    }
  }

  return window.location.origin;
};

let socket = null;

export function connectSocket() {
  if (socket?.connected) return socket;
  const socketUrl = deriveSocketUrl();
  if (socket) {
    socket.removeAllListeners();
    socket.close();
    socket = null;
  }

  socket = io(socketUrl, {
    // Start with polling for reliability on restrictive mobile networks, then upgrade to websocket.
    transports: ['polling', 'websocket'],
    tryAllTransports: true,
    path: '/socket.io',
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: 20,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 10000,
    timeout: 10000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket.id, 'url:', socketUrl);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    console.error('[Socket] Connection error:', err.message);
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function joinVehicleRoom(vehicleId, userId) {
  if (socket?.connected) {
    socket.emit('join:vehicle', { vehicleId, userId });
  }
}

export function sendLocationUpdate(data) {
  if (socket?.connected) {
    socket.emit('location:update', data);
  }
}

export function confirmSafe(incidentId) {
  if (socket?.connected) {
    socket.emit('emergency:iam-safe', { incidentId });
  }
}

export function reportEmergency(data) {
  if (socket?.connected) {
    socket.emit('emergency:report', data);
  }
}
