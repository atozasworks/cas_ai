import React from "react";

import RegisteredVehicles from "./RegisteredVehicles";
import GPSSimulation from "./GPSSimulation";
import SystemStatus from "./SystemStatus";

import VehiclePositionsMap from "./VehiclePositionsMap";
import LocationTrackingControl from "./LocationTrackingControl";
import "./Dashboard.css";

const Dashboard = ({
  vehicles,
  allUsers,
  systemStatus,
  currentUser,
  onAddVehicle,
  onRemoveVehicle,
  onToggleDriving,
  onLocationUpdate,
  onToggleLocationTracking,
  gpsStatus,
  onStartGPS,
  onStartSimulated,
  onUpdateUser,
  onStopGPS,
  onBackToLanding,
}) => {
  return (
    <div className="dashboard">
      <div className="dashboard-row">
        <LocationTrackingControl
          currentUser={currentUser}
          vehicles={vehicles}
          onToggleLocationTracking={onToggleLocationTracking}
          gpsStatus={gpsStatus}
          onStartGPS={onStartGPS}
          onStartSimulated={onStartSimulated}
          onAddVehicle={onAddVehicle}
          onUpdateUser={onUpdateUser}
          onStopGPS={onStopGPS}
          onBackToLanding={onBackToLanding}
        />
      </div>

      <div className="dashboard-row">
        <RegisteredVehicles
          vehicles={vehicles}
          onRemoveVehicle={onRemoveVehicle}
          onToggleDriving={onToggleDriving}
        />
        <GPSSimulation
          vehicles={vehicles}
          currentUser={currentUser}
          onLocationUpdate={onLocationUpdate}
        />
      </div>

      <div className="dashboard-row">
        <SystemStatus status={systemStatus} />
      </div>

      <div className="dashboard-row full-width">
        <VehiclePositionsMap 
          vehicles={vehicles}
          allUsers={allUsers}
          currentUser={currentUser}
        />
      </div>
    </div>
  );
};

export default Dashboard;
