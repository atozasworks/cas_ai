import React from 'react';
import './SystemStatus.css';

const SystemStatus = ({ status }) => {
  return (
    <div className="dashboard-panel system-status">
      <h3>System Status</h3>
      <div className="status-grid">
        <div className="status-item">
          <span className="status-label">Monitoring:</span>
          <span className="status-value active">{status.monitoring}</span>
        </div>
        
        <div className="status-item">
          <span className="status-label">Last Update:</span>
          <span className="status-value">{status.lastUpdate}</span>
        </div>
        
        <div className="status-item">
          <span className="status-label">Collision Threshold:</span>
          <span className="status-value threshold">{status.collisionThreshold} meter</span>
        </div>
        
        <div className="status-item">
          <span className="status-label">Warning Threshold:</span>
          <span className="status-value warning">{status.warningThreshold} meters</span>
        </div>
        
        <div className="status-item">
          <span className="status-label">Max Range:</span>
          <span className="status-value range">{status.maxRange}</span>
        </div>
      </div>
    </div>
  );
};

export default SystemStatus;