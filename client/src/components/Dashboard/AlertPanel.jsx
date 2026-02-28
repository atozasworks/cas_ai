import React from 'react';
import { getRiskColor, getRiskBadgeClass, formatDistance } from '../../utils/helpers';
import { FiAlertTriangle, FiNavigation, FiInfo } from 'react-icons/fi';

export default function AlertPanel({ riskData }) {
  if (!riskData || riskData.riskLevel === 'low') {
    return (
      <div style={styles.container}>
        <div style={styles.safeState}>
          <div style={styles.safeIcon}>
            <FiNavigation style={{ color: '#22c55e', fontSize: 24 }} />
          </div>
          <h3 style={{ color: '#22c55e', fontWeight: 700, fontSize: 18 }}>All Clear</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            No immediate threats detected. Drive safely.
          </p>
        </div>
      </div>
    );
  }

  const isHigh = riskData.riskLevel === 'high';

  return (
    <div style={{
      ...styles.container,
      borderColor: getRiskColor(riskData.riskLevel),
      animation: isHigh ? 'emergencyFlash 1s ease infinite' : 'none',
    }}>
      <div style={styles.header}>
        <FiAlertTriangle style={{ color: getRiskColor(riskData.riskLevel), fontSize: 20 }} />
        <span className={`badge ${getRiskBadgeClass(riskData.riskLevel)}`}>
          {riskData.riskLevel?.toUpperCase()} RISK
        </span>
        <span style={styles.score}>Score: {riskData.finalRisk}</span>
      </div>

      <div style={styles.action}>
        <strong style={{ color: getRiskColor(riskData.riskLevel), fontSize: 16 }}>
          {riskData.actionLabel || riskData.action}
        </strong>
      </div>

      {riskData.explanation && (
        <div style={styles.explanation}>
          <FiInfo style={{ flexShrink: 0, marginTop: 2, color: 'var(--accent-blue)' }} />
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {riskData.explanation}
          </p>
        </div>
      )}

      {riskData.assessments?.length > 0 && (
        <div style={styles.detailsGrid}>
          {riskData.assessments.slice(0, 3).map((a, i) => (
            <div key={i} style={styles.detailItem}>
              <span style={styles.detailLabel}>Vehicle {i + 1}</span>
              <span style={styles.detailValue}>
                {formatDistance(a.components?.distance || 0)} | Risk: {a.riskScore}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: 12,
    padding: 16,
    transition: 'all 0.3s',
  },
  safeState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    padding: '20px 0',
  },
  safeIcon: {
    width: 56,
    height: 56,
    borderRadius: '50%',
    background: 'rgba(34, 197, 94, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  score: {
    marginLeft: 'auto',
    fontSize: 13,
    color: 'var(--text-muted)',
    fontWeight: 600,
  },
  action: {
    padding: '10px 0',
    borderTop: '1px solid var(--border-color)',
    borderBottom: '1px solid var(--border-color)',
    marginBottom: 12,
  },
  explanation: {
    display: 'flex',
    gap: 8,
    padding: 10,
    background: 'rgba(59, 130, 246, 0.05)',
    borderRadius: 8,
    marginBottom: 12,
  },
  detailsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  detailItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 12,
    padding: '4px 0',
    borderBottom: '1px solid var(--border-color)',
  },
  detailLabel: { color: 'var(--text-muted)', fontWeight: 500 },
  detailValue: { color: 'var(--text-secondary)', fontWeight: 600 },
};
