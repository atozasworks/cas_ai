import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
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
  const [vehicleNearbyAlert, setVehicleNearbyAlert] = useState(null);
  const [zoneAlert, setZoneAlert] = useState(null);
  const [activeVehicleId, setActiveVehicleId] = useState(null);
  const [lastPosition, setLastPosition] = useState(null);
  const gpsIntervalRef = useRef(null);
  const gpsErrorNotifiedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) return;

    const socket = connectSocket();

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('risk:update', (data) => {
      setRiskData(data);
      setNearbyVehicles(data.nearbyVehicles || []);

      // Fallback popup if dedicated event is missed (match server default 50m)
      const alertMeters = 50;
      const topAssessment = data.assessments?.[0];
      const nearby = data.nearbyVehicles || [];
      const dist = topAssessment?.components?.distance ?? nearby[0]?.distance;
      const direction = topAssessment?.components?.direction || null;

      if (dist != null && dist <= alertMeters && nearby.length > 0) {
        let closest = nearby[0];
        if (topAssessment?.vehicleId) {
          const matched = nearby.find((v) => String(v.vehicleId) === String(topAssessment.vehicleId));
          if (matched) closest = matched;
        }

        setVehicleNearbyAlert({
          vehicle: { ...closest, distance: dist, direction },
          direction,
          distance: dist,
          message: `Vehicle within ${Math.round(dist)}m`,
          zoneType: data.zoneType || null,
          zoneLabel: data.zoneLabel || null,
          playSound: true,
        });
        setZoneAlert(null);
      }
    });

    socket.on('risk:clear', () => {
      setRiskData(null);
      setNearbyVehicles([]);
      setVehicleNearbyAlert(null);
      setZoneAlert(null);
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

    socket.on('alert:vehicle-nearby', (data) => {
      setVehicleNearbyAlert(data);
      setZoneAlert(null);
    });

    socket.on('alert:zone', (data) => {
      setZoneAlert(data);
      setVehicleNearbyAlert(null);
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

    const notifyGpsBlocked = (reason) => {
      if (gpsErrorNotifiedRef.current) return;
      gpsErrorNotifiedRef.current = true;
      const insecure = window.location.protocol !== 'https:' && window.location.hostname !== 'localhost';
      const hint = insecure
        ? 'GPS needs HTTPS on this device. Open the app with an https:// address.'
        : 'Enable location permission for this site to receive collision warnings.';
      toast.error(`Location unavailable: ${reason}. ${hint}`, { duration: 10000 });
    };

    const sendGPS = () => {
      if (!navigator.geolocation) {
        notifyGpsBlocked('not supported by this browser');
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          gpsErrorNotifiedRef.current = false;
          const prevHeading = lastPosition?.heading || 0;
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
          setLastPosition(locationData);
          sendLocationUpdate(locationData);
        },
        (err) => {
          console.error('GPS error:', err.message);
          if (err.code === err.PERMISSION_DENIED) notifyGpsBlocked(err.message || 'permission denied');
        },
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 5000 }
      );
    };

    sendGPS();
    gpsIntervalRef.current = setInterval(sendGPS, 3000);
  }, [user, lastPosition]);

  const stopTracking = useCallback(() => {
    if (gpsIntervalRef.current) {
      clearInterval(gpsIntervalRef.current);
      gpsIntervalRef.current = null;
    }
    setActiveVehicleId(null);
    setRiskData(null);
    setNearbyVehicles([]);
    setLastPosition(null);
    setVehicleNearbyAlert(null);
    setZoneAlert(null);
  }, []);

  // Closing the warning popup ends the tracking session so the button returns
  // to "Track". Starting a new session resets everything, so the popup can
  // appear again on every Track click.
  const dismissVehicleNearbyAlert = useCallback(() => {
    setVehicleNearbyAlert(null);
    stopTracking();
  }, [stopTracking]);

  const dismissZoneAlert = useCallback(() => {
    setZoneAlert(null);
    stopTracking();
  }, [stopTracking]);

  return (
    <SocketContext.Provider value={{
      connected,
      riskData,
      nearbyVehicles,
      emergency,
      behaviorAlert,
      vehicleNearbyAlert,
      dismissVehicleNearbyAlert,
      zoneAlert,
      dismissZoneAlert,
      activeVehicleId,
      startTracking,
      stopTracking,
      lastPosition,
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
