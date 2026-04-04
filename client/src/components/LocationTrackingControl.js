import React, { useState, useEffect } from "react";
import "./LocationTrackingControl.css";

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

const LocationTrackingControl = ({
  currentUser,
  vehicles,
  onToggleLocationTracking,
  gpsStatus,
  onStartGPS,
  onStartSimulated,
  onAddVehicle,
  onUpdateUser,
  onStopGPS,
  onBackToLanding,
}) => {
  const [isLocationEnabled, setIsLocationEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userDetails, setUserDetails] = useState({
    name: '',
    phoneNumber: '',
    vehicleId: '',
    vehicleType: 'car'
  });
  // Initialize from localStorage to persist across page refreshes
  const [isDetailsSaved, setIsDetailsSaved] = useState(() => {
    const saved = localStorage.getItem('userDetailsSaved');
    const savedPhone = localStorage.getItem('userPhone');
    return saved === 'true' && savedPhone !== null;
  });

  // Find current user's vehicle data
  const currentVehicle = vehicles.find(
    (v) => v.phoneNumber === currentUser?.phoneNumber
  );

  useEffect(() => {
    if (currentVehicle) {
      setIsLocationEnabled(currentVehicle.locationTrackingEnabled || false);
    }
  }, [currentVehicle]);

  useEffect(() => {
    // Check if details are already saved
    // Priority: localStorage > currentUser state
    const saved = localStorage.getItem('userDetailsSaved');
    const savedPhone = localStorage.getItem('userPhone');
    
    if (currentUser && currentUser.name && currentUser.phoneNumber && currentUser.vehicleId) {
      setIsDetailsSaved(true);
      // Persist to localStorage
      localStorage.setItem('userDetailsSaved', 'true');
    } else if (saved === 'true' && savedPhone) {
      // If localStorage says details were saved, don't show form even if currentUser is null
      setIsDetailsSaved(true);
    } else if (!currentUser && saved !== 'true') {
      // Only set to false if currentUser is null AND localStorage doesn't say saved
      setIsDetailsSaved(false);
    }
  }, [currentUser]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserDetails(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddDetails = async () => {
    if (!userDetails.name.trim() || !userDetails.phoneNumber.trim() || !userDetails.vehicleId.trim() || !userDetails.vehicleType.trim()) {
      alert('Please fill in all fields');
      return;
    }

    try {
      // Add vehicle to database
      const result = await onAddVehicle(userDetails.phoneNumber, userDetails.vehicleId, userDetails.name, userDetails.vehicleType);
      
      // Set isDetailsSaved to true immediately to hide the form
      setIsDetailsSaved(true);
      
      // Persist to localStorage so form doesn't show after refresh
      localStorage.setItem('userDetailsSaved', 'true');
      
      // Update current user state with data from server
      if (result.user) {
        onUpdateUser(result.user);
      } else {
        onUpdateUser({
          name: userDetails.name,
          phoneNumber: userDetails.phoneNumber,
          vehicleId: userDetails.vehicleId,
          vehicleType: userDetails.vehicleType
        });
      }
      
      // Store user details in localStorage for future reference
      localStorage.setItem("userPhone", userDetails.phoneNumber);
      localStorage.setItem("userName", userDetails.name);
      localStorage.setItem("userVehicleId", userDetails.vehicleId);
      localStorage.setItem("userVehicleType", userDetails.vehicleType);
      
      // Clear form inputs after successful save
      setUserDetails({
        name: '',
        phoneNumber: '',
        vehicleId: '',
        vehicleType: 'car'
      });
      
      alert('Details saved successfully!');
    } catch (error) {
      console.error('Failed to save details:', error);
      alert('Failed to save details. Please try again.');
      // Keep form visible if save failed
      setIsDetailsSaved(false);
      // Remove localStorage flag if save failed
      localStorage.removeItem('userDetailsSaved');
    }
  };

  const handleToggleLocationTracking = async () => {
    if (!currentUser) return;

    setIsLoading(true);

    try {
      const newState = !isLocationEnabled;

      // Update the server
      await onToggleLocationTracking(currentUser.phoneNumber, newState);

      if (newState) {
        // If enabling location tracking, start GPS
        if (gpsStatus === "inactive" || gpsStatus === "error") {
          onStartGPS();
        }
      } else {
        // If disabling location tracking, stop GPS
        onStopGPS();
      }

      setIsLocationEnabled(newState);
    } catch (error) {
      console.error("Failed to toggle location tracking:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getLocationStatus = () => {
    if (!isLocationEnabled) return "disabled";
    if (gpsStatus === "searching") return "searching";
    if (gpsStatus === "active") return "active";
    if (gpsStatus === "error") return "error";
    return "inactive";
  };

  const getStatusText = () => {
    const status = getLocationStatus();
    switch (status) {
      case "disabled":
        return "Location Tracking Disabled";
      case "searching":
        return "Getting GPS Location...";
      case "active":
        return "Location Tracking Active";
      case "error":
        return "GPS Error - Try Again";
      case "inactive":
        return "Location Tracking Enabled (GPS Inactive)";
      default:
        return "Unknown Status";
    }
  };

  const getStatusIcon = () => {
    const status = getLocationStatus();
    switch (status) {
      case "disabled":
        return "📍";
      case "searching":
        return "🔍";
      case "active":
        return "✅";
      case "error":
        return "❌";
      case "inactive":
        return "⏸️";
      default:
        return "📍";
    }
  };

  // Always show the component, even if no user is set yet

  return (
    <div className="location-tracking-control">
      <div className="control-header">
        <h3>📍 Location Tracking</h3>
        <div className={`status-indicator ${getLocationStatus()}`}>
          <span className="status-icon">{getStatusIcon()}</span>
          <span className="status-text">{getStatusText()}</span>
        </div>
      </div>

      <div className="control-content">
        {!isDetailsSaved ? (
          <div className="user-details-form">
            <h4>📝 Add Your Details</h4>
            <div className="form-group">
              <label>Full Name:</label>
              <input
                type="text"
                name="name"
                value={userDetails.name}
                onChange={handleInputChange}
                placeholder="Enter your full name"
                required
              />
            </div>
            <div className="form-group">
              <label>Phone Number:</label>
              <input
                type="tel"
                name="phoneNumber"
                value={userDetails.phoneNumber}
                onChange={handleInputChange}
                placeholder="Enter your phone number"
                required
              />
            </div>
            <div className="form-group">
              <label>Vehicle ID:</label>
              <input
                type="text"
                name="vehicleId"
                value={userDetails.vehicleId}
                onChange={handleInputChange}
                placeholder="Enter your vehicle ID (e.g., CAR01)"
                required
              />
            </div>
            <div className="form-group">
              <label>Vehicle Type:</label>
              <select
                name="vehicleType"
                value={userDetails.vehicleType}
                onChange={handleInputChange}
                required
              >
                <option value="car">🚗 Car</option>
                <option value="bike">🏍️ Bike</option>
                <option value="auto">🛺 Auto</option>
                <option value="truck">🚚 Truck</option>
                <option value="bus">🚌 Bus</option>
                <option value="bicycle">🚴 Bicycle</option>
              </select>
            </div>
            <button
              onClick={handleAddDetails}
              className="add-details-btn"
            >
              💾 Add Details
            </button>
          </div>
        ) : (
           <div className="vehicle-info">
             <h4>✅ Your Details</h4>
             <p>
               <strong>Name:</strong> {currentUser?.name || 'N/A'}
             </p>
             <p>
               <strong>Vehicle ID:</strong> {currentUser?.vehicleId || 'N/A'}
             </p>
             <p>
               <strong>Vehicle Type:</strong> {currentUser?.vehicleType ? `${getVehicleEmoji(currentUser.vehicleType)} ${currentUser.vehicleType.charAt(0).toUpperCase() + currentUser.vehicleType.slice(1)}` : 'N/A'}
             </p>
             <p>
               <strong>Phone:</strong> {currentUser?.phoneNumber || localStorage.getItem('userPhone') || 'N/A'}
             </p>
           </div>
        )}

        {isDetailsSaved && (
          <div className="control-buttons">
            {/* {onBackToLanding && (
              <button
                type="button"
                onClick={onBackToLanding}
                className="back-to-landing-btn"
              >
                ← Back to Landing Page
              </button>
            )} */}
            <button
              onClick={handleToggleLocationTracking}
              disabled={isLoading}
              className={`toggle-btn ${
                isLocationEnabled ? "enabled" : "disabled"
              }`}
            >
              {isLoading ? (
                <span className="loading">⏳ Updating...</span>
              ) : (
                <>
                  {isLocationEnabled ? "🛑 Disable" : "📍 Enable"} Location
                  Tracking
                </>
              )}
            </button>

            {isLocationEnabled &&
              (gpsStatus === "inactive" || gpsStatus === "error") && (
                <div className="gps-controls">
                  <button
                    onClick={onStartGPS}
                    className="gps-btn"
                    disabled={gpsStatus === "searching"}
                  >
                    {gpsStatus === "searching"
                      ? "🔍 Getting GPS..."
                      : "📡 Start GPS"}
                  </button>
                  <button onClick={onStartSimulated} className="sim-btn">
                    📍 Use Demo Location
                  </button>
                </div>
              )}
          </div>
        )}

        {isDetailsSaved && isLocationEnabled && currentVehicle?.currentLocation && (
          <div className="current-location">
            <h4>Current Location</h4>
            <div className="location-details">
              <p>
                <strong>Latitude:</strong>{" "}
                {currentVehicle.currentLocation.latitude?.toFixed(6) || 'N/A'}
              </p>
              <p>
                <strong>Longitude:</strong>{" "}
                {currentVehicle.currentLocation.longitude?.toFixed(6) || 'N/A'}
              </p>
              <p>
                <strong>Accuracy:</strong> ±
                {currentVehicle.currentLocation.accuracy || 5}m
              </p>
              <p>
                <strong>Last Update:</strong>{" "}
                {new Date(
                  currentVehicle.currentLocation.timestamp
                ).toLocaleString()}
              </p>
              {currentVehicle.currentLocation.isSimulated && (
                <p className="simulated-badge">📍 Simulated Location</p>
              )}
            </div>
          </div>
        )}

        {isDetailsSaved && (
          <div className="tracking-info">
            <h4>ℹ️ About Location Tracking</h4>
            <ul>
              <li>Enable location tracking to appear on the vehicle map</li>
              <li>
                Your location is shared with other users for collision detection
              </li>
              <li>Location data is updated in real-time when GPS is active</li>
              <li>You can disable tracking at any time</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default LocationTrackingControl;
