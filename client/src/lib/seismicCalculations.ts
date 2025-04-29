/**
 * Format time difference to show human-readable elapsed time
 */
export function formatTimeDiff(dateTime: Date | string | number): string {
  const time = typeof dateTime === 'string' || typeof dateTime === 'number' 
    ? new Date(dateTime) 
    : dateTime;
  
  const now = new Date();
  const diffMs = now.getTime() - time.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  if (diffDay > 0) {
    return `${diffDay}d ago`;
  } else if (diffHour > 0) {
    return diffHour === 1 ? `1h ago` : `${diffHour}h ${diffMin % 60}m ago`;
  } else if (diffMin > 0) {
    return `${diffMin}m ago`;
  } else {
    return `${diffSec}s ago`;
  }
}

/**
 * Format latitude and longitude into human-readable format
 */
export function formatCoordinates(lat: number, lon: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  
  return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lon).toFixed(4)}° ${lonDir}`;
}

/**
 * Convert event magnitude to CSS color class
 */
export function getMagnitudeColor(magnitude: number): string {
  if (magnitude >= 5.0) return 'bg-status-danger text-white';
  if (magnitude >= 3.0) return 'bg-status-warning text-white';
  return 'bg-status-info text-white';
}

/**
 * Convert station status to CSS color class
 */
export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'online':
      return 'bg-status-success bg-opacity-10 text-status-success';
    case 'degraded':
      return 'bg-status-warning bg-opacity-10 text-status-warning';
    case 'offline':
      return 'bg-status-danger bg-opacity-10 text-status-danger';
    case 'high activity':
      return 'bg-status-warning bg-opacity-10 text-status-warning';
    default:
      return 'bg-slate-DEFAULT bg-opacity-10 text-slate-DEFAULT';
  }
}

/**
 * Convert event magnitude to severity string
 */
export function getEventSeverity(magnitude: number): string {
  if (magnitude >= 5.0) return 'major';
  if (magnitude >= 3.0) return 'moderate';
  return 'minor';
}

/**
 * Convert number to formatted megabytes or gigabytes
 */
export function formatDataSize(size: number): string {
  if (size >= 1024) {
    return `${(size / 1024).toFixed(1)} GB`;
  } else {
    return `${size.toFixed(1)} MB`;
  }
}

/**
 * Calculate visible event count for dashboard
 */
export function calculateEventCounts(events: Array<{ magnitude: number, eventTime: string | Date }>) {
  const now = new Date();
  const last24Hours = now.getTime() - (24 * 60 * 60 * 1000);
  
  const counts = {
    total24h: 0,
    minor: 0,
    moderate: 0,
    major: 0
  };
  
  events.forEach(event => {
    const eventTime = new Date(event.eventTime).getTime();
    if (eventTime >= last24Hours) {
      counts.total24h++;
      
      if (event.magnitude >= 5.0) {
        counts.major++;
      } else if (event.magnitude >= 3.0) {
        counts.moderate++;
      } else {
        counts.minor++;
      }
    }
  });
  
  return counts;
}

/**
 * Get alert status based on recent events
 */
export function getAlertStatus(events: Array<{ magnitude: number, eventTime: string | Date }>): 
  { status: 'normal' | 'elevated' | 'high' | 'severe', className: string } {
  const counts = calculateEventCounts(events);
  
  if (counts.major > 0) {
    return { status: 'severe', className: 'text-status-danger' };
  } else if (counts.moderate > 2) {
    return { status: 'high', className: 'text-status-warning' };
  } else if (counts.moderate > 0 || counts.total24h > 10) {
    return { status: 'elevated', className: 'text-status-warning' };
  } else {
    return { status: 'normal', className: 'text-status-success' };
  }
}

/**
 * Calculate timestamp for seismic wave travel time visualization
 */
export function calculateWaveTimes(distanceKm: number): { pWaveTime: number, sWaveTime: number } {
  // P-waves travel at ~6.1 km/s, S-waves at ~3.4 km/s (approximate values)
  const pWaveSpeed = 6.1;  // km/s
  const sWaveSpeed = 3.4;  // km/s
  
  const pWaveTime = (distanceKm / pWaveSpeed);  // seconds
  const sWaveTime = (distanceKm / sWaveSpeed);  // seconds
  
  return { pWaveTime, sWaveTime };
}
