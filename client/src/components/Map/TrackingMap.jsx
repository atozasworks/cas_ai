import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useSocket } from '../../context/SocketContext';
import { getRiskColor, formatDistance, formatSpeed } from '../../utils/helpers';

const ownIcon = L.divIcon({
  className: '',
  html: `<div style="width:18px;height:18px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(59,130,246,0.5);"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const nearbyIcon = (risk) => L.divIcon({
  className: '',
  html: `<div style="width:14px;height:14px;background:${getRiskColor(risk)};border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
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

export default function TrackingMap() {
  const { riskData, nearbyVehicles, lastPosition } = useSocket();
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

        <Marker position={position} icon={ownIcon}>
          <Popup>
            <strong>Your Vehicle</strong><br />
            {lastPosition && (
              <>Speed: {formatSpeed(lastPosition.speed)}</>
            )}
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
  },
};
