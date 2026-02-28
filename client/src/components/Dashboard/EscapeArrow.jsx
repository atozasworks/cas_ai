import React from 'react';
import { getDirectionArrow, getRiskColor } from '../../utils/helpers';

export default function EscapeArrow({ escapePath, riskLevel }) {
  if (!escapePath) {
    return (
      <div style={styles.container}>
        <h4 style={styles.title}>Escape Direction</h4>
        <div style={styles.safeText}>All clear</div>
      </div>
    );
  }

  const { safestDirection, directionRisks } = escapePath;
  const directions = ['front', 'right', 'back', 'left'];

  return (
    <div style={styles.container}>
      <h4 style={styles.title}>Escape Direction</h4>
      <div style={styles.compassWrapper}>
        {directions.map((dir) => {
          const isSafe = dir === safestDirection;
          const risk = directionRisks?.[dir];
          const posMap = {
            front: { top: 2, left: '50%', transform: 'translateX(-50%)' },
            right: { top: '50%', right: 2, transform: 'translateY(-50%)' },
            back: { bottom: 2, left: '50%', transform: 'translateX(-50%)' },
            left: { top: '50%', left: 2, transform: 'translateY(-50%)' },
          };

          return (
            <div
              key={dir}
              style={{
                position: 'absolute',
                ...posMap[dir],
                width: 40,
                height: 40,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                fontWeight: 700,
                background: isSafe ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.1)',
                color: isSafe ? '#22c55e' : 'var(--text-muted)',
                border: isSafe ? '2px solid #22c55e' : '1px solid var(--border-color)',
                transition: 'all 0.3s',
              }}
              title={`${dir}: danger=${risk?.dangerScore?.toFixed(0) || 0}, vehicles=${risk?.vehicleCount || 0}`}
            >
              {getDirectionArrow(dir)}
            </div>
          );
        })}
        <div style={{
          ...styles.centerDot,
          background: getRiskColor(riskLevel),
          boxShadow: `0 0 12px ${getRiskColor(riskLevel)}40`,
        }} />
      </div>
      <div style={{
        ...styles.recommendation,
        color: '#22c55e',
      }}>
        Go {safestDirection.toUpperCase()}
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
  compassWrapper: {
    position: 'relative',
    width: 130,
    height: 130,
  },
  centerDot: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 16,
    height: 16,
    borderRadius: '50%',
  },
  safeText: {
    padding: '30px 0',
    fontSize: 16,
    color: '#22c55e',
    fontWeight: 600,
  },
  recommendation: {
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: 1,
  },
};
