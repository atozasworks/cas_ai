import React, { useState } from "react";
import "./GPSSimulation.css";

const GPSSimulation = ({ vehicles, currentUser, onLocationUpdate }) => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [simulationData, setSimulationData] = useState({});

  const handleStartMonitoring = () => {
    if (!currentUser) {
      alert("No user logged in!");
      return;
    }
    
    setIsMonitoring(true);
    // Start GPS monitoring for current user
    startGPSTracking(currentUser);
  };

  const handleStopMonitoring = () => {
    setIsMonitoring(false);
    // Stop all GPS tracking
    Object.values(simulationData).forEach(({ watchId }) => {
      if (watchId && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    });
    setSimulationData({});
  };

  const getCurrentLocation = () => {
    if (!currentUser) {
      alert("No user logged in!");
      return;
    }

    if (!navigator.geolocation) {
      alert("GPS not supported on this device/browser.");
      return;
    }

    console.log(`Getting current location for ${currentUser.name}...`);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const locationData = {
          phoneNumber: currentUser.phoneNumber,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString(),
          speed: position.coords.speed || 0,
          heading: position.coords.heading || 0,
        };
        console.log(`Current location for ${currentUser.name}:`, locationData);
        onLocationUpdate(locationData);
        alert(`Location updated for ${currentUser.name}!\nLat: ${position.coords.latitude.toFixed(6)}\nLng: ${position.coords.longitude.toFixed(6)}\nAccuracy: ±${position.coords.accuracy}m`);
      },
      (error) => {
        console.error("GPS Error for", currentUser.name, ":", error);
        let errorMessage = `Could not get location for ${currentUser.name}: `;
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += "Location access denied. Please enable GPS permissions.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += "GPS signal unavailable. Try going outside or near a window.";
            break;
          case error.TIMEOUT:
            errorMessage += "GPS timeout. Please try again.";
            break;
          default:
            errorMessage += error.message || "Unknown GPS error.";
            break;
        }
        alert(errorMessage);
      },
      { 
        enableHighAccuracy: true, 
        maximumAge: 0, // Force fresh location
        timeout: 20000 // Longer timeout
      }
    );
  };

  const startGPSTracking = (user) => {
    if (!navigator.geolocation) {
      alert("GPS not supported on this device/browser. Use simulation buttons instead.");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const locationData = {
          phoneNumber: user.phoneNumber,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString(),
          speed: position.coords.speed || 0,
          heading: position.coords.heading || 0,
        };
        console.log(`Real GPS update for ${user.name}:`, locationData);
        onLocationUpdate(locationData);
      },
      (error) => {
        console.error("GPS Error for", user.name, ":", error);
        let errorMessage = `GPS Error for ${user.name}: `;
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += "Location access denied. Please enable GPS and grant location permissions in your browser settings.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += "Location information unavailable. Please check your GPS settings and ensure you're not in airplane mode.";
            break;
          case error.TIMEOUT:
            errorMessage += "Location request timed out. Please try again or check your GPS signal.";
            break;
          default:
            errorMessage += "Unknown GPS error occurred.";
            break;
        }
        alert(errorMessage);
      },
      { 
        enableHighAccuracy: true, 
        maximumAge: 500, // More frequent updates
        timeout: 15000 // Longer timeout for better GPS lock
      }
    );

    setSimulationData((prev) => ({
      ...prev,
      [user.phoneNumber]: { watchId, isTracking: true },
    }));
    
    console.log(`Started real GPS tracking for ${user.name} (${user.phoneNumber})`);
  };

  const simulateNearCollision = () => {
    if (vehicles.length >= 2) {
      // Use first vehicle's current location as base, or default if no location
      const firstVehicle = vehicles[0];
      const baseLocation = firstVehicle.currentLocation
        ? {
            latitude: firstVehicle.currentLocation.latitude,
            longitude: firstVehicle.currentLocation.longitude,
          }
        : {
            latitude: 40.7128,
            longitude: -74.006,
          };

      console.log("Simulating near collision with base location:", baseLocation);

      // Place vehicles relative to the first vehicle (base location)
      vehicles.forEach((vehicle, index) => {
        let locationData;
        if (index === 0) {
          // First vehicle stays at base location, facing North
          locationData = {
            phoneNumber: vehicle.phoneNumber,
            latitude: baseLocation.latitude,
            longitude: baseLocation.longitude,
            accuracy: 5,
            heading: 0, // Facing North
            isSimulated: true,
          };
        } else if (index === 1) {
          // Second vehicle exactly 6 meters away from first (within collision threshold)
          // Using precise GPS coordinate conversion
          const targetDistance = 6; // meters
          
          // More accurate conversion: 1 degree latitude = 111,320 meters
          const metersPerDegreeLat = 111320;
          const metersPerDegreeLon = 111320 * Math.cos(baseLocation.latitude * Math.PI / 180);
          
          const latOffset = targetDistance / metersPerDegreeLat;
          const lonOffset = targetDistance / metersPerDegreeLon;
          
          locationData = {
            phoneNumber: vehicle.phoneNumber,
            latitude: baseLocation.latitude + latOffset,
            longitude: baseLocation.longitude + lonOffset,
            accuracy: 5,
            heading: 180, // Facing South (opposite to first vehicle)
            isSimulated: true,
          };
          
          console.log(`Base location: ${baseLocation.latitude}, ${baseLocation.longitude}`);
          console.log(`Offsets: lat=${latOffset}, lon=${lonOffset}`);
          console.log(`Vehicle ${vehicle.vehicleId} positioned at: ${locationData.latitude}, ${locationData.longitude}`);
        } else {
          // Other vehicles spread out from base location
          locationData = {
            phoneNumber: vehicle.phoneNumber,
            latitude: baseLocation.latitude + index * 0.0001,
            longitude: baseLocation.longitude + index * 0.0001,
            accuracy: 5,
            heading: index * 90, // Different headings for variety
            isSimulated: true,
          };
        }
        onLocationUpdate(locationData);
      });
    }
  };

  const simulateExactCollision = () => {
    if (vehicles.length >= 2) {
      // Use first vehicle's current location as base, or default if no location
      const firstVehicle = vehicles[0];
      const baseLocation = firstVehicle.currentLocation
        ? {
            latitude: firstVehicle.currentLocation.latitude,
            longitude: firstVehicle.currentLocation.longitude,
          }
        : {
            latitude: 40.7128,
            longitude: -74.006,
          };

      // Place first two vehicles at exactly the same location (0.0 meters apart)
      vehicles.forEach((vehicle, index) => {
        let locationData;
        if (index === 0 || index === 1) {
          // First two vehicles at exact same location
          locationData = {
            phoneNumber: vehicle.phoneNumber,
            latitude: baseLocation.latitude,
            longitude: baseLocation.longitude,
            accuracy: 5,
            heading: index === 0 ? 90 : 270, // First facing East, second facing West
            isSimulated: true,
          };
        } else {
          // Other vehicles spread out from base location
          locationData = {
            phoneNumber: vehicle.phoneNumber,
            latitude: baseLocation.latitude + index * 0.0001,
            longitude: baseLocation.longitude + index * 0.0001,
            accuracy: 5,
            heading: index * 90,
            isSimulated: true,
          };
        }
        onLocationUpdate(locationData);
      });
    }
  };



  const assignRandomPositions = () => {
    if (vehicles.length === 0) {
      alert("Please register some vehicles first!");
      return;
    }

    // Use first vehicle's current location as base, or default if no location
    const firstVehicle = vehicles[0];
    const baseLocation = firstVehicle.currentLocation
      ? {
          latitude: firstVehicle.currentLocation.latitude,
          longitude: firstVehicle.currentLocation.longitude,
        }
      : {
          latitude: 40.7128,
          longitude: -74.006,
        };

    vehicles.forEach((vehicle, index) => {
      const locationData = {
        phoneNumber: vehicle.phoneNumber,
        latitude:
          index === 0
            ? baseLocation.latitude
            : baseLocation.latitude + (Math.random() - 0.5) * 0.01,
        longitude:
          index === 0
            ? baseLocation.longitude
            : baseLocation.longitude + (Math.random() - 0.5) * 0.01,
        accuracy: 5,
        heading: Math.floor(Math.random() * 360), // Random heading 0-359 degrees
        isSimulated: true,
      };
      onLocationUpdate(locationData);
    });
  };

  const clearStorage = () => {
    setSimulationData({});
    localStorage.clear();
  };

  const showDistances = () => {
    if (vehicles.length < 2) {
      alert("Need at least 2 vehicles to calculate distances!");
      return;
    }

    let distanceInfo = "Current distances between vehicles:\n\n";

    for (let i = 0; i < vehicles.length; i++) {
      for (let j = i + 1; j < vehicles.length; j++) {
        const vehicle1 = vehicles[i];
        const vehicle2 = vehicles[j];

        if (vehicle1.currentLocation && vehicle2.currentLocation) {
          // Use same calculation as server (geolib equivalent)
          const lat1 = vehicle1.currentLocation.latitude;
          const lon1 = vehicle1.currentLocation.longitude;
          const lat2 = vehicle2.currentLocation.latitude;
          const lon2 = vehicle2.currentLocation.longitude;

          // Haversine formula for distance calculation (same as geolib)
          const R = 6371000; // Earth's radius in meters
          const dLat = ((lat2 - lat1) * Math.PI) / 180;
          const dLon = ((lon2 - lon1) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat1 * Math.PI) / 180) *
              Math.cos((lat2 * Math.PI) / 180) *
              Math.sin(dLon / 2) *
              Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const distance = R * c;

          distanceInfo += `${vehicle1.vehicleId} ↔ ${
            vehicle2.vehicleId
          }: ${distance.toFixed(1)} meters\n`;
          
          // Log to console for debugging
          console.log(`Distance calculation: ${vehicle1.vehicleId} to ${vehicle2.vehicleId} = ${distance.toFixed(1)}m`);
        } else {
          distanceInfo += `${vehicle1.vehicleId} ↔ ${vehicle2.vehicleId}: No GPS data\n`;
        }
      }
    }

    alert(distanceInfo);
  };





  return (
    <div className="dashboard-panel">
      <h3>GPS Simulation</h3>

      <div className="simulation-controls">
        <div className="control-row">
          <button
            className={`control-btn ${isMonitoring ? "active" : ""}`}
            onClick={handleStartMonitoring}
          >
            Start Real GPS Monitoring
          </button>
          <button className="control-btn stop" onClick={handleStopMonitoring}>
            Stop Monitoring
          </button>
        </div>

        <div className="control-row">
          <button
            className="control-btn info"
            onClick={getCurrentLocation}
          >
            Get Current Location Now
          </button>
        </div>

        <div className="control-row">
          <button
            className="control-btn warning"
            onClick={simulateNearCollision}
          >
            Simulate Near Collision (6m)
          </button>
          <button
            className="control-btn danger"
            onClick={simulateExactCollision}
          >
            Simulate Exact Collision (0.0m)
          </button>
        </div>





        <div className="control-row">
          <button
            className="control-btn success"
            onClick={assignRandomPositions}
          >
            Assign Random Positions
          </button>
          <button className="control-btn info" onClick={showDistances}>
            Show Distances
          </button>
        </div>

        <div className="control-row">
          <button className="control-btn danger" onClick={clearStorage}>
            Clear Storage
          </button>
        </div>
      </div>
    </div>
  );
};

export default GPSSimulation;
