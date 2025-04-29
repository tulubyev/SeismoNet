import { Station, Event } from '@shared/schema';

// Constants for seismic wave propagation
const P_WAVE_VELOCITY = 5.5; // km/s
const S_WAVE_VELOCITY = 3.0; // km/s

// Calculate distance between two points using Haversine formula
export function calculateDistance(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number {
  const R = 6371; // Earth radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Calculate arrival time for P and S waves
export function calculateWaveArrivalTime(
  distance: number, 
  depth: number, 
  waveType: 'p' | 's'
): number {
  // Calculate actual distance considering depth
  const actualDistance = Math.sqrt(Math.pow(distance, 2) + Math.pow(depth, 2));
  
  // Calculate travel time based on wave velocity
  const velocity = waveType === 'p' ? P_WAVE_VELOCITY : S_WAVE_VELOCITY;
  
  // Return time in seconds
  return actualDistance / velocity;
}

// Format seconds to mm:ss format
export function formatSecondsToMMSS(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Calculate epicenter from station data and arrival times
export function triangulateEpicenter(
  stations: Station[],
  arrivalTimes: Record<string, { pWave: number, sWave: number }>
): { latitude: number, longitude: number, confidence: number } {
  // This is a simplified implementation
  // A real triangulation would use more complex algorithms
  
  // For this demo, we'll just calculate a weighted average based on arrival times
  let totalLat = 0;
  let totalLon = 0;
  let totalWeight = 0;
  
  stations.forEach(station => {
    const stationId = station.stationId;
    if (arrivalTimes[stationId]) {
      // Calculate weight based on P-wave arrival time (earlier = higher weight)
      const pWaveTime = arrivalTimes[stationId].pWave;
      const weight = 1 / (pWaveTime + 1);  // +1 to avoid division by zero
      
      totalLat += parseFloat(station.latitude.toString()) * weight;
      totalLon += parseFloat(station.longitude.toString()) * weight;
      totalWeight += weight;
    }
  });
  
  // Calculate weighted average
  const estimatedLat = totalWeight > 0 ? totalLat / totalWeight : 0;
  const estimatedLon = totalWeight > 0 ? totalLon / totalWeight : 0;
  
  // Calculate confidence based on number of stations and consistency
  // This is a simplified confidence calculation
  const confidence = Math.min(95, 70 + (stations.length * 5));
  
  return {
    latitude: estimatedLat,
    longitude: estimatedLon,
    confidence
  };
}

// Get contributing stations for an event
export function getContributingStations(
  event: Event,
  stations: Station[]
): Array<{
  stationId: string;
  distance: number;
  pWaveArrival: number;
  sWaveArrival: number;
}> {
  const eventLat = parseFloat(event.latitude.toString());
  const eventLon = parseFloat(event.longitude.toString());
  const eventDepth = event.depth;
  
  return stations
    .map(station => {
      const stationLat = parseFloat(station.latitude.toString());
      const stationLon = parseFloat(station.longitude.toString());
      
      const distance = calculateDistance(eventLat, eventLon, stationLat, stationLon);
      const pWaveArrival = calculateWaveArrivalTime(distance, eventDepth, 'p');
      const sWaveArrival = calculateWaveArrivalTime(distance, eventDepth, 's');
      
      return {
        stationId: station.stationId,
        distance: Math.round(distance),
        pWaveArrival,
        sWaveArrival
      };
    })
    .sort((a, b) => a.distance - b.distance) // Sort by distance
    .slice(0, 18); // Take closest 18 stations
}
