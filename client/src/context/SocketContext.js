import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { connectSocket, disconnectSocket, getSocket, joinVehicleRoom, sendLocationUpdate } from '../services/socket';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [connected, setConnected] = useState(false);
  const [riskData, setRiskData] = useState(null);
  const [nearbyVehicles, setNearbyVehicles] = useState([]);
  const [emergency, setEmergency] = useState(null);
  const [behaviorAlert, setBehaviorAlert] = useState(null);
  const [activeVehicleId, setActiveVehicleId] = useState(null);
  const gpsIntervalRef = useRef(null);
  const lastPositionRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    const socket = connectSocket();

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('risk:update', (data) => {
      setRiskData(data);
      setNearbyVehicles(data.nearbyVehicles || []);
    });

    socket.on('risk:clear', () => {
      setRiskData(null);
      setNearbyVehicles([]);
    });

    socket.on('emergency:crash-detected', (data) => {
      setEmergency(data);
    });

    socket.on('emergency:resolved', () => {
      setEmergency(null);
    });

    socket.on('alert:behavior', (data) => {
      setBehaviorAlert(data);
      setTimeout(() => setBehaviorAlert(null), 5000);
    });

    socket.on('alert:near-miss', (data) => {
      setBehaviorAlert({ type: 'near_miss', message: data.message });
      setTimeout(() => setBehaviorAlert(null), 8000);
    });

    return () => {
      disconnectSocket();
      setConnected(false);
    };
  }, [isAuthenticated]);

  const startTracking = useCallback((vehicleId) => {
    if (!user) return;

    setActiveVehicleId(vehicleId);
    const socket = getSocket();
    if (socket) joinVehicleRoom(vehicleId, user._id || user.id);

    if (gpsIntervalRef.current) clearInterval(gpsIntervalRef.current);

    const sendGPS = () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const prevHeading = lastPositionRef.current?.heading || 0;
          const locationData = {
            vehicleId,
            userId: user._id || user.id,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            speed: (pos.coords.speed || 0) * 3.6,
            heading: pos.coords.heading || 0,
            acceleration: 0,
            altitude: pos.coords.altitude || 0,
            accuracy: pos.coords.accuracy || 0,
            previousHeading: prevHeading,
          };
          lastPositionRef.current = locationData;
          sendLocationUpdate(locationData);
        },
        (err) => console.error('GPS error:', err.message),
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 5000 }
      );
    };

    sendGPS();
    gpsIntervalRef.current = setInterval(sendGPS, 3000);
  }, [user]);

  const stopTracking = useCallback(() => {
    if (gpsIntervalRef.current) {
      clearInterval(gpsIntervalRef.current);
      gpsIntervalRef.current = null;
    }
    setActiveVehicleId(null);
    setRiskData(null);
    setNearbyVehicles([]);
  }, []);

  return (
    <SocketContext.Provider value={{
      connected,
      riskData,
      nearbyVehicles,
      emergency,
      behaviorAlert,
      activeVehicleId,
      startTracking,
      stopTracking,
      lastPosition: lastPositionRef.current,
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
};
