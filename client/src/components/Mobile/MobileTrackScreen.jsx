import React, { useEffect, useState } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { vehicleAPI } from '../../services/api';
import TrackingMap from '../Map/TrackingMap';
import ProximityRadar from '../Dashboard/ProximityRadar';
import VehicleSelector from '../Dashboard/VehicleSelector';
import { getRiskColor } from '../../utils/helpers';
import { formatSpeed } from '../../utils/helpers';
import { FiWifi, FiWifiOff, FiNavigation } from 'react-icons/fi';

export default function MobileTrackScreen() {
  const { riskData, nearbyVehicles, lastPosition, connected, activeVehicleId } = useSocket();
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [allMapVehicles, setAllMapVehicles] = useState([]);
  const [showVehicles, setShowVehicles] = useState(false);
  const [showRadar, setShowRadar] = useState(false);

  useEffect(() => {
    const load = () => {
      vehicleAPI.getAll()
        .then((data) => setVehicles(data.vehicles || []))
        .catch(() => {});
      vehicleAPI.getAllForMap()
        .then((data) => setAllMapVehicles(data.vehicles || []))
        .catch(() => {});
    };
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  const activeVehicle = vehicles.find((v) => (v._id || v.id) === activeVehicleId);
  const riskLevel = riskData?.riskLevel || 'low';
  const riskScore = riskData?.finalRisk ?? 0;
  const speed = lastPosition?.speed ?? 0;
  const color = getRiskColor(riskLevel);

  return (
    <div className="mobile-track-screen">
      <div className="mobile-track-map-wrap">
        <TrackingMap userName={user?.name} activeVehicle={activeVehicle} vehicles={vehicles} allMapVehicles={allMapVehicles} />
      </div>

      <div className="mobile-track-floating">
        <div className="mobile-track-speed-card">
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Speed
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>
              {formatSpeed(speed)}
            </div>
          </div>
          <span
            className="mobile-track-risk-badge"
            style={{
              background: `${color}20`,
              color,
            }}
          >
            {riskLevel}
          </span>
        </div>
        <div className="mobile-track-gps">
          {connected ? (
            <>
              <FiWifi style={{ color: '#22c55e', fontSize: 14 }} />
              <span>GPS Live</span>
            </>
          ) : (
            <>
              <FiWifiOff style={{ color: '#ef4444', fontSize: 14 }} />
              <span>Connecting...</span>
            </>
          )}
        </div>
      </div>

      <div className="mobile-track-fab-row">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setShowVehicles(!showVehicles)}
          style={{
            padding: '12px 20px',
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)',
          }}
        >
          <FiNavigation style={{ marginRight: 6 }} />
          Vehicles
        </button>
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => setShowRadar(!showRadar)}
          style={{
            padding: '12px 20px',
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 600,
            background: 'var(--bg-overlay)',
            backdropFilter: 'blur(12px)',
            border: '1px solid var(--border-color)',
          }}
        >
          Radar
        </button>
      </div>

      {showRadar && (
        <div className="mobile-track-radar-float" style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setShowRadar(false)}
            style={{
              position: 'absolute', top: 4, right: 4, zIndex: 1,
              background: 'rgba(0,0,0,0.15)', border: 'none', borderRadius: '50%',
              width: 24, height: 24, minHeight: 24, minWidth: 24,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-muted)', fontSize: 14, cursor: 'pointer',
            }}
          >
            ✕
          </button>
          <ProximityRadar nearbyVehicles={nearbyVehicles} riskLevel={riskLevel} />
        </div>
      )}

      {showVehicles && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            top: 'auto',
            bottom: 0,
            maxHeight: '70vh',
            background: 'var(--bg-secondary)',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            boxShadow: '0 -8px 32px rgba(0,0,0,0.3)',
            zIndex: 100,
            overflow: 'auto',
            padding: 20,
            paddingBottom: 'calc(88px + env(safe-area-inset-bottom, 0))',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>My Vehicles</h3>
            <button
              type="button"
              onClick={() => setShowVehicles(false)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 14 }}
            >
              Close
            </button>
          </div>
          <VehicleSelector />
        </div>
      )}
    </div>
  );
}
