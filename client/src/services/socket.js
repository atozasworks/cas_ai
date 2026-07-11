import { io } from 'socket.io-client';
import { getRuntimeConfig } from './runtimeConfig';

const normalizeBaseUrl = (value) => String(value || '').trim().replace(/\/+$/, '');

const deriveSocketUrl = () => {
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

  socket = io(socketUrl, {
    transports: ['websocket', 'polling'],
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
