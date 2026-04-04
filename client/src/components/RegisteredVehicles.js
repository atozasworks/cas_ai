import React from 'react';
import './RegisteredVehicles.css';

const RegisteredVehicles = ({ vehicles, onRemoveVehicle, onToggleDriving }) => {
  const getVehicleStatus = (vehicle) => {
    // Check if location tracking is disabled
    if (!vehicle.locationTrackingEnabled) return 'NO GPS';
    
    // Check if no location data
    if (!vehicle.currentLocation || 
        vehicle.currentLocation.latitude == null || 
        vehicle.currentLocation.longitude == null) return 'NO GPS';
    
    // Check if vehicle is stopped
    if (!vehicle.isDriving) return 'STOPPED';
    
    // Check collision status based on location
    let minDistance = Infinity;
    vehicles.forEach((otherVehicle) => {
      if (otherVehicle.phoneNumber !== vehicle.phoneNumber && 
          otherVehicle.currentLocation && 
          otherVehicle.isDriving !== false) {
        const distance = calculateDistance(vehicle, otherVehicle);
        if (distance < minDistance) {
          minDistance = distance;
        }
      }
    });
    
    if (minDistance <= 3) return 'COLLISION RISK';
    if (minDistance <= 5) return 'WARNING';
    return 'SAFE';
  };

  const calculateDistance = (vehicle1, vehicle2) => {
    if (!vehicle1.currentLocation || !vehicle2.currentLocation ||
        vehicle1.currentLocation.latitude == null || vehicle1.currentLocation.longitude == null ||
        vehicle2.currentLocation.latitude == null || vehicle2.currentLocation.longitude == null) {
      return Infinity;
    }
    
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'COLLISION RISK': return '#e74c3c';
      case 'WARNING': return '#f39c12';
      case 'SAFE': return '#27ae60';
      case 'STOPPED': return '#6c757d';
      case 'NO GPS': return '#95a5a6';
      default: return '#95a5a6';
    }
  };

  return (
    <div className="dashboard-panel">
      <h3>Registered Vehicles ({vehicles.length})</h3>
      <div className="vehicles-list">
        {vehicles.length === 0 ? (
          <p className="no-vehicles">No vehicles registered</p>
        ) : (
          vehicles.map((vehicle) => {
            const status = getVehicleStatus(vehicle);
            const isDriving = vehicle.isDriving !== false; // Default to true if not set
            
            return (
              <div key={vehicle.phoneNumber} className={`vehicle-item ${isDriving ? 'driving' : 'stopped'}`}>
                <div className="registred-vehicle-info">
                  <div className="vehicle-header">
                    <div className="vehicle-id">{vehicle.vehicleId}</div>
                    <div 
                      className="status-indicator"
                      style={{ backgroundColor: getStatusColor(status) }}
                    >
                      {status}
                    </div>
                  </div>
                  <div className="driver-name">👤 {vehicle.fullName || 'Unknown Driver'}</div>
                  <div className="vehicle-phone">{vehicle.phoneNumber}</div>
                  {vehicle.currentLocation && 
                   vehicle.currentLocation.latitude != null && 
                   vehicle.currentLocation.longitude != null && (
                    <div className="vehicle-location">
                      📍 {vehicle.currentLocation.latitude.toFixed(4)}, {vehicle.currentLocation.longitude.toFixed(4)}
                    </div>
                  )}
                </div>
                
                <div className="vehicle-controls">
                  <button 
                    className={`toggle-btn ${isDriving ? 'driving' : 'stopped'}`}
                    onClick={() => onToggleDriving(vehicle.phoneNumber, !isDriving)}
                  >
                    {isDriving ? '🚗 Driving' : '🛑 Stopped'}
                  </button>
                  <button 
                    className="remove-btn"
                    onClick={() => onRemoveVehicle(vehicle.phoneNumber)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default RegisteredVehicles;