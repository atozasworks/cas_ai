import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './VehiclePositionsMap.css';

// Fix for default markers in react-leaflet
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Vehicle emoji mapping
const getVehicleEmoji = (vehicleType) => {
  const emojis = {
    car: '🚗',
    bike: '🏍️',
    auto: '🛺',
    truck: '🚚',
    bus: '🚌',
    bicycle: '🚴'
  };
  return emojis[vehicleType] || '🚗';
};

// Animated Marker Component for smooth movement
const AnimatedMarker = ({ position, icon, children, eventHandlers }) => {
  const markerRef = useRef(null);
  const previousPosition = useRef(position);

  useEffect(() => {
    const marker = markerRef.current;
    if (marker && previousPosition.current) {
      const [prevLat, prevLng] = previousPosition.current;
      const [newLat, newLng] = position;
      
      // Only animate if position actually changed
      if (prevLat !== newLat || prevLng !== newLng) {
        // Smooth transition animation
        const startTime = Date.now();
        const duration = 1000; // 1 second animation
        
        const animate = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          
          // Easing function for smooth animation
          const easeProgress = progress < 0.5 
            ? 2 * progress * progress 
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;
          
          const currentLat = prevLat + (newLat - prevLat) * easeProgress;
          const currentLng = prevLng + (newLng - prevLng) * easeProgress;
          
          marker.setLatLng([currentLat, currentLng]);
          
          if (progress < 1) {
            requestAnimationFrame(animate);
          }
        };
        
        animate();
      }
    }
    
    previousPosition.current = position;
  }, [position]);

  return (
    <Marker
      ref={markerRef}
      position={position}
      icon={icon}
      eventHandlers={eventHandlers}
    >
      {children}
    </Marker>
  );
};

// Custom vehicle icons based on status
const createVehicleIcon = (status, vehicleType, vehicleId) => {
  const colors = {
    safe: '#27ae60',
    warning: '#f39c12', 
    collision: '#e74c3c',
    'no-gps': '#95a5a6'
  };

  const color = colors[status] || colors['no-gps'];
  const vehicleEmoji = getVehicleEmoji(vehicleType);
  
  return L.divIcon({
    html: `
      <div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 3px solid white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 16px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      ">
        ${vehicleEmoji}
      </div>
    `,
    className: 'custom-vehicle-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

// Component to fit map bounds to current user and nearby vehicles
const FitBounds = ({ vehicles, currentUser }) => {
  const map = useMap();
  
  useEffect(() => {
    const validVehicles = vehicles.filter(v => 
      v.currentLocation && v.currentLocation.latitude && v.currentLocation.longitude
    );
    
    if (validVehicles.length > 0) {
      // Find current user's vehicle
      const currentUserVehicle = validVehicles.find(v => 
        v.phoneNumber === currentUser?.phoneNumber
      );
      
      if (currentUserVehicle) {
        // Focus on current user's location with nearby vehicles
        const userLocation = [
          currentUserVehicle.currentLocation.latitude,
          currentUserVehicle.currentLocation.longitude
        ];
        
        // Find vehicles within 5km of current user
        const nearbyVehicles = validVehicles.filter(v => {
          if (v.phoneNumber === currentUser.phoneNumber) return true;
          
          const distance = calculateDistance(currentUserVehicle, v);
          return distance <= 5000; // 5km radius
        });
        
         if (nearbyVehicles.length > 1) {
           // If there are nearby vehicles, fit bounds to include them with smooth animation
           const bounds = L.latLngBounds(
             nearbyVehicles.map(v => [v.currentLocation.latitude, v.currentLocation.longitude])
           );
           const paddedBounds = bounds.pad(0.2);
           map.fitBounds(paddedBounds, {
             duration: 2.0, // 2 second animation
             easeLinearity: 0.1
           });
         } else {
           // If no nearby vehicles, center on current user with smooth zoom animation
           map.setView(userLocation, 15, {
             animate: true,
             duration: 2.0 // 2 second animation
           });
         }
       } else {
         // If current user not found, fit all vehicles with smooth animation
         const bounds = L.latLngBounds(
           validVehicles.map(v => [v.currentLocation.latitude, v.currentLocation.longitude])
         );
         const paddedBounds = bounds.pad(0.1);
         map.fitBounds(paddedBounds, {
           duration: 2.0, // 2 second animation
           easeLinearity: 0.1
         });
       }
    }
  }, [vehicles, currentUser, map]);
  
  return null;
};

// Calculate distance between two vehicles
const calculateDistance = (vehicle1, vehicle2) => {
  if (!vehicle1.currentLocation || !vehicle2.currentLocation) return Infinity;
  
  const lat1 = vehicle1.currentLocation.latitude;
  const lng1 = vehicle1.currentLocation.longitude;
  const lat2 = vehicle2.currentLocation.latitude;
  const lng2 = vehicle2.currentLocation.longitude;
  
  // Haversine formula
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Get vehicle status based on proximity to other vehicles
const getVehicleStatus = (vehicle, allVehicles) => {
  if (!vehicle.currentLocation || !vehicle.currentLocation.latitude || !vehicle.currentLocation.longitude) {
    return { status: 'no-gps', minDistance: null };
  }

  let status = 'safe';
  let minDistance = Infinity;
  
  allVehicles.forEach((otherVehicle) => {
    if (otherVehicle.phoneNumber !== vehicle.phoneNumber) {
      const distance = calculateDistance(vehicle, otherVehicle);
      if (distance < minDistance) {
        minDistance = distance;
      }
      
      if (distance <= 3) {
        status = 'collision';
      } else if (distance <= 5 && status !== 'collision') {
        status = 'warning';
      }
    }
  });
  
  return { status, minDistance: minDistance === Infinity ? null : minDistance };
};

const VehiclePositionsMap = ({ vehicles, allUsers, currentUser }) => {
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  
  // Use allUsers if available, otherwise fall back to vehicles
  const usersToDisplay = allUsers && allUsers.length > 0 ? allUsers : vehicles;
  
  // Filter users/vehicles with valid GPS coordinates and location tracking enabled
  const validVehicles = usersToDisplay.filter(v => 
    v.currentLocation && 
    v.currentLocation.latitude && 
    v.currentLocation.longitude &&
    v.locationTrackingEnabled
  );

  // Default center (New York City) if no vehicles
  const defaultCenter = [40.7128, -74.0060];
  
  // Prioritize current user's location for map center
  const currentUserVehicle = validVehicles.find(v => v.phoneNumber === currentUser?.phoneNumber);
  const mapCenter = currentUserVehicle 
    ? [currentUserVehicle.currentLocation.latitude, currentUserVehicle.currentLocation.longitude]
    : validVehicles.length > 0 
      ? [validVehicles[0].currentLocation.latitude, validVehicles[0].currentLocation.longitude]
      : defaultCenter;

  return (
    <div className="vehicle-positions-map">
      <div className="map-header">
        <h3>🗺️ OpenStreetMap</h3>
        <div className="map-stats">
          <span className="stat">
            📍 {validVehicles.length} user{validVehicles.length !== 1 ? 's' : ''} tracking
          </span>
          <span className="stat">
            🚗 {usersToDisplay.length} total users
          </span>
          <span className="stat">
            🌐 All database users displayed
          </span>
        </div>
      </div>

      {validVehicles.length === 0 ? (
        <div className="no-vehicles-map">
          <div className="no-vehicles-message">
            <h4>📍 No users with location tracking enabled</h4>
            <p>Enable location tracking to see all users on the map</p>
            <p className="hint">This map shows all users from the database with active location tracking</p>
            {currentUser && (
              <p className="hint">
                Your vehicle: <strong>{currentUser.vehicleId}</strong> 
                {usersToDisplay.find(v => v.phoneNumber === currentUser.phoneNumber)?.locationTrackingEnabled 
                  ? " ✅ Location tracking enabled" 
                  : " ❌ Location tracking disabled"}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="map-container">
          <MapContainer
            center={mapCenter}
            zoom={15}
            style={{ height: '400px', width: '100%' }}
            className="leaflet-map"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            <FitBounds vehicles={validVehicles} currentUser={currentUser} />
            
            {validVehicles.map((vehicle) => {
              const { status, minDistance } = getVehicleStatus(vehicle, validVehicles);
              const isCurrentUser = currentUser && vehicle.phoneNumber === currentUser.phoneNumber;
              
              return (
                 <AnimatedMarker
                   key={vehicle.phoneNumber}
                   position={[vehicle.currentLocation.latitude, vehicle.currentLocation.longitude]}
                   icon={createVehicleIcon(status, vehicle.vehicleType, vehicle.vehicleId)}
                  eventHandlers={{
                    click: () => setSelectedVehicle(vehicle),
                  }}
                >
                  <Popup>
                    <div className="vehicle-popup">
                      <h4>
                        🚗 {vehicle.vehicleId}
                        {isCurrentUser && <span className="current-user-badge">YOU</span>}
                      </h4>
                      <div className="popup-details">
                        <p><strong>Driver:</strong> {vehicle.fullName || 'Unknown Driver'}</p>
                        <p><strong>Phone:</strong> {vehicle.phoneNumber}</p>
                        <p><strong>Status:</strong> 
                          <span className={`status-text ${status}`}>
                            {status.toUpperCase()}
                          </span>
                        </p>
                        <p><strong>Coordinates:</strong></p>
                        <p className="coordinates">
                          📍 {vehicle.currentLocation.latitude?.toFixed(6) || 'N/A'}, {vehicle.currentLocation.longitude?.toFixed(6) || 'N/A'}
                        </p>
                        <p><strong>Accuracy:</strong> ±{vehicle.currentLocation.accuracy || 5}m</p>
                        {minDistance && (
                          <p><strong>Nearest Vehicle:</strong> {minDistance.toFixed(1)}m</p>
                        )}
                        <p><strong>Last Update:</strong></p>
                        <p className="timestamp">
                          {new Date(vehicle.currentLocation.timestamp).toLocaleString()}
                        </p>
                        {vehicle.currentLocation.isSimulated && (
                          <p className="simulated-badge">📍 Simulated Location</p>
                        )}
                        <p><strong>Driving:</strong> {vehicle.isDriving ? '🚗 Yes' : '🛑 Stopped'}                        </p>
                      </div>
                    </div>
                  </Popup>
                </AnimatedMarker>
              );
            })}
          </MapContainer>
        </div>
      )}

      <div className="map-legend">
        <h4>Legend</h4>
        <div className="legend-items">
           <div className="legend-item">
             <div className="legend-dot" style={{ backgroundColor: '#27ae60' }}></div>
             <span>Safe Distance (&gt;5m)</span>
           </div>
           <div className="legend-item">
             <div className="legend-dot" style={{ backgroundColor: '#f39c12' }}></div>
             <span>Warning Zone (3-5m)</span>
           </div>
           <div className="legend-item">
             <div className="legend-dot" style={{ backgroundColor: '#e74c3c' }}></div>
             <span>Collision Risk (&lt;3m)</span>
           </div>
          <div className="legend-item">
            <div className="legend-dot" style={{ backgroundColor: '#95a5a6' }}></div>
            <span>No GPS Data</span>
          </div>
        </div>
      </div>

      {selectedVehicle && (
        <div className="selected-vehicle-info">
          <h4>Selected Vehicle: {selectedVehicle.vehicleId}</h4>
          <button 
            onClick={() => setSelectedVehicle(null)}
            className="close-info-btn"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

export default VehiclePositionsMap;