import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiAlertTriangle, FiClock, FiShield, FiUsers } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { adminAPI } from '../../services/adminApi';
import { formatDate } from '../../utils/helpers';

const formatLocation = (location) => {
  const coords = location?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return 'Unknown location';
  return `${Number(coords[1]).toFixed(4)}, ${Number(coords[0]).toFixed(4)}`;
};

const widgets = [
  { key: 'totalUsers', label: 'Total Users', icon: FiUsers, tone: 'is-blue' },
  { key: 'activeUsers', label: 'Active Users', icon: FiShield, tone: 'is-green' },
  { key: 'totalAlerts', label: 'Total Alerts', icon: FiClock, tone: 'is-amber' },
  { key: 'highRiskAlerts', label: 'High Risk Alerts', icon: FiAlertTriangle, tone: 'is-red' },
];

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    adminAPI.getDashboard()
      .then((res) => {
        if (mounted) setData(res.dashboard);
      })
      .catch((err) => toast.error(err?.message || 'Failed to load dashboard'))
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="admin-center">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-stat-grid">
        {widgets.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.key} className="admin-stat-card">
              <div>
                <p className="admin-stat-label">{item.label}</p>
                <p className="admin-stat-value">{data?.[item.key] ?? 0}</p>
              </div>
              <div className={`admin-stat-icon ${item.tone}`}>
                <Icon size={20} />
              </div>
            </div>
          );
        })}
      </div>

      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2>Recent Alert Activity</h2>
            <p className="admin-muted">Latest collision-risk events across all users</p>
          </div>
          <Link to="/home/admin/alerts" className="admin-link">View all</Link>
        </div>
        <div className="admin-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>User</th>
                <th>Type</th>
                <th>Location</th>
                <th>Risk</th>
              </tr>
            </thead>
            <tbody>
              {(data?.recentAlerts || []).length === 0 && (
                <tr>
                  <td colSpan={5} className="admin-empty">No recent alerts</td>
                </tr>
              )}
              {(data?.recentAlerts || []).map((alert) => (
                <tr key={alert._id}>
                  <td>{formatDate(alert.timestamp)}</td>
                  <td className="admin-name">{alert.userId?.name || 'Unknown'}</td>
                  <td>{String(alert.eventType || '').replace(/_/g, ' ')}</td>
                  <td>{formatLocation(alert.location)}</td>
                  <td>
                    <span className={`admin-badge is-${alert.riskLevel || 'low'}`}>
                      {alert.riskScore} · {alert.riskLevel}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
