import React from 'react';
import { getRiskColor } from '../../utils/helpers';

export default function ProximityRadar({ nearbyVehicles = [], riskLevel = 'low' }) {
  const radarColor = getRiskColor(riskLevel);

  const mapToRadar = (vehicles) => {
    return vehicles.slice(0, 8).map((v, i) => {
      const maxDist = 500;
      const normDist = Math.min(v.distance || 100, maxDist) / maxDist;
      const angle = (i / Math.max(vehicles.length, 1)) * 2 * Math.PI - Math.PI / 2;
      const r = 30 + normDist * 50;
      return {
        x: 90 + r * Math.cos(angle),
        y: 90 + r * Math.sin(angle),
        dist: v.distance || 0,
        id: v.vehicleId || i,
      };
    });
  };

  const dots = mapToRadar(nearbyVehicles);

  return (
    <div style={styles.container}>
      <h4 style={styles.title}>Proximity Radar</h4>
      <svg width="180" height="180" viewBox="0 0 180 180">
        {/* Rings */}
        {[70, 50, 30].map((r) => (
          <circle key={r} cx="90" cy="90" r={r} fill="none"
            stroke="var(--border-color)" strokeWidth="1" strokeDasharray="4 3" />
        ))}
        {/* Cross lines */}
        <line x1="90" y1="20" x2="90" y2="160" stroke="var(--border-color)" strokeWidth="0.5" />
        <line x1="20" y1="90" x2="160" y2="90" stroke="var(--border-color)" strokeWidth="0.5" />
        {/* Center dot */}
        <circle cx="90" cy="90" r="5" fill="#3b82f6" />
        {/* Sweep */}
        <circle cx="90" cy="90" r="68" fill="none"
          stroke={radarColor} strokeWidth="1" opacity="0.3"
          strokeDasharray="30 185" style={{ animation: 'spin 3s linear infinite', transformOrigin: '90px 90px' }} />
        {/* Nearby vehicle dots */}
        {dots.map((d) => (
          <g key={d.id}>
            <circle cx={d.x} cy={d.y} r="4" fill={radarColor} opacity="0.9" />
            <circle cx={d.x} cy={d.y} r="8" fill={radarColor} opacity="0.2">
              <animate attributeName="r" values="4;12;4" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite" />
            </circle>
          </g>
        ))}
        {/* Labels */}
        <text x="90" y="16" textAnchor="middle" fill="var(--text-muted)" fontSize="9">N</text>
        <text x="164" y="94" textAnchor="middle" fill="var(--text-muted)" fontSize="9">E</text>
        <text x="90" y="176" textAnchor="middle" fill="var(--text-muted)" fontSize="9">S</text>
        <text x="16" y="94" textAnchor="middle" fill="var(--text-muted)" fontSize="9">W</text>
      </svg>
      <div style={styles.count}>
        {nearbyVehicles.length} vehicle{nearbyVehicles.length !== 1 ? 's' : ''} detected
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  count: {
    fontSize: 12,
    color: 'var(--text-muted)',
  },
};
