export function getRiskColor(level) {
  switch (level) {
    case 'high': return '#ef4444';
    case 'medium': return '#eab308';
    case 'low': return '#22c55e';
    default: return '#64748b';
  }
}

export function getRiskBadgeClass(level) {
  switch (level) {
    case 'high': return 'badge-high';
    case 'medium': return 'badge-medium';
    case 'low': return 'badge-low';
    default: return '';
  }
}

export function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

export function formatSpeed(kmh) {
  return `${Math.round(kmh)} km/h`;
}

export function formatDuration(minutes) {
  if (minutes < 60) return `${Math.round(minutes)}min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${m}m`;
}

export function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function getScoreGrade(score) {
  if (score >= 90) return { grade: 'A+', color: '#22c55e' };
  if (score >= 80) return { grade: 'A', color: '#22c55e' };
  if (score >= 70) return { grade: 'B', color: '#eab308' };
  if (score >= 55) return { grade: 'C', color: '#f97316' };
  return { grade: 'D', color: '#ef4444' };
}

const toRad = (deg) => (deg * Math.PI) / 180;
const toDeg = (rad) => (rad * 180) / Math.PI;

export function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function bearingDegrees(lat1, lon1, lat2, lon2) {
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2))
    - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export function getDirectionArrow(direction) {
  switch (direction) {
    case 'front': return '\u2191';
    case 'back': return '\u2193';
    case 'left': return '\u2190';
    case 'right': return '\u2192';
    default: return '\u2022';
  }
}
