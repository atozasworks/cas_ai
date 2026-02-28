import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

let socket = null;

export function connectSocket() {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 20,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 10000,
    timeout: 10000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket.id);
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
