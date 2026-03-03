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
import MobileHomeScreen from '../Mobile/MobileHomeScreen';

export default function DashboardPage() {
  const { riskData, nearbyVehicles, behaviorAlert, activeVehicleId } = useSocket();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [vehicles, setVehicles] = useState([]);

  const loadVehicles = () => {
    vehicleAPI.getAll()
      .then((data) => setVehicles(data.vehicles || []))
      .catch(() => {});
  };

  useEffect(() => {
    loadVehicles();
    // Refresh vehicles list every 10 seconds to catch newly added vehicles
    const interval = setInterval(loadVehicles, 10000);
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
        <MobileHomeScreen />
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Behavior Alert Banner */}
      {behaviorAlert && (
        <div style={styles.behaviorBanner}>
          <span style={styles.behaviorIcon}>
            {behaviorAlert.type === 'hard_brake' ? '!!!' :
             behaviorAlert.type === 'sharp_turn' ? '!!!' :
             behaviorAlert.type === 'overspeed' ? '!!!' : '!!!'}
          </span>
          {behaviorAlert.message}
        </div>
      )}

      <div style={styles.mainGrid}>
        {/* Left Column: Map + Vehicles */}
        <div style={styles.leftCol}>
          <div className="card" style={styles.mapCard}>
            <TrackingMap userName={user?.name} activeVehicle={activeVehicle} vehicles={vehicles} />
          </div>
          <div className="card">
            <VehicleSelector />
          </div>
        </div>

        {/* Right Column: Risk Panel */}
        <div style={styles.rightCol}>
          {/* Risk Meter */}
          <div className="card">
            <RiskMeter riskScore={riskScore} riskLevel={riskLevel} />
          </div>

          {/* Alert Panel */}
          <AlertPanel riskData={riskData} />

          {/* Radar + Escape */}
          <div style={styles.radarEscapeRow}>
            <div className="card" style={{ flex: 1 }}>
              <ProximityRadar nearbyVehicles={nearbyVehicles} riskLevel={riskLevel} />
            </div>
            <div className="card" style={{ flex: 1 }}>
              <EscapeArrow escapePath={riskData?.escapePath} riskLevel={riskLevel} />
            </div>
          </div>

          {/* AI Assistant */}
          <div className="card">
            <AIAssistant />
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    padding: 16,
    maxWidth: 1400,
    margin: '0 auto',
  },
  behaviorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 16px',
    marginBottom: 12,
    background: 'rgba(234, 179, 8, 0.15)',
    border: '1px solid rgba(234, 179, 8, 0.3)',
    borderRadius: 10,
    color: '#eab308',
    fontSize: 14,
    fontWeight: 600,
    animation: 'fadeIn 0.3s ease',
  },
  behaviorIcon: {
    fontSize: 16,
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 380px',
    gap: 16,
    alignItems: 'start',
  },
  leftCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  mapCard: {
    padding: 0,
    overflow: 'hidden',
    height: 500,
  },
  rightCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  radarEscapeRow: {
    display: 'flex',
    gap: 12,
  },
};
