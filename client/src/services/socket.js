import { io } from 'socket.io-client';

const normalizeBaseUrl = (value) => String(value || '').trim().replace(/\/+$/, '');
// Easy manual switch (no comment/uncomment needed)
// Set SOCKET_TARGET to one of: 'AUTO' | 'LOCAL' | 'TEST' | 'LIVE'
// When the app runs on localhost, the socket always uses LOCAL (port 5000)
// to avoid cross-domain CORS errors. SOCKET_TARGET only applies on deployed domains.
const SOCKET_TARGET = 'AUTO';
const MANUAL_SOCKET_URLS = {
  LOCAL: 'http://localhost:5000',
  TEST: 'https://casai.testatozas.in',
  LIVE: 'https://www.ucasaapp.com',
};
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0']);
const isLocalHost = () => LOCAL_HOSTS.has(window.location.hostname);

const deriveSocketUrl = () => {
  // Deployed app: always same-origin (prevents cross-domain CORS).
  if (!isLocalHost()) return window.location.origin;

  // Local dev: always local backend unless REACT_APP_SOCKET_URL is explicitly set.
  const envSocketUrl = normalizeBaseUrl(process.env.REACT_APP_SOCKET_URL);
  if (envSocketUrl) return envSocketUrl;

  const selectedKey = String(SOCKET_TARGET || 'AUTO').toUpperCase();
  if (selectedKey === 'LOCAL' || selectedKey === 'AUTO') {
    return MANUAL_SOCKET_URLS.LOCAL;
  }

  if (selectedKey !== 'AUTO') {
    const forcedManualUrl = normalizeBaseUrl(MANUAL_SOCKET_URLS[selectedKey]);
    if (forcedManualUrl) {
      console.warn(
        `[Socket] SOCKET_TARGET=${selectedKey} from localhost causes cross-domain CORS. `
        + 'Using local backend instead. Set REACT_APP_SOCKET_URL to override.'
      );
    }
  }

  return MANUAL_SOCKET_URLS.LOCAL;
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
