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

const myLocationIcon = L.divIcon({
  className: '',
  html: `<div style="position:relative;width:20px;height:20px;"><div style="position:absolute;inset:0;background:rgba(37,99,235,0.25);border-radius:50%;animation:pulse 2s infinite;"></div><div style="position:absolute;top:4px;left:4px;width:12px;height:12px;background:#2563eb;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(37,99,235,0.5);"></div></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const getMyVehicleIcon = (type) => {
  const t = VEHICLE_TYPE_MAP[type] || VEHICLE_TYPE_MAP.car;
  return L.divIcon({
    className: '',
    html: `<div style="position:relative;width:44px;height:44px;">
      <div style="position:absolute;inset:0;background:rgba(37,99,235,0.18);border-radius:50%;animation:pulse 2s infinite;"></div>
      <div style="position:absolute;top:4px;left:4px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;background:${t.color};border:3px solid #2563eb;border-radius:50%;box-shadow:0 2px 12px ${t.color}80,0 0 0 6px rgba(37,99,235,0.15);font-size:18px;">${t.emoji}</div>
      <div style="position:absolute;bottom:-2px;right:-2px;width:14px;height:14px;background:#2563eb;border:2px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:8px;color:white;font-weight:bold;">ME</div>
    </div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
};

const VEHICLE_TYPE_MAP = {
  car:        { emoji: '🚗', color: '#6366f1' },
  truck:      { emoji: '🚛', color: '#f59e0b' },
  motorcycle: { emoji: '🏍️', color: '#ef4444' },
  bus:        { emoji: '🚌', color: '#22c55e' },
  bicycle:    { emoji: '🚲', color: '#06b6d4' },
};

const getVehicleIcon = (type) => {
  const t = VEHICLE_TYPE_MAP[type] || VEHICLE_TYPE_MAP.car;
  return L.divIcon({
    className: '',
    html: `<div style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;background:${t.color};border:3px solid white;border-radius:50%;box-shadow:0 2px 10px ${t.color}80;font-size:15px;">${t.emoji}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

function MapUpdater({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.setView(position, map.getZoom(), { animate: true });
    }
  }, [position, map]);
  return null;
}

export default function TrackingMap({ userName, activeVehicle, vehicles = [], allMapVehicles = [] }) {
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

  // Determine the vehicle type for "My Location" icon
  const myVehicleType = activeVehicle?.type || (vehicles.length > 0 ? vehicles[0].type : null);
  const myIcon = myVehicleType ? getMyVehicleIcon(myVehicleType) : myLocationIcon;

  // Own registered vehicles
  const registeredToShow = vehicles;

  // Debug log to help diagnose missing own vehicles
  useEffect(() => {
    console.log('[TrackingMap] Own vehicles count:', registeredToShow.length);
    if (registeredToShow.length > 0) {
      console.log('[TrackingMap] Own vehicles:', registeredToShow);
    }
    console.log('[TrackingMap] Position:', position);
  }, [registeredToShow, position]);

  // Build a set of own vehicle IDs to filter them out everywhere
  const ownVehicleIds = new Set(vehicles.map((v) => v._id || v.id));

  // Filter nearby vehicles (from socket) – exclude user's own vehicles
  const filteredNearbyVehicles = nearbyVehicles.filter(
    (v) => !ownVehicleIds.has(v.vehicleId)
  );

  // Other users' vehicles (exclude own)
  const otherUsersVehicles = allMapVehicles.filter(
    (v) => !v.isOwn && !ownVehicleIds.has(v._id || v.id)
  );

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

        {/* My Location Marker – shows vehicle icon when a vehicle is active */}
        <Marker position={position} icon={myIcon}>
          <Popup>
            <div style={{ minWidth: 170 }}>
              {myVehicleType ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: `${(VEHICLE_TYPE_MAP[myVehicleType] || VEHICLE_TYPE_MAP.car).color}18`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16,
                    }}>
                      {(VEHICLE_TYPE_MAP[myVehicleType] || VEHICLE_TYPE_MAP.car).emoji}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>
                        {activeVehicle?.plateNumber || vehicles[0]?.plateNumber || 'My Vehicle'}
                      </div>
                      <div style={{ fontSize: 11, color: '#2563eb', fontWeight: 600 }}>📍 My Location</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.7 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Type:</span>
                      <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>{myVehicleType}</span>
                    </div>
                    {(activeVehicle?.make || vehicles[0]?.make) && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b' }}>Make:</span>
                        <span style={{ fontWeight: 500 }}>{activeVehicle?.make || vehicles[0]?.make}</span>
                      </div>
                    )}
                    {(activeVehicle?.model || vehicles[0]?.model) && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b' }}>Model:</span>
                        <span style={{ fontWeight: 500 }}>{activeVehicle?.model || vehicles[0]?.model}</span>
                      </div>
                    )}
                    {userName && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b' }}>Driver:</span>
                        <span style={{ fontWeight: 500 }}>{userName}</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: 4 }}>
                  <strong style={{ fontSize: 13, color: '#2563eb' }}>📍 My Location</strong>
                  {userName && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{userName}</div>}
                </div>
              )}
            </div>
          </Popup>
        </Marker>

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

        {filteredNearbyVehicles.map((v, i) => {
          const nType = VEHICLE_TYPE_MAP[v.type] || VEHICLE_TYPE_MAP.car;
          return (
            <Marker
              key={v.vehicleId || i}
              position={[v.latitude, v.longitude]}
              icon={v.type ? getVehicleIcon(v.type) : nearbyIcon(riskLevel)}
            >
              <Popup>
                <div style={{ minWidth: 170 }}>
                  {v.plateNumber ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: 8,
                          background: `${nType.color}18`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 15,
                        }}>
                          {nType.emoji}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{v.plateNumber}</div>
                          <div style={{ fontSize: 10, color: '#22c55e', fontWeight: 600 }}>● Nearby</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 12, lineHeight: 1.7 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748b' }}>Distance:</span>
                          <span style={{ fontWeight: 500 }}>{formatDistance(v.distance)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748b' }}>Speed:</span>
                          <span style={{ fontWeight: 500 }}>{formatSpeed(v.speed)}</span>
                        </div>
                        {v.type && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748b' }}>Type:</span>
                            <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>{v.type}</span>
                          </div>
                        )}
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
                        {v.ownerName && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748b' }}>Owner:</span>
                            <span style={{ fontWeight: 500 }}>{v.ownerName}</span>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <strong>Nearby Vehicle</strong><br />
                      Distance: {formatDistance(v.distance)}<br />
                      Speed: {formatSpeed(v.speed)}
                    </>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Other Users' Vehicles */}
        {otherUsersVehicles.map((v, index) => {
            const coords = v.lastKnownLocation?.coordinates;
            const hasLocation = coords && (coords[0] !== 0 || coords[1] !== 0);
            if (!hasLocation) return null;
            const markerPos = [coords[1], coords[0]];
            const vid = v._id || v.id;
            const typeInfo = VEHICLE_TYPE_MAP[v.type] || VEHICLE_TYPE_MAP.car;
            return (
              <Marker
                key={`other-${vid}`}
                position={markerPos}
                icon={getVehicleIcon(v.type)}
              >
                <Popup>
                  <div style={{ minWidth: 180 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: v.isOnline ? `${typeInfo.color}18` : 'rgba(148,163,184,0.12)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16,
                      }}>
                        {typeInfo.emoji}
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
                      {v.ownerName && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748b' }}>Owner:</span>
                          <span style={{ fontWeight: 500 }}>{v.ownerName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* My Registered Vehicles – only show if they have real GPS coordinates */}
        {registeredToShow.map((v, index) => {
            const coords = v.lastKnownLocation?.coordinates;
            const hasLocation = coords && (coords[0] !== 0 || coords[1] !== 0);
            // Skip vehicles without real GPS – they are already represented by the "My Location" marker
            if (!hasLocation) return null;
            const markerPos = [coords[1], coords[0]];
            const vid = v._id || v.id;
            return (
              <Marker
                key={`reg-${vid}`}
                position={markerPos}
                icon={getVehicleIcon(v.type)}
              >
                <Popup>
                  <div style={{ minWidth: 180 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: v.isOnline ? `${(VEHICLE_TYPE_MAP[v.type] || VEHICLE_TYPE_MAP.car).color}18` : 'rgba(148,163,184,0.12)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16,
                      }}>
                        {(VEHICLE_TYPE_MAP[v.type] || VEHICLE_TYPE_MAP.car).emoji}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>
                          {v.plateNumber}
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 600 }}>
                          <span style={{ color: '#2563eb' }}>★ My Vehicle</span>
                          {' · '}
                          <span style={{ color: v.isOnline ? '#22c55e' : '#94a3b8' }}>
                            {v.isOnline ? '● Online' : '● Offline'}
                          </span>
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

        {/* Show message if no vehicles registered */}
        {registeredToShow.length === 0 && (
          <Marker position={position} icon={myLocationIcon}>
            <Popup>
              <div style={{ padding: 12, textAlign: 'center', fontSize: 13 }}>
                <div style={{ color: '#64748b', marginBottom: 6 }}>📋 No vehicles registered</div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>Use Vehicle panel to add a vehicle</div>
              </div>
            </Popup>
          </Marker>
        )}
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
