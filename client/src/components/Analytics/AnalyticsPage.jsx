import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyticsAPI } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { formatDate, formatDuration, getRiskBadgeClass, getScoreGrade } from '../../utils/helpers';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from 'recharts';
import {
  FiTrendingUp,
  FiTrendingDown,
  FiMinus,
  FiAward,
  FiAlertTriangle,
  FiMapPin,
  FiArrowUpRight,
  FiArrowDownRight,
  FiActivity,
  FiClock,
  FiShield,
  FiCpu,
  FiZap,
  FiNavigation,
  FiChevronRight,
  FiBarChart2,
  FiPlay,
  FiCheckCircle,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import './AnalyticsPage.css';

const SCORE_COLORS = ['#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa'];
const RADIAN = Math.PI / 180;

const INCIDENT_CONFIG = [
  { key: 'hard_brake', label: 'Hard Brake', color: '#fb7185', eventTypes: ['hard_brake'] },
  { key: 'sharp_turn', label: 'Sharp Turn', color: '#fbbf24', eventTypes: ['sharp_turn'] },
  { key: 'overspeed', label: 'Overspeed', color: '#f97316', eventTypes: ['overspeed'] },
  {
    key: 'near_miss',
    label: 'Near Miss',
    color: '#22d3ee',
    eventTypes: ['near_miss', 'collision_risk', 'proximity_warning'],
  },
];

const ALERT_META_BY_TYPE = {
  overspeed: {
    title: 'Overspeed Alert',
    message: 'Speed limit exceeded. Ease off throttle in this zone.',
  },
  hard_brake: {
    title: 'Sudden Brake Alert',
    message: 'Frequent hard braking detected. Brake earlier for smoother control.',
  },
  sharp_turn: {
    title: 'Sharp Turn Alert',
    message: 'High steering load detected. Slow down before corners.',
  },
  near_miss: {
    title: 'Close Distance Alert',
    message: 'Near miss detected. Increase following distance immediately.',
  },
  collision_risk: {
    title: 'Critical Distance Alert',
    message: 'High collision probability. Increase gap and reduce speed now.',
  },
  proximity_warning: {
    title: 'Proximity Warning',
    message: 'Vehicle is too close. Maintain safer following distance.',
  },
  default: {
    title: 'Driving Alert',
    message: 'Risky behavior detected. Drive carefully.',
  },
};

function clampChange(value) {
  return Math.max(-100, Math.min(100, Number.isFinite(value) ? value : 0));
}

function isFiniteNumber(value) {
  return Number.isFinite(Number(value));
}

function toPercentChange(current, previous) {
  if (!isFiniteNumber(current) || !isFiniteNumber(previous)) return null;

  const now = Number(current);
  const prev = Number(previous);

  if (prev === 0) return null;
  return clampChange(((now - prev) / Math.abs(prev)) * 100);
}

function formatChange(value) {
  if (!Number.isFinite(value)) return '--';
  const rounded = Math.round(value);
  if (rounded > 0) return `+${rounded}%`;
  return `${rounded}%`;
}

function getDirection(value) {
  if (!Number.isFinite(value)) return 'flat';
  if (value > 0.4) return 'up';
  if (value < -0.4) return 'down';
  return 'flat';
}

function titleCase(text) {
  return String(text || 'stable')
    .replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getAlertIcon(type) {
  if (type === 'overspeed') return <FiTrendingUp />;
  if (type === 'hard_brake') return <FiAlertTriangle />;
  if (type === 'sharp_turn') return <FiActivity />;
  if (type === 'near_miss' || type === 'collision_risk' || type === 'proximity_warning' || type === 'close_distance') {
    return <FiNavigation />;
  }
  return <FiAlertTriangle />;
}

function mapRiskEventToAlert(event) {
  const meta = ALERT_META_BY_TYPE[event.eventType] || ALERT_META_BY_TYPE.default;
  const isCritical = event.riskLevel === 'high' || event.eventType === 'collision_risk';

  return {
    id: `risk-${event._id}`,
    type: event.eventType,
    title: meta.title,
    message: event.details?.recommendedAction || event.details?.explanation || meta.message,
    severity: isCritical ? 'critical' : 'warning',
    time: event.timestamp ? new Date(event.timestamp) : new Date(),
  };
}

function mapBehaviorAlertToAlert(alert) {
  const meta = ALERT_META_BY_TYPE[alert.type] || ALERT_META_BY_TYPE.default;

  return {
    id: `behavior-${alert.type}-${Date.now()}`,
    type: alert.type,
    title: meta.title,
    message: alert.message || meta.message,
    severity: alert.type === 'overspeed' || alert.type === 'near_miss' ? 'critical' : 'warning',
    time: new Date(),
  };
}

function BreakdownTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="analytics-tooltip">
      <p>{label}</p>
      <strong>{Math.round(payload[0].value)} / 100</strong>
    </div>
  );
}

function IncidentTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const point = payload[0].payload;
  return (
    <div className="analytics-tooltip">
      <p>{point.label}</p>
      <strong>{point.value} events</strong>
    </div>
  );
}

function renderIncidentLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, value }) {
  if (!value || percent <= 0) return null;

  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#dbeafe"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize={12}
      fontWeight={700}
    >
      {`${Math.round(percent * 100)}%`}
    </text>
  );
}

function EmptyState({ icon, title, message, actionLabel, onAction, compact = false }) {
  return (
    <div className={`analytics-empty-panel ${compact ? 'compact' : ''}`}>
      <span className="analytics-empty-icon">{icon}</span>
      <h4>{title}</h4>
      <p>{message}</p>
      {actionLabel && onAction && (
        <button type="button" className="analytics-action-btn" onClick={onAction}>
          <FiPlay /> {actionLabel}
        </button>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const { behaviorAlert, riskData, vehicleNearbyAlert } = useSocket();

  const [dashboard, setDashboard] = useState(null);
  const [riskEvents, setRiskEvents] = useState([]);
  const [recentTrips, setRecentTrips] = useState([]);
  const [recentDays, setRecentDays] = useState([]);
  const [liveAlerts, setLiveAlerts] = useState([]);
  const [activeIncidentKey, setActiveIncidentKey] = useState('hard_brake');
  const [expandedTripId, setExpandedTripId] = useState(null);
  const [loading, setLoading] = useState(true);

  const realtimeSignatureRef = useRef('');
  const handleStartTrip = useCallback(() => navigate('/'), [navigate]);

  const pushAlert = useCallback((alertItem) => {
    if (!alertItem) return;

    setLiveAlerts((previous) => {
      const deduped = previous.filter((item) => item.id !== alertItem.id);
      return [alertItem, ...deduped].slice(0, 8);
    });
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      const [dashData, eventsData] = await Promise.all([
        analyticsAPI.getDashboard(),
        analyticsAPI.getRiskEvents({ limit: 20 }),
      ]);

      const dashboardData = dashData.dashboard || null;
      const events = eventsData.events || [];

      setDashboard(dashboardData);
      setRiskEvents(events);
      setLiveAlerts(events.slice(0, 4).map(mapRiskEventToAlert));

      const [tripsData, scoreData] = await Promise.allSettled([
        analyticsAPI.getTrips({ limit: 6, status: 'completed' }),
        analyticsAPI.getDriverScore(),
      ]);

      if (tripsData.status === 'fulfilled') {
        setRecentTrips(tripsData.value.trips || []);
      } else {
        setRecentTrips([]);
      }

      if (scoreData.status === 'fulfilled') {
        setRecentDays(scoreData.value.analytics?.recentDays || []);
      } else {
        setRecentDays([]);
      }
    } catch (err) {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!behaviorAlert) return;
    pushAlert(mapBehaviorAlertToAlert(behaviorAlert));
  }, [behaviorAlert, pushAlert]);

  useEffect(() => {
    if (vehicleNearbyAlert) {
      const distanceValue = Number(vehicleNearbyAlert.distance);
      const hasDistanceValue = Number.isFinite(distanceValue);
      const signature = [
        'nearby',
        vehicleNearbyAlert.vehicle?.vehicleId || '',
        hasDistanceValue ? Math.round(distanceValue) : 'na',
        vehicleNearbyAlert.message || '',
      ].join(':');

      if (realtimeSignatureRef.current === signature) return;
      realtimeSignatureRef.current = signature;

      pushAlert({
        id: `distance-${Date.now()}`,
        type: 'close_distance',
        title: 'Close Distance Alert',
        message: hasDistanceValue
          ? `Vehicle within ${Math.max(1, Math.round(distanceValue))} m. Increase gap now.`
          : 'Vehicle too close. Maintain safer distance immediately.',
        severity: hasDistanceValue && distanceValue <= 5 ? 'critical' : 'warning',
        time: new Date(),
      });
      return;
    }

    if (!riskData || riskData.riskLevel === 'low') return;

    const signature = [
      'risk',
      riskData.timestamp || '',
      riskData.riskLevel || '',
      Math.round(Number(riskData.finalRisk || 0)),
    ].join(':');

    if (realtimeSignatureRef.current === signature) return;
    realtimeSignatureRef.current = signature;

    pushAlert({
      id: `realtime-risk-${riskData.timestamp || Date.now()}`,
      type: 'close_distance',
      title: riskData.riskLevel === 'high' ? 'Critical Proximity Alert' : 'Proximity Warning',
      message:
        riskData.actionLabel
        || riskData.action
        || 'Maintain a safer following distance from nearby vehicles.',
      severity: riskData.riskLevel === 'high' ? 'critical' : 'warning',
      time: new Date(riskData.timestamp || Date.now()),
    });
  }, [pushAlert, riskData, vehicleNearbyAlert]);

  const scoreValue = isFiniteNumber(dashboard?.driverScore) ? Number(dashboard.driverScore) : null;
  const grade = scoreValue === null ? { grade: 'N/A', color: '#94a3b8' } : getScoreGrade(scoreValue);
  const lifetimeStats = dashboard?.lifetimeStats || {};
  const totalTripsValue = isFiniteNumber(lifetimeStats.totalTrips) ? Number(lifetimeStats.totalTrips) : null;
  const totalRiskEventsValue = isFiniteNumber(lifetimeStats.totalRiskEvents) ? Number(lifetimeStats.totalRiskEvents) : null;
  const totalDistanceKmValue = isFiniteNumber(lifetimeStats.totalDistanceKm) ? Number(lifetimeStats.totalDistanceKm) : null;
  const totalDurationMinutesValue = isFiniteNumber(lifetimeStats.totalDurationMinutes)
    ? Number(lifetimeStats.totalDurationMinutes)
    : null;
  const totalHardBrakesValue = isFiniteNumber(lifetimeStats.totalHardBrakes) ? Number(lifetimeStats.totalHardBrakes) : null;
  const totalSharpTurnsValue = isFiniteNumber(lifetimeStats.totalSharpTurns) ? Number(lifetimeStats.totalSharpTurns) : null;
  const totalOverspeedsValue = isFiniteNumber(lifetimeStats.totalOverspeeds) ? Number(lifetimeStats.totalOverspeeds) : null;
  const totalNearMissesValue = isFiniteNumber(lifetimeStats.totalNearMisses) ? Number(lifetimeStats.totalNearMisses) : null;

  const componentData = useMemo(() => {
    const components = dashboard?.scoreComponents;
    if (!components) return [];

    return [
      { name: 'Braking', value: components.brakingScore },
      { name: 'Speed', value: components.speedScore },
      { name: 'Turning', value: components.turningScore },
      { name: 'Proximity', value: components.proximityScore },
      { name: 'Consistency', value: components.consistencyScore },
    ]
      .filter((item) => isFiniteNumber(item.value))
      .map((item) => ({ ...item, value: Number(item.value) }));
  }, [dashboard?.scoreComponents]);
  const hasScoreData = componentData.length > 0;
  const hasOverallScore = Number.isFinite(scoreValue);

  const incidentData = useMemo(() => {
    const values = {
      hard_brake: totalHardBrakesValue,
      sharp_turn: totalSharpTurnsValue,
      overspeed: totalOverspeedsValue,
      near_miss: totalNearMissesValue,
    };

    return INCIDENT_CONFIG.map((item) => ({
      ...item,
      value: values[item.key] ?? 0,
      hasValue: values[item.key] !== null,
    }));
  }, [totalHardBrakesValue, totalNearMissesValue, totalOverspeedsValue, totalSharpTurnsValue]);

  const incidentTotal = useMemo(
    () => incidentData.reduce((sum, item) => sum + Number(item.value || 0), 0),
    [incidentData]
  );
  const hasIncidentData = incidentData.some((item) => item.hasValue) && incidentTotal > 0;

  useEffect(() => {
    if (!incidentData.length) return;

    const hasCurrent = incidentData.some((item) => item.key === activeIncidentKey);
    if (hasCurrent) return;

    const topIncident = [...incidentData].sort((a, b) => b.value - a.value)[0];
    setActiveIncidentKey(topIncident.key);
  }, [activeIncidentKey, incidentData]);

  const activeIncident = useMemo(
    () => incidentData.find((item) => item.key === activeIncidentKey) || incidentData[0],
    [activeIncidentKey, incidentData]
  );

  const selectedIncidentEvents = useMemo(() => {
    if (!activeIncident) return [];

    return riskEvents
      .filter((event) => activeIncident.eventTypes.includes(event.eventType))
      .slice(0, 8);
  }, [activeIncident, riskEvents]);

  const scoreChange = useMemo(() => {
    if (recentDays.length < 2) return null;

    const current = recentDays[recentDays.length - 1]?.safetyScore;
    const previous = recentDays[recentDays.length - 2]?.safetyScore;
    return toPercentChange(current, previous);
  }, [recentDays]);

  const tripsChange = useMemo(() => {
    if (recentDays.length < 2) return null;
    const current = recentDays[recentDays.length - 1]?.tripsCount;
    const previous = recentDays[recentDays.length - 2]?.tripsCount;
    return toPercentChange(current, previous);
  }, [recentDays]);

  const riskEventsDailyChange = useMemo(() => {
    if (recentDays.length < 2) return null;
    const current = recentDays[recentDays.length - 1]?.riskEventsCount;
    const previous = recentDays[recentDays.length - 2]?.riskEventsCount;
    return toPercentChange(current, previous);
  }, [recentDays]);

  const riskImprovementChange = Number.isFinite(riskEventsDailyChange)
    ? clampChange(-riskEventsDailyChange)
    : null;

  const trendDelta = useMemo(() => {
    if (!Number.isFinite(scoreChange)) return null;
    if (dashboard?.trend === 'declining') return -Math.abs(scoreChange || 0);
    if (dashboard?.trend === 'improving') return Math.abs(scoreChange || 0);
    return 0;
  }, [dashboard?.trend, scoreChange]);

  const averageSpeed = useMemo(() => {
    if (Number.isFinite(totalDistanceKmValue) && Number.isFinite(totalDurationMinutesValue)) {
      const totalDurationHours = totalDurationMinutesValue / 60;
      if (totalDurationHours > 0) return totalDistanceKmValue / totalDurationHours;
    }

    const samples = recentTrips.map((trip) => trip.stats?.avgSpeedKmh)
      .filter((value) => isFiniteNumber(value))
      .map(Number)
      .filter((value) => value > 0);

    if (!samples.length) return null;
    return samples.reduce((sum, value) => sum + value, 0) / samples.length;
  }, [recentTrips, totalDistanceKmValue, totalDurationMinutesValue]);

  const maximumSpeed = useMemo(() => {
    const samples = recentTrips
      .map((trip) => trip.stats?.maxSpeedKmh)
      .filter((value) => isFiniteNumber(value))
      .map(Number)
      .filter((value) => value > 0);

    if (!samples.length) return null;
    return Math.max(...samples);
  }, [recentTrips]);

  const safetyStars = scoreValue === null ? 0 : Math.max(1, Math.min(5, Math.round(scoreValue / 20)));

  const safetyStatus = useMemo(() => {
    if (riskData?.riskLevel === 'high' || (scoreValue !== null && scoreValue < 60)) {
      return {
        label: 'Dangerous',
        tone: 'danger',
        dot: '\uD83D\uDD34',
        description: 'Critical risk detected. Reduce speed and increase spacing.',
      };
    }

    if (riskData?.riskLevel === 'medium' || (scoreValue !== null && scoreValue < 78)) {
      return {
        label: 'Medium',
        tone: 'medium',
        dot: '\uD83D\uDFE1',
        description: 'Moderate risk pattern. Drive with extra caution.',
      };
    }

    return {
      label: 'Safe',
      tone: 'safe',
      dot: '\uD83D\uDFE2',
      description: 'Driving behavior is stable and controlled.',
    };
  }, [riskData?.riskLevel, scoreValue]);

  const insights = useMemo(() => {
    const totalTrips = totalTripsValue || 0;
    const hardBrakes = totalHardBrakesValue || 0;
    const overspeeds = totalOverspeedsValue || 0;
    const nearMisses = totalNearMissesValue || 0;

    const items = [];
    if (totalTrips === 0 && recentTrips.length === 0 && riskEvents.length === 0) {
      return ['Drive more to get insights'];
    }

    if (totalTrips > 0 && hardBrakes / totalTrips > 2) {
      items.push('You are braking too often. Start decelerating earlier near traffic and signals.');
    }

    if (nearMisses > 0) {
      items.push('Maintain safe distance to improve score and reduce near-miss risk.');
    }

    if (overspeeds > Math.max(3, totalTrips)) {
      items.push('Overspeed alerts are frequent. Hold a steadier speed in urban zones.');
    }

    if (scoreChange > 0) {
      items.push(`Great progress: safety score improved by ${Math.abs(Math.round(scoreChange))}% recently.`);
    }

    if (!items.length && totalTrips === 0) {
      items.push('Drive more to get insights');
    }

    if (!items.length) {
      items.push('No strong risk pattern yet. Keep driving consistently to unlock deeper insights.');
    }

    return items.slice(0, 3);
  }, [recentTrips.length, riskEvents.length, scoreChange, totalHardBrakesValue, totalNearMissesValue, totalOverspeedsValue, totalTripsValue]);
  const hasInsightData = (totalTripsValue || 0) > 0 || recentTrips.length > 0 || riskEvents.length > 0;

  const summaryCards = [
    {
      key: 'score',
      label: 'Safety Score',
      value: scoreValue === null ? '--' : `${Math.round(scoreValue)}`,
      subValue: grade.grade,
      icon: <FiAward />,
      accent: 'blue',
      change: scoreChange,
    },
    {
      key: 'trend',
      label: 'Trend',
      value: dashboard?.trend ? titleCase(dashboard.trend) : '--',
      subValue: 'Last 24h',
      icon: dashboard?.trend === 'declining' ? <FiTrendingDown /> : dashboard?.trend === 'improving' ? <FiTrendingUp /> : <FiMinus />,
      accent: dashboard?.trend === 'declining' ? 'red' : dashboard?.trend === 'improving' ? 'green' : 'blue',
      change: trendDelta,
    },
    {
      key: 'trips',
      label: 'Total Trips',
      value: totalTripsValue === null ? '--' : `${totalTripsValue}`,
      subValue: 'Completed',
      icon: <FiMapPin />,
      accent: 'purple',
      change: tripsChange,
    },
    {
      key: 'risks',
      label: 'Risk Events',
      value: totalRiskEventsValue === null ? '--' : `${totalRiskEventsValue}`,
      subValue: 'Lower is better',
      icon: <FiAlertTriangle />,
      accent: 'orange',
      change: riskImprovementChange,
    },
  ];

  if (loading) {
    return (
      <div className="analytics-page mobile-page-padding mobile-main">
        <div className="analytics-loading-grid">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="analytics-skeleton-card" />
          ))}
        </div>
        <div className="analytics-loading-block" />
        <div className="analytics-loading-block" />
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="analytics-page mobile-page-padding mobile-main analytics-empty-wrap">
        <EmptyState
          icon={<FiBarChart2 />}
          title="No data available yet"
          message="Start a trip to generate driving analytics."
          actionLabel="Start Trip"
          onAction={handleStartTrip}
        />
      </div>
    );
  }

  return (
    <div className="analytics-page mobile-page-padding mobile-main fade-in">
      <div className="analytics-header">
        <div>
          <h2 className="analytics-title">Driving Analytics</h2>
          <p className="analytics-subtitle">Live safety trends, risk behavior, and AI guidance in one view.</p>
        </div>
        <button type="button" className="analytics-refresh-btn" onClick={loadData}>Refresh Data</button>
      </div>

      <div className="analytics-highlight-grid">
        <section className={`card analytics-glass-card analytics-status-card analytics-status-card--${safetyStatus.tone}`}>
          <div className="analytics-status-main">
            <span className="analytics-status-dot">{safetyStatus.dot}</span>
            <div>
              <p className="analytics-status-label">Safety Status</p>
              <h3 className="analytics-status-value">{safetyStatus.label}</h3>
              <p className="analytics-status-note">{safetyStatus.description}</p>
            </div>
          </div>
          <div className="analytics-status-score-wrap">
            <span>Overall</span>
            <strong>{scoreValue === null ? '--' : Math.round(scoreValue)}</strong>
          </div>
        </section>

        <section className="card analytics-glass-card analytics-insight-card">
          <div className="analytics-section-title-wrap">
            <h3 className="analytics-card-title">
              <FiCpu /> Smart Insight Box
            </h3>
            <span className="analytics-chip">AI Suggestions</span>
          </div>

          {hasInsightData ? (
            <div className="analytics-insight-list">
              {insights.map((insight, index) => (
                <div key={`${index}-${insight.slice(0, 12)}`} className="analytics-insight-item">
                  <span className="analytics-insight-icon"><FiZap /></span>
                  <span>{insight}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<FiCpu />}
              title="Drive more to get insights"
              message="Complete a few trips to unlock personalized AI guidance."
              compact
            />
          )}
        </section>
      </div>

      <div className="analytics-summary-grid">
        {summaryCards.map((card) => {
          const direction = getDirection(card.change);
          const TrendIcon = direction === 'up' ? FiArrowUpRight : direction === 'down' ? FiArrowDownRight : FiMinus;

          return (
            <section key={card.key} className="card analytics-glass-card analytics-summary-card">
              <div className={`analytics-summary-icon analytics-summary-icon--${card.accent}`}>
                {card.icon}
              </div>

              <div className="analytics-summary-content">
                <p className="analytics-summary-label">{card.label}</p>
                <h3 className="analytics-summary-value">{card.value}</h3>
                <div className="analytics-summary-footer">
                  <span>{card.subValue}</span>
                  <span className={`analytics-change analytics-change--${direction}`}>
                    {Number.isFinite(card.change) ? (
                      <>
                        <TrendIcon />
                        {formatChange(card.change)}
                      </>
                    ) : (
                      'No change data'
                    )}
                  </span>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <div className="analytics-main-grid">
        <section className="card analytics-glass-card">
          <div className="analytics-section-title-wrap">
            <h3 className="analytics-card-title">Score Breakdown</h3>
            <span className="analytics-chip">Hover bars for exact score</span>
          </div>

          {!hasScoreData && !hasOverallScore ? (
            <EmptyState
              icon={<FiBarChart2 />}
              title="No score data available yet"
              message="Start a trip to generate score breakdown analytics."
              actionLabel="Start Trip"
              onAction={handleStartTrip}
              compact
            />
          ) : (
            <div className="analytics-score-layout">
              <div>
                {hasScoreData ? (
                  <>
                    <div className="analytics-chart-wrap">
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={componentData} margin={{ top: 8, right: 8, left: -16, bottom: 4 }}>
                          <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                          <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                          <Tooltip content={<BreakdownTooltip />} cursor={{ fill: 'rgba(59,130,246,0.14)' }} />
                          <Bar dataKey="value" radius={[8, 8, 0, 0]} animationDuration={850} animationEasing="ease-out">
                            {componentData.map((entry, index) => (
                              <Cell key={`${entry.name}-${index}`} fill={SCORE_COLORS[index % SCORE_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="analytics-score-legend">
                      {componentData.map((entry, index) => (
                        <span key={entry.name} className="analytics-legend-pill">
                          <span className="analytics-legend-dot" style={{ background: SCORE_COLORS[index % SCORE_COLORS.length] }} />
                          {entry.name}
                        </span>
                      ))}
                    </div>
                  </>
                ) : (
                  <EmptyState
                    icon={<FiBarChart2 />}
                    title="No component scores"
                    message="Drive more to unlock braking, speed, and consistency scores."
                    compact
                  />
                )}
              </div>

              <div className="analytics-progress-card">
                <p className="analytics-progress-title">Overall Safety Score</p>
                {hasOverallScore ? (
                  <div className="analytics-progress-wrap">
                    <ResponsiveContainer width="100%" height={220}>
                      <RadialBarChart
                        data={[{ name: 'Safety', value: Math.round(scoreValue) }]}
                        innerRadius="70%"
                        outerRadius="100%"
                        startAngle={90}
                        endAngle={-270}
                      >
                        <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                        <RadialBar
                          dataKey="value"
                          background={{ fill: 'rgba(148, 163, 184, 0.16)' }}
                          cornerRadius={24}
                          fill={grade.color}
                          animationDuration={1000}
                        />
                      </RadialBarChart>
                    </ResponsiveContainer>

                    <div className="analytics-progress-center">
                      <strong>{Math.round(scoreValue)}</strong>
                      <span>{grade.grade}</span>
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    icon={<FiAward />}
                    title="No safety score yet"
                    message="Complete a trip to compute overall safety score."
                    compact
                  />
                )}
              </div>
            </div>
          )}
        </section>

        <section className="card analytics-glass-card">
          <div className="analytics-section-title-wrap">
            <h3 className="analytics-card-title">Incident Distribution</h3>
            <span className="analytics-chip">Click a segment for details</span>
          </div>

          {hasIncidentData ? (
            <div className="analytics-incident-layout">
              <div className="analytics-chart-wrap">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={incidentData}
                      dataKey="value"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={96}
                      paddingAngle={4}
                      labelLine={false}
                      label={renderIncidentLabel}
                      onClick={(entry) => setActiveIncidentKey(entry.key)}
                    >
                      {incidentData.map((entry) => (
                        <Cell
                          key={entry.key}
                          fill={entry.color}
                          stroke={activeIncidentKey === entry.key ? '#f8fafc' : 'transparent'}
                          strokeWidth={activeIncidentKey === entry.key ? 2 : 1}
                          cursor="pointer"
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<IncidentTooltip />} />
                  </PieChart>
                </ResponsiveContainer>

                <div className="analytics-donut-center-text">
                  <strong>{incidentTotal}</strong>
                  <span>Total Events</span>
                </div>
              </div>

              <div className="analytics-incident-legend">
                {incidentData.map((entry) => (
                  <button
                    key={entry.key}
                    type="button"
                    className={`analytics-incident-pill ${activeIncidentKey === entry.key ? 'is-active' : ''}`}
                    onClick={() => setActiveIncidentKey(entry.key)}
                  >
                    <span className="analytics-legend-dot" style={{ background: entry.color }} />
                    <span>{entry.label}</span>
                    <strong>{entry.value}</strong>
                  </button>
                ))}
              </div>

              <div className="analytics-event-list-wrap">
                <h4>{activeIncident?.label} Events</h4>
                {selectedIncidentEvents.length === 0 ? (
                  <p className="analytics-empty-state">
                    No recent {activeIncident?.label.toLowerCase()} events found.
                  </p>
                ) : (
                  <div className="analytics-event-list">
                    {selectedIncidentEvents.map((event) => (
                      <div key={event._id} className="analytics-event-item">
                        <span className={`badge ${getRiskBadgeClass(event.riskLevel)}`}>{event.riskLevel}</span>
                        <span className="analytics-event-type">{titleCase(event.eventType)}</span>
                        <span className="analytics-event-score">
                          {isFiniteNumber(event.riskScore) ? Math.round(Number(event.riskScore)) : '--'}
                        </span>
                        <span className="analytics-event-date">{formatDate(event.timestamp)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <EmptyState
              icon={<FiAlertTriangle />}
              title="No incident data available yet"
              message="No incident distribution yet. Start a trip to collect real event data."
              actionLabel="Start Trip"
              onAction={handleStartTrip}
              compact
            />
          )}
        </section>
      </div>

      <div className="analytics-secondary-grid">
        <section className="card analytics-glass-card">
          <div className="analytics-section-title-wrap">
            <h3 className="analytics-card-title">Recent Trips</h3>
            <span className="analytics-chip">Tap each trip for details</span>
          </div>

          {recentTrips.length === 0 ? (
            <EmptyState
              icon={<FiMapPin />}
              title="No trips yet"
              message="Start a trip to see distance, duration, and safety scores."
              actionLabel="Start Trip"
              onAction={handleStartTrip}
              compact
            />
          ) : (
            <div className="analytics-trip-list">
              {recentTrips.map((trip) => {
                const tripId = trip._id || `${trip.startTime}-${trip.endTime}`;
                const isActive = expandedTripId === tripId;
                const tripDistanceLabel = isFiniteNumber(trip.stats?.distanceKm)
                  ? `${Number(trip.stats.distanceKm).toFixed(1)} km`
                  : '--';
                const tripDurationLabel = isFiniteNumber(trip.stats?.durationMinutes)
                  ? formatDuration(Number(trip.stats.durationMinutes))
                  : '--';
                const tripSafetyLabel = isFiniteNumber(trip.safetyScore)
                  ? `${Math.round(Number(trip.safetyScore))} score`
                  : '--';
                const tripAvgSpeedLabel = isFiniteNumber(trip.stats?.avgSpeedKmh)
                  ? `${Number(trip.stats.avgSpeedKmh).toFixed(1)} km/h`
                  : '--';
                const tripMaxSpeedLabel = isFiniteNumber(trip.stats?.maxSpeedKmh)
                  ? `${Number(trip.stats.maxSpeedKmh).toFixed(1)} km/h`
                  : '--';
                const tripRiskCountLabel = isFiniteNumber(trip.stats?.riskEventsCount)
                  ? Number(trip.stats.riskEventsCount)
                  : '--';

                return (
                  <button
                    type="button"
                    key={tripId}
                    className={`analytics-trip-item ${isActive ? 'is-active' : ''}`}
                    onClick={() => setExpandedTripId((current) => (current === tripId ? null : tripId))}
                  >
                    <div className="analytics-trip-top">
                      <span>{formatDate(trip.startTime)}</span>
                      <FiChevronRight className={isActive ? 'rotated' : ''} />
                    </div>

                    <div className="analytics-trip-metrics">
                      <span><FiMapPin /> {tripDistanceLabel}</span>
                      <span><FiClock /> {tripDurationLabel}</span>
                      <span><FiShield /> {tripSafetyLabel}</span>
                    </div>

                    {isActive && (
                      <div className="analytics-trip-details">
                        <span>Avg Speed: {tripAvgSpeedLabel}</span>
                        <span>Max Speed: {tripMaxSpeedLabel}</span>
                        <span>Risk Events: {tripRiskCountLabel}</span>
                        <span>Status: {titleCase(trip.status)}</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="card analytics-glass-card">
          <div className="analytics-section-title-wrap">
            <h3 className="analytics-card-title">Real-Time Alerts</h3>
            <span className="analytics-chip">Overspeed, brake, and distance warnings</span>
          </div>

          {liveAlerts.length === 0 ? (
            <div className="analytics-safe-alert">
              <span className="analytics-safe-alert-icon"><FiCheckCircle /></span>
              <div>
                <h4>All good! No alerts</h4>
                <p>No overspeed, sudden brake, or close-distance warnings right now.</p>
              </div>
            </div>
          ) : (
            <div className="analytics-alert-list">
              {liveAlerts.map((alert) => (
                <article
                  key={alert.id}
                  className={`analytics-alert-item ${alert.severity === 'critical' ? 'critical' : 'warning'}`}
                >
                  <span className="analytics-alert-icon">{getAlertIcon(alert.type)}</span>

                  <div className="analytics-alert-content">
                    <div className="analytics-alert-row">
                      <h4>{alert.title}</h4>
                      <span>{formatDate(alert.time)}</span>
                    </div>
                    <p>{alert.message}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="card analytics-glass-card analytics-lifetime-card">
        <div className="analytics-section-title-wrap">
          <h3 className="analytics-card-title">Lifetime Statistics</h3>
          <span className="analytics-chip">Long-term driving profile</span>
        </div>

        <div className="analytics-lifetime-grid">
          <div className="analytics-lifetime-item">
            <p>Distance</p>
            <strong>{totalDistanceKmValue === null ? '--' : `${totalDistanceKmValue.toFixed(1)} km`}</strong>
          </div>
          <div className="analytics-lifetime-item">
            <p>Drive Time</p>
            <strong>{totalDurationMinutesValue === null ? '--' : formatDuration(totalDurationMinutesValue)}</strong>
          </div>
          <div className="analytics-lifetime-item">
            <p>Average Speed</p>
            <strong>{Number.isFinite(averageSpeed) ? `${averageSpeed.toFixed(1)} km/h` : '--'}</strong>
          </div>
          <div className="analytics-lifetime-item">
            <p>Maximum Speed</p>
            <strong>{Number.isFinite(maximumSpeed) ? `${maximumSpeed.toFixed(1)} km/h` : '--'}</strong>
          </div>
          <div className="analytics-lifetime-item">
            <p>Hard Brakes</p>
            <strong>{totalHardBrakesValue === null ? '--' : totalHardBrakesValue}</strong>
          </div>
          <div className="analytics-lifetime-item analytics-lifetime-stars-wrap">
            <p>Safety Rating</p>
            <div className="analytics-stars">
              {Array.from({ length: 5 }).map((_, index) => (
                <span key={index} className={`analytics-star ${index < safetyStars ? 'filled' : ''}`}>
                  {'\u2605'}
                </span>
              ))}
            </div>
            <small>{scoreValue === null ? 'N/A' : `${safetyStars}/5`}</small>
          </div>
        </div>
      </section>
    </div>
  );
}



