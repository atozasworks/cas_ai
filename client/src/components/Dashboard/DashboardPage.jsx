import React, { useState, useEffect } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { vehicleAPI } from '../../services/api';
import { useIsMobile } from '../../hooks/useIsMobile';
import TrackingMap from '../Map/TrackingMap';
import RiskMeter from './RiskMeter';
import ProximityRadar from './ProximityRadar';
import EscapeArrow from './EscapeArrow';
import AlertPanel from './AlertPanel';
import VehicleSelector from './VehicleSelector';
import AIAssistant from './AIAssistant';

export default function DashboardPage() {
  const { riskData, nearbyVehicles, behaviorAlert, activeVehicleId } = useSocket();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [vehicles, setVehicles] = useState([]);
  const [allMapVehicles, setAllMapVehicles] = useState([]);

  const loadVehicles = () => {
    vehicleAPI.getAll()
      .then((data) => setVehicles(data.vehicles || []))
      .catch(() => {});
  };

  const loadMapVehicles = () => {
    vehicleAPI.getAllForMap()
      .then((data) => setAllMapVehicles(data.vehicles || []))
      .catch(() => {});
  };

  useEffect(() => {
    loadVehicles();
    loadMapVehicles();
    const interval = setInterval(() => {
      loadVehicles();
      loadMapVehicles();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const activeVehicle = vehicles.find(
    (v) => (v._id || v.id) === activeVehicleId
  );

  const riskLevel = riskData?.riskLevel || 'low';
  const riskScore = riskData?.finalRisk || 0;

  if (isMobile) {
    return (
      <div className="mobile-root">
        <div className="mobile-dashboard-wrap mobile-main">
          {behaviorAlert && (
            <div className="dashboard-behavior-banner dashboard-behavior-banner--mobile">
              <span className="dashboard-behavior-icon">!!!</span>
              {behaviorAlert.message}
            </div>
          )}

          <div className="card mobile-dashboard-map-card">
            <TrackingMap userName={user?.name} activeVehicle={activeVehicle} vehicles={vehicles} allMapVehicles={allMapVehicles} />
          </div>

          <div className="card">
            <VehicleSelector />
          </div>

          <div className="card">
            <RiskMeter riskScore={riskScore} riskLevel={riskLevel} />
          </div>

          <AlertPanel riskData={riskData} />

          <div className="mobile-dashboard-radar-row">
            <div className="card">
              <ProximityRadar nearbyVehicles={nearbyVehicles} riskLevel={riskLevel} />
            </div>
            <div className="card">
              <EscapeArrow escapePath={riskData?.escapePath} riskLevel={riskLevel} />
            </div>
          </div>

          <div className="card">
            <AIAssistant />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      {behaviorAlert && (
        <div className="dashboard-behavior-banner">
          <span className="dashboard-behavior-icon">!!!</span>
          {behaviorAlert.message}
        </div>
      )}

      <div className="dashboard-main-grid">
        <div className="dashboard-left-col">
          <div className="card dashboard-map-card">
            <TrackingMap userName={user?.name} activeVehicle={activeVehicle} vehicles={vehicles} allMapVehicles={allMapVehicles} />
          </div>
          <div className="card">
            <VehicleSelector />
          </div>
        </div>

        <div className="dashboard-right-col">
          <div className="card">
            <RiskMeter riskScore={riskScore} riskLevel={riskLevel} />
          </div>

          <AlertPanel riskData={riskData} />

          <div className="dashboard-radar-row">
            <div className="card">
              <ProximityRadar nearbyVehicles={nearbyVehicles} riskLevel={riskLevel} />
            </div>
            <div className="card">
              <EscapeArrow escapePath={riskData?.escapePath} riskLevel={riskLevel} />
            </div>
          </div>

          <div className="card">
            <AIAssistant />
          </div>
        </div>
      </div>
    </div>
  );
}
