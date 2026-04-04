import React, { useRef, useEffect, useState } from 'react';
import './VehicleMap.css';

const calculateRealDistance = (vehicle1, vehicle2) => {
  if (!vehicle1.currentLocation || !vehicle2.currentLocation) return Infinity;
  
  const lat1 = vehicle1.currentLocation.latitude;
  const lng1 = vehicle1.currentLocation.longitude;
  const lat2 = vehicle2.currentLocation.latitude;
  const lng2 = vehicle2.currentLocation.longitude;
  
  // Haversine formula for distance calculation
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in meters
};

const VehicleMap = ({ vehicles }) => {
  const canvasRef = useRef(null);
  const [hoveredVehicle, setHoveredVehicle] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const getVehicleStatus = (vehicle) => {
    if (!vehicle.currentLocation || !vehicle.currentLocation.latitude || !vehicle.currentLocation.longitude) {
      return { status: 'no-gps', minDistance: null };
    }

    let status = 'safe';
    let minDistance = Infinity;
    
    vehicles.forEach((otherVehicle) => {
      if (otherVehicle.phoneNumber !== vehicle.phoneNumber) {
        const distance = calculateRealDistance(vehicle, otherVehicle);
        if (distance < minDistance) {
          minDistance = distance;
        }
        
        if (distance <= 7) { // 7 meter - collision risk
          status = 'collision';
        } else if (distance <= 10 && status !== 'collision') { // 10 meters - warning zone
          status = 'warning';
        }
      }
    });
    
    return { status, minDistance: minDistance === Infinity ? null : minDistance };
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'collision': return '#e74c3c'; // Red
      case 'warning': return '#f39c12'; // Orange/Yellow
      case 'safe': return '#27ae60'; // Green
      case 'no-gps': return '#95a5a6'; // Gray
      default: return '#95a5a6';
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    // Set canvas size
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Clear canvas
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Get vehicles with valid locations
    const validVehicles = vehicles.filter(v => 
      v.currentLocation && v.currentLocation.latitude && v.currentLocation.longitude
    );

    if (validVehicles.length === 0) {
      // Draw "No vehicles" message
      ctx.fillStyle = '#6c757d';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('No vehicles with GPS data', rect.width / 2, rect.height / 2);
      return;
    }

    // Calculate bounds
    const lats = validVehicles.map(v => v.currentLocation.latitude);
    const lngs = validVehicles.map(v => v.currentLocation.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    // Add padding to bounds
    const latRange = maxLat - minLat || 0.001;
    const lngRange = maxLng - minLng || 0.001;
    const padding = 0.2;
    
    const paddedMinLat = minLat - latRange * padding;
    const paddedMaxLat = maxLat + latRange * padding;
    const paddedMinLng = minLng - lngRange * padding;
    const paddedMaxLng = maxLng + lngRange * padding;

    // Convert GPS coordinates to canvas coordinates
    const gpsToCanvas = (lat, lng) => {
      const x = ((lng - paddedMinLng) / (paddedMaxLng - paddedMinLng)) * (rect.width - 40) + 20;
      const y = ((paddedMaxLat - lat) / (paddedMaxLat - paddedMinLat)) * (rect.height - 40) + 20;
      return { x, y };
    };

    // Draw vehicles
    validVehicles.forEach((vehicle) => {
      const { status } = getVehicleStatus(vehicle);
      const { x, y } = gpsToCanvas(vehicle.currentLocation.latitude, vehicle.currentLocation.longitude);
      
      // Draw vehicle dot
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, 2 * Math.PI);
      ctx.fillStyle = getStatusColor(status);
      ctx.fill();
      
      // Draw border
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, 2 * Math.PI);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw vehicle ID
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(vehicle.vehicleId.slice(-1), x, y + 3);
    });

  }, [vehicles]);

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    setMousePos({ x: e.clientX, y: e.clientY });

    // Check if mouse is over a vehicle
    const validVehicles = vehicles.filter(v => 
      v.currentLocation && v.currentLocation.latitude && v.currentLocation.longitude
    );

    if (validVehicles.length === 0) {
      setHoveredVehicle(null);
      return;
    }

    // Calculate bounds (same as in useEffect)
    const lats = validVehicles.map(v => v.currentLocation.latitude);
    const lngs = validVehicles.map(v => v.currentLocation.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const latRange = maxLat - minLat || 0.001;
    const lngRange = maxLng - minLng || 0.001;
    const padding = 0.2;
    
    const paddedMinLat = minLat - latRange * padding;
    const paddedMaxLat = maxLat + latRange * padding;
    const paddedMinLng = minLng - lngRange * padding;
    const paddedMaxLng = maxLng + lngRange * padding;

    const gpsToCanvas = (lat, lng) => {
      const x = ((lng - paddedMinLng) / (paddedMaxLng - paddedMinLng)) * (rect.width - 40) + 20;
      const y = ((paddedMaxLat - lat) / (paddedMaxLat - paddedMinLat)) * (rect.height - 40) + 20;
      return { x, y };
    };

    let foundVehicle = null;
    validVehicles.forEach((vehicle) => {
      const { x, y } = gpsToCanvas(vehicle.currentLocation.latitude, vehicle.currentLocation.longitude);
      const distance = Math.sqrt((mouseX - x) ** 2 + (mouseY - y) ** 2);
      
      if (distance <= 12) { // 12px radius for hover detection
        foundVehicle = vehicle;
      }
    });

    setHoveredVehicle(foundVehicle);
  };

  const handleMouseLeave = () => {
    setHoveredVehicle(null);
  };

  return (
    <div className="dashboard-panel vehicle-positions-panel">
      <h3>Proximity Visualization</h3>
      <div className="visual-map-container">
        <canvas
          ref={canvasRef}
          className="vehicle-canvas"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />
        
        {hoveredVehicle && (
          <div 
            className="vehicle-tooltip"
            style={{
              left: mousePos.x + 10,
              top: mousePos.y - 10,
            }}
          >
            <div className="tooltip-content">
              <h4>🚗 {hoveredVehicle.vehicleId}</h4>
              <p><strong>Driver:</strong> {hoveredVehicle.fullName || 'Unknown'}</p>
              <p><strong>Phone:</strong> {hoveredVehicle.phoneNumber}</p>
              <p><strong>Status:</strong> {getVehicleStatus(hoveredVehicle).status.toUpperCase()}</p>
              <p><strong>GPS:</strong> {hoveredVehicle.currentLocation.latitude?.toFixed(6) || 'N/A'}, {hoveredVehicle.currentLocation.longitude?.toFixed(6) || 'N/A'}</p>
              {getVehicleStatus(hoveredVehicle).minDistance && (
                <p><strong>Nearest:</strong> {getVehicleStatus(hoveredVehicle).minDistance.toFixed(1)}m</p>
              )}
            </div>
          </div>
        )}
        
        <div className="visual-map-legend">
          <div className="legend-item">
            <div className="legend-dot safe"></div>
            <span>Safe Distance (&gt;10m)</span>
          </div>
          <div className="legend-item">
            <div className="legend-dot warning"></div>
            <span>Warning Zone (7-10m)</span>
          </div>
          <div className="legend-item">
            <div className="legend-dot collision"></div>
            <span>Collision Risk (&lt;7m)</span>
          </div>
        </div>


      </div>
    </div>
  );
};

export default VehicleMap;