import React from 'react';
import { getRiskColor } from '../../utils/helpers';

export default function RiskMeter({ riskScore = 0, riskLevel = 'low' }) {
  const color = getRiskColor(riskLevel);
  const angle = (riskScore / 100) * 180 - 90;

  return (
    <div style={styles.container}>
      <svg width="200" height="120" viewBox="0 0 200 120">
        <defs>
          <linearGradient id="meterGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="50%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>
        {/* Background arc */}
        <path
          d="M 20 110 A 80 80 0 0 1 180 110"
          fill="none"
          stroke="var(--bg-tertiary)"
          strokeWidth="12"
          strokeLinecap="round"
        />
        {/* Colored arc */}
        <path
          d="M 20 110 A 80 80 0 0 1 180 110"
          fill="none"
          stroke="url(#meterGrad)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${(riskScore / 100) * 251.2} 251.2`}
        />
        {/* Needle */}
        <line
          x1="100" y1="110"
          x2={100 + 60 * Math.cos((angle * Math.PI) / 180)}
          y2={110 + 60 * Math.sin((angle * Math.PI) / 180)}
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="100" cy="110" r="6" fill={color} />
      </svg>
      <div style={styles.scoreRow}>
        <span style={{ ...styles.score, color }}>{riskScore}</span>
        <span style={styles.maxScore}>/100</span>
      </div>
      <div style={{ ...styles.label, color }}>
        {riskLevel.toUpperCase()} RISK
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '8px 0',
  },
  scoreRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 2,
    marginTop: -10,
  },
  score: {
    fontSize: 36,
    fontWeight: 800,
  },
  maxScore: {
    fontSize: 16,
    color: 'var(--text-muted)',
    fontWeight: 500,
  },
  label: {
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: 2,
    marginTop: 4,
  },
};
