import React, { useCallback, useEffect, useState } from 'react';
import { FiSearch, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { adminAPI } from '../../services/adminApi';
import { formatDate } from '../../utils/helpers';

const formatLocation = (location) => {
  const coords = location?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return 'Unknown location';
  return `${Number(coords[1]).toFixed(4)}, ${Number(coords[0]).toFixed(4)}`;
};

const EVENT_TYPES = [
  'proximity_warning',
  'collision_risk',
  'near_miss',
  'hard_brake',
  'sharp_turn',
  'overspeed',
  'erratic_driving',
  'stationary_hazard',
];

export default function AdminAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [riskLevel, setRiskLevel] = useState('');
  const [eventType, setEventType] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getAlerts({
        page,
        limit: 15,
        search: debouncedSearch || undefined,
        riskLevel: riskLevel || undefined,
        eventType: eventType || undefined,
      });
      setAlerts(res.alerts || []);
      setTotal(res.total || 0);
      setPages(res.pages || 1);
    } catch (err) {
      toast.error(err?.message || 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, riskLevel, eventType]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, riskLevel, eventType]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const openDetails = async (id) => {
    setDetailsLoading(true);
    try {
      const res = await adminAPI.getAlert(id);
      setSelected(res.alert);
    } catch (err) {
      toast.error(err?.message || 'Failed to load alert');
    } finally {
      setDetailsLoading(false);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-filters-3">
        <div className="admin-search">
          <FiSearch />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search alerts" />
        </div>
        <select value={riskLevel} onChange={(e) => setRiskLevel(e.target.value)}>
          <option value="">All risk levels</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select value={eventType} onChange={(e) => setEventType(e.target.value)}>
          <option value="">All event types</option>
          {EVENT_TYPES.map((type) => (
            <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      <div className="admin-card">
        <div className="admin-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>User</th>
                <th>Location</th>
                <th>Risk score</th>
                <th>Type</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="admin-empty">Loading alerts…</td></tr>
              ) : alerts.length === 0 ? (
                <tr><td colSpan={6} className="admin-empty">No alerts found</td></tr>
              ) : alerts.map((alert) => (
                <tr key={alert._id}>
                  <td>{formatDate(alert.timestamp)}</td>
                  <td className="admin-name">{alert.userId?.name || 'Unknown'}</td>
                  <td>{formatLocation(alert.location)}</td>
                  <td>
                    <span className={`admin-badge is-${alert.riskLevel || 'low'}`}>
                      {alert.riskScore} · {alert.riskLevel}
                    </span>
                  </td>
                  <td>{String(alert.eventType || '').replace(/_/g, ' ')}</td>
                  <td>
                    <button type="button" onClick={() => openDetails(alert._id)} className="admin-btn">Details</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="admin-table-footer">
          <span>{total} alerts</span>
          <div className="admin-pager">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="admin-btn">Prev</button>
            <span>{page}/{pages}</span>
            <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="admin-btn">Next</button>
          </div>
        </div>
      </div>

      {(selected || detailsLoading) && (
        <div className="admin-drawer-overlay" onClick={() => setSelected(null)}>
          <aside className="admin-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="admin-drawer-head">
              <h3>Alert details</h3>
              <button type="button" onClick={() => setSelected(null)} className="admin-icon-btn"><FiX size={18} /></button>
            </div>
            {detailsLoading || !selected ? (
              <div className="admin-center"><div className="spinner" /></div>
            ) : (
              <div className="admin-page">
                <Detail label="Time" value={formatDate(selected.timestamp)} />
                <Detail label="User" value={`${selected.userId?.name || 'Unknown'} (${selected.userId?.email || 'n/a'})`} />
                <Detail label="Vehicle" value={selected.vehicleId?.plateNumber || 'n/a'} />
                <Detail label="Location" value={formatLocation(selected.location)} />
                <Detail label="Risk score" value={`${selected.riskScore} (${selected.riskLevel})`} />
                <Detail label="Type" value={String(selected.eventType || '').replace(/_/g, ' ')} />
                <Detail label="TTC" value={selected.details?.ttc != null ? `${selected.details.ttc}s` : 'n/a'} />
                <Detail label="Distance" value={selected.details?.distance != null ? `${Math.round(selected.details.distance)}m` : 'n/a'} />
                <Detail label="Recommended action" value={selected.details?.recommendedAction || 'n/a'} />
                <Detail label="Explanation" value={selected.details?.explanation || 'n/a'} />
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="admin-info-box">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}
