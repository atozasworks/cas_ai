import React, { useState, useEffect } from 'react';
import { analyticsAPI } from '../../services/api';
import { getScoreGrade, getRiskBadgeClass, formatDate, formatDistance, formatDuration } from '../../utils/helpers';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FiTrendingUp, FiTrendingDown, FiMinus, FiAward, FiAlertTriangle, FiMapPin } from 'react-icons/fi';
import toast from 'react-hot-toast';

const COLORS = ['#3b82f6', '#22c55e', '#eab308', '#ef4444', '#a855f7'];

export default function AnalyticsPage() {
  const [dashboard, setDashboard] = useState(null);
  const [riskEvents, setRiskEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [dashData, eventsData] = await Promise.all([
        analyticsAPI.getDashboard(),
        analyticsAPI.getRiskEvents({ limit: 10 }),
      ]);
      setDashboard(dashData.dashboard);
      setRiskEvents(eventsData.events || []);
    } catch (err) {
      toast.error('Failed to load analytics');
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div className="spinner" />
        <p style={{ color: 'var(--text-muted)', marginTop: 16 }}>Loading analytics...</p>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div style={styles.loadingContainer}>
        <p style={{ color: 'var(--text-muted)' }}>No data available yet. Start a trip to generate analytics.</p>
      </div>
    );
  }

  const grade = getScoreGrade(dashboard.driverScore || 80);
  const trendIcon = dashboard.trend === 'improving' ? <FiTrendingUp /> :
    dashboard.trend === 'declining' ? <FiTrendingDown /> : <FiMinus />;
  const trendColor = dashboard.trend === 'improving' ? '#22c55e' :
    dashboard.trend === 'declining' ? '#ef4444' : '#eab308';

  const componentData = dashboard.scoreComponents ? [
    { name: 'Braking', value: dashboard.scoreComponents.brakingScore || 80 },
    { name: 'Speed', value: dashboard.scoreComponents.speedScore || 80 },
    { name: 'Turning', value: dashboard.scoreComponents.turningScore || 80 },
    { name: 'Proximity', value: dashboard.scoreComponents.proximityScore || 80 },
    { name: 'Consistency', value: dashboard.scoreComponents.consistencyScore || 80 },
  ] : [];

  const lifetimeStats = dashboard.lifetimeStats || {};

  return (
    <div style={styles.page}>
      <h2 style={styles.pageTitle}>Driving Analytics</h2>

      {/* Top Stats */}
      <div className="grid-4" style={{ marginBottom: 20 }}>
        <div className="card" style={styles.statCard}>
          <div style={styles.statIcon}><FiAward style={{ color: '#3b82f6' }} /></div>
          <div>
            <div style={{ ...styles.statValue, color: grade.color }}>{dashboard.driverScore || 80}</div>
            <div style={styles.statLabel}>Safety Score ({grade.grade})</div>
          </div>
        </div>
        <div className="card" style={styles.statCard}>
          <div style={{ ...styles.statIcon, background: `${trendColor}15` }}>{trendIcon}</div>
          <div>
            <div style={{ ...styles.statValue, color: trendColor }}>
              {(dashboard.trend || 'stable').charAt(0).toUpperCase() + (dashboard.trend || 'stable').slice(1)}
            </div>
            <div style={styles.statLabel}>Trend</div>
          </div>
        </div>
        <div className="card" style={styles.statCard}>
          <div style={{ ...styles.statIcon, background: 'rgba(168,85,247,0.1)' }}>
            <FiMapPin style={{ color: '#a855f7' }} />
          </div>
          <div>
            <div style={styles.statValue}>{lifetimeStats.totalTrips || 0}</div>
            <div style={styles.statLabel}>Total Trips</div>
          </div>
        </div>
        <div className="card" style={styles.statCard}>
          <div style={{ ...styles.statIcon, background: 'rgba(239,68,68,0.1)' }}>
            <FiAlertTriangle style={{ color: '#ef4444' }} />
          </div>
          <div>
            <div style={styles.statValue}>{lifetimeStats.totalRiskEvents || 0}</div>
            <div style={styles.statLabel}>Risk Events</div>
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        {/* Score Components Bar Chart */}
        <div className="card">
          <h3 style={styles.cardTitle}>Score Breakdown</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={componentData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
              <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8 }}
                labelStyle={{ color: 'var(--text-primary)' }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {componentData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="card">
          <h3 style={styles.cardTitle}>Incident Distribution</h3>
          {lifetimeStats && (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Hard Brakes', value: lifetimeStats.totalHardBrakes || 1 },
                    { name: 'Sharp Turns', value: lifetimeStats.totalSharpTurns || 1 },
                    { name: 'Overspeeds', value: lifetimeStats.totalOverspeeds || 1 },
                    { name: 'Near Misses', value: lifetimeStats.totalNearMisses || 0 },
                  ]}
                  cx="50%" cy="50%" outerRadius={80} innerRadius={45}
                  dataKey="value" paddingAngle={3}
                >
                  {COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div style={styles.legend}>
            {['Hard Brakes', 'Sharp Turns', 'Overspeeds', 'Near Misses'].map((l, i) => (
              <span key={l} style={styles.legendItem}>
                <span style={{ ...styles.legendDot, background: COLORS[i] }} /> {l}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Lifetime Stats */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={styles.cardTitle}>Lifetime Statistics</h3>
        <div className="grid-4">
          {[
            { label: 'Distance', value: `${(lifetimeStats.totalDistanceKm || 0).toFixed(1)} km` },
            { label: 'Drive Time', value: formatDuration(lifetimeStats.totalDurationMinutes || 0) },
            { label: 'Hard Brakes', value: lifetimeStats.totalHardBrakes || 0 },
            { label: 'Near Misses', value: lifetimeStats.totalNearMisses || 0 },
          ].map((s) => (
            <div key={s.label} style={styles.miniStat}>
              <div style={styles.miniValue}>{s.value}</div>
              <div style={styles.miniLabel}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Risk Events */}
      <div className="card">
        <h3 style={styles.cardTitle}>Recent Risk Events</h3>
        {riskEvents.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 13, padding: '16px 0' }}>
            No risk events recorded yet.
          </p>
        ) : (
          <div style={styles.eventList}>
            {riskEvents.map((ev) => (
              <div key={ev._id} style={styles.eventItem}>
                <span className={`badge ${getRiskBadgeClass(ev.riskLevel)}`}>{ev.riskLevel}</span>
                <span style={styles.eventType}>{ev.eventType?.replace(/_/g, ' ')}</span>
                <span style={styles.eventScore}>Score: {ev.riskScore}</span>
                <span style={styles.eventDate}>{formatDate(ev.timestamp)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: { padding: 24, maxWidth: 1200, margin: '0 auto' },
  pageTitle: { fontSize: 24, fontWeight: 700, marginBottom: 20, color: 'var(--text-primary)' },
  loadingContainer: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', minHeight: 400,
  },
  statCard: {
    display: 'flex', alignItems: 'center', gap: 14, padding: 16,
  },
  statIcon: {
    width: 44, height: 44, borderRadius: 10,
    background: 'rgba(59,130,246,0.1)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
  },
  statValue: { fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' },
  statLabel: { fontSize: 12, color: 'var(--text-muted)', marginTop: 2 },
  cardTitle: { fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 14 },
  legend: { display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginTop: 8 },
  legendItem: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)' },
  legendDot: { width: 8, height: 8, borderRadius: '50%' },
  miniStat: { textAlign: 'center', padding: '12px 0' },
  miniValue: { fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' },
  miniLabel: { fontSize: 12, color: 'var(--text-muted)', marginTop: 4 },
  eventList: { display: 'flex', flexDirection: 'column', gap: 6 },
  eventItem: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 0', borderBottom: '1px solid var(--border-color)',
    fontSize: 13,
  },
  eventType: { flex: 1, color: 'var(--text-secondary)', textTransform: 'capitalize' },
  eventScore: { color: 'var(--text-muted)', fontWeight: 600 },
  eventDate: { color: 'var(--text-muted)', fontSize: 12 },
};
