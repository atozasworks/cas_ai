import React, { useState, useEffect } from 'react';
import VehicleMap from './VehicleMap';

// Demo component to showcase the map functionality
const MapDemo = () => {
  const [demoVehicles, setDemoVehicles] = useState([]);

  useEffect(() => {
    // Create some demo vehicles with different statuses
    const vehicles = [
      {
        phoneNumber: '+1234567890',
        vehicleId: 'CAR001',
        fullName: 'John Doe',
        currentLocation: {
          latitude: 40.7128,
          longitude: -74.0060,
          timestamp: new Date()
        },
        isActive: true,
        locationTrackingEnabled: true,
        isDriving: true,
        lastUpdate: new Date()
      },
      {
        phoneNumber: '+1234567891',
        vehicleId: 'CAR002',
        fullName: 'Jane Smith',
        currentLocation: {
          latitude: 40.7128 + 0.00002, // ~2m from CAR001 (collision risk <7m)
          longitude: -74.0060 + 0.00002,
          timestamp: new Date()
        },
        isActive: true,
        locationTrackingEnabled: true,
        isDriving: true,
        lastUpdate: new Date()
      },
      {
        phoneNumber: '+1234567892',
        vehicleId: 'CAR003',
        fullName: 'Mike Johnson',
        currentLocation: {
          latitude: 40.7128 + 0.00004, // ~4m from CAR001 (warning zone 7-10m)
          longitude: -74.0060 + 0.00004,
          timestamp: new Date()
        },
        isActive: true,
        locationTrackingEnabled: true,
        isDriving: true,
        lastUpdate: new Date()
      },
      {
        phoneNumber: '+1234567893',
        vehicleId: 'CAR004',
        fullName: 'Sarah Wilson',
        currentLocation: {
          latitude: 40.7150, // Safe distance
          longitude: -74.0080,
          timestamp: new Date()
        },
        isActive: true,
        locationTrackingEnabled: true,
        isDriving: true,
        lastUpdate: new Date()
      }
    ];

    setDemoVehicles(vehicles);

    // Simulate vehicle movement
    const interval = setInterval(() => {
      setDemoVehicles(prevVehicles => 
        prevVehicles.map(vehicle => ({
          ...vehicle,
          currentLocation: {
            ...vehicle.currentLocation,
            latitude: vehicle.currentLocation.latitude + (Math.random() - 0.5) * 0.0001,
            longitude: vehicle.currentLocation.longitude + (Math.random() - 0.5) * 0.0001,
            timestamp: new Date()
          },
          lastUpdate: new Date()
        }))
      );
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h2>🗺️ Vehicle Map Demo</h2>
      <p>This demo shows vehicles on an interactive OpenStreetMap with real-time collision detection:</p>
      <ul>
        <li><strong>Green markers:</strong> Safe distance (&gt;10m)</li>
        <li><strong>Yellow markers:</strong> Warning zone (7-10m)</li>
        <li><strong>Red markers:</strong> Collision risk (&lt;7m)</li>
      </ul>
      <VehicleMap vehicles={demoVehicles} />
    </div>
  );
};

export default MapDemo;