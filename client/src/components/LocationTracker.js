import React, { useState, useEffect } from 'react';
import './LocationTracker.css';

const LocationTracker = ({ onLocationUpdate, onTrackingChange }) => {
  const [location, setLocation] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState(null);
  const [watchId, setWatchId] = useState(null);

  useEffect(() => {
    onTrackingChange(isTracking);
  }, [isTracking, onTrackingChange]);

  const startTracking = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 1000 // 1 second
    };

    const id = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date(position.timestamp)
        };
        
        setLocation(newLocation);
        setError(null);
        onLocationUpdate(newLocation);
      },
      (error) => {
        setError(`Location error: ${error.message}`);
        console.error('Geolocation error:', error);
      },
      options
    );

    setWatchId(id);
    setIsTracking(true);
  };

  const stopTracking = () => {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setIsTracking(false);
  };

  const requestPermission = async () => {
    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      if (permission.state === 'denied') {
        setError('Location permission denied. Please enable location access in your browser settings.');
      } else {
        startTracking();
      }
    } catch (err) {
      // Fallback for browsers that don't support permissions API
      startTracking();
    }
  };

  return (
    <div className="location-tracker">
      <div className="tracker-card">
        <h3>📍 GPS Tracking</h3>
        
        <div className="tracking-controls">
          {!isTracking ? (
            <button className="start-btn" onClick={requestPermission}>
              Start GPS Tracking
            </button>
          ) : (
            <button className="stop-btn" onClick={stopTracking}>
              Stop Tracking
            </button>
          )}
        </div>

        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}

        {location && (
          <div className="location-info">
            <h4>Current Location:</h4>
            <div className="location-details">
              <p><strong>Latitude:</strong> {location.latitude?.toFixed(6) || 'N/A'}</p>
              <p><strong>Longitude:</strong> {location.longitude?.toFixed(6) || 'N/A'}</p>
              <p><strong>Accuracy:</strong> ±{location.accuracy?.toFixed(1) || 'N/A'}m</p>
              <p><strong>Last Update:</strong> {location.timestamp.toLocaleTimeString()}</p>
            </div>
          </div>
        )}

        <div className="safety-info">
          <h4>🛡️ Safety Features Active:</h4>
          <ul>
            <li>Real-time collision detection</li>
            <li>3-meter proximity alerts</li>
            <li>Visual and audio warnings</li>
            <li>Continuous GPS monitoring</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default LocationTracker;