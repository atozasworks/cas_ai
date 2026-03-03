import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useSocket } from '../../context/SocketContext';
import { getRiskColor, formatDistance, formatSpeed } from '../../utils/helpers';

const nearbyIcon = (risk) => L.divIcon({
  className: '',
  html: `<div style="width:14px;height:14px;background:${getRiskColor(risk)};border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const vehicleMarkerIcon = L.divIcon({
  className: '',
  html: `<div style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;background:#6366f1;border:3px solid white;border-radius:50%;box-shadow:0 2px 10px rgba(99,102,241,0.5);font-size:14px;">🚗</div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

function MapUpdater({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.setView(position, map.getZoom(), { animate: true });
    }
  }, [position, map]);
  return null;
}

export default function TrackingMap({ userName, activeVehicle, vehicles = [] }) {
  const { riskData, nearbyVehicles, lastPosition, activeVehicleId } = useSocket();
  const [position, setPosition] = useState([20.5937, 78.9629]);

  useEffect(() => {
    if (lastPosition) {
      setPosition([lastPosition.latitude, lastPosition.longitude]);
    } else {
      navigator.geolocation?.getCurrentPosition(
        (pos) => setPosition([pos.coords.latitude, pos.coords.longitude]),
        () => {},
        { enableHighAccuracy: true }
      );
    }
  }, [lastPosition]);

  const riskLevel = riskData?.riskLevel || 'low';
  const radiusColor = getRiskColor(riskLevel);

  // Show all registered vehicles on map
  const registeredToShow = vehicles;

  return (
    <div style={styles.wrapper}>
      <MapContainer
        center={position}
        zoom={16}
        style={{ width: '100%', height: '100%', borderRadius: 12 }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapUpdater position={position} />

        <Circle
          center={position}
          radius={500}
          pathOptions={{
            color: radiusColor,
            fillColor: radiusColor,
            fillOpacity: 0.06,
            weight: 1,
            dashArray: '8 4',
          }}
        />
        <Circle
          center={position}
          radius={50}
          pathOptions={{
            color: radiusColor,
            fillColor: radiusColor,
            fillOpacity: 0.12,
            weight: 2,
          }}
        />

        {nearbyVehicles.map((v, i) => (
          <Marker
            key={v.vehicleId || i}
            position={[v.latitude, v.longitude]}
            icon={nearbyIcon(riskLevel)}
          >
            <Popup>
              <strong>Nearby Vehicle</strong><br />
              Distance: {formatDistance(v.distance)}<br />
              Speed: {formatSpeed(v.speed)}
            </Popup>
          </Marker>
        ))}

        {/* Registered Vehicles */}
        {registeredToShow.map((v) => {
            const coords = v.lastKnownLocation?.coordinates;
            const hasLocation = coords && (coords[0] !== 0 || coords[1] !== 0);
            const markerPos = hasLocation ? [coords[1], coords[0]] : position;
            const vid = v._id || v.id;
            return (
              <Marker
                key={`reg-${vid}`}
                position={markerPos}
                icon={vehicleMarkerIcon}
              >
                <Popup>
                  <div style={{ minWidth: 180 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: v.isOnline ? 'rgba(34,197,94,0.12)' : 'rgba(148,163,184,0.12)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16,
                      }}>
                        🚗
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>
                          {v.plateNumber}
                        </div>
                        <div style={{ fontSize: 11, color: v.isOnline ? '#22c55e' : '#94a3b8', fontWeight: 600 }}>
                          {v.isOnline ? '● Online' : '● Offline'}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: 13, lineHeight: 1.7 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b' }}>Type:</span>
                        <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>{v.type}</span>
                      </div>
                      {v.make && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748b' }}>Make:</span>
                          <span style={{ fontWeight: 500 }}>{v.make}</span>
                        </div>
                      )}
                      {v.model && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748b' }}>Model:</span>
                          <span style={{ fontWeight: 500 }}>{v.model}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b' }}>Speed:</span>
                        <span style={{ fontWeight: 500 }}>{formatSpeed(v.lastSpeed || 0)}</span>
                      </div>
                      {userName && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748b' }}>Owner:</span>
                          <span style={{ fontWeight: 500 }}>{userName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>
    </div>
  );
}

const styles = {
  wrapper: {
    width: '100%',
    height: '100%',
    minHeight: 400,
    borderRadius: 12,
    overflow: 'hidden',
    border: '1px solid var(--border-color)',
    position: 'relative',
  },
};
