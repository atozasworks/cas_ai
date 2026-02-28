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

export function getDirectionArrow(direction) {
  switch (direction) {
    case 'front': return '\u2191';
    case 'back': return '\u2193';
    case 'left': return '\u2190';
    case 'right': return '\u2192';
    default: return '\u2022';
  }
}
