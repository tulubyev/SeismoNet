import { Station, Event as SeismicEvent, InsertEvent as InsertSeismicEvent } from "@shared/schema";

// Speed of P-waves and S-waves in kilometers per second (approximate values)
const P_WAVE_SPEED = 6.1; // km/s 
const S_WAVE_SPEED = 3.4; // km/s

interface WaveArrival {
  stationId: number;
  stationLatitude: number;
  stationLongitude: number;
  stationDepth: number;
  pWaveTime: number; // timestamp in ms
  sWaveTime: number; // timestamp in ms
}

interface EpicenterCalculation {
  latitude: number;
  longitude: number;
  depth: number;
  magnitude: number;
  confidence: number;
  eventTime: Date;
}

/**
 * Calculates the distance between two geographic coordinates using the Haversine formula
 */
export function calculateDistance(
  lat1: number, lon1: number, 
  lat2: number, lon2: number
): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in km
  
  return distance;
}

/**
 * Calculates the distance between two points in 3D space (including depth)
 */
export function calculate3DDistance(
  lat1: number, lon1: number, depth1: number,
  lat2: number, lon2: number, depth2: number
): number {
  const surfaceDistance = calculateDistance(lat1, lon1, lat2, lon2);
  const depthDifference = Math.abs(depth1 - depth2);
  
  // Use Pythagorean theorem to calculate 3D distance
  return Math.sqrt(Math.pow(surfaceDistance, 2) + Math.pow(depthDifference, 2));
}

/**
 * Estimates the time it takes for a seismic wave to travel a given distance
 */
export function calculateWaveTravelTime(distance: number, waveSpeed: number): number {
  return distance / waveSpeed; // time in seconds
}

/**
 * Estimates earthquake magnitude based on wave amplitude and distance
 */
export function estimateMagnitude(amplitude: number, distance: number): number {
  // This is a simplified formula
  // In reality, magnitude calculation is more complex and depends on multiple factors
  return Math.log10(amplitude) + 1.5 * (Math.log10(distance) - 1);
}

/**
 * Calculates earthquake epicenter using triangulation from multiple stations
 */
export function calculateEpicenter(waveArrivals: WaveArrival[]): EpicenterCalculation | null {
  if (waveArrivals.length < 3) {
    // Need at least 3 stations for triangulation
    return null;
  }
  
  // Calculate origin time and distances for each station based on P-S interval
  const stationData = waveArrivals.map(arrival => {
    const pSInterval = (arrival.sWaveTime - arrival.pWaveTime) / 1000; // in seconds
    
    // Estimate distance based on P-S interval
    // Using the relationship: distance = pSInterval / (1/S_speed - 1/P_speed)
    const inverseVelocityDiff = (1/S_WAVE_SPEED) - (1/P_WAVE_SPEED);
    const distance = pSInterval / inverseVelocityDiff;
    
    // Estimate origin time by subtracting P-wave travel time from P-wave arrival time
    const pTravelTime = distance / P_WAVE_SPEED; // in seconds
    const originTime = new Date(arrival.pWaveTime - (pTravelTime * 1000));
    
    return {
      stationId: arrival.stationId,
      latitude: arrival.stationLatitude,
      longitude: arrival.stationLongitude,
      depth: arrival.stationDepth,
      distance,
      originTime
    };
  });
  
  // Estimate origin time as average of individual estimates
  const sumTime = stationData.reduce((sum, data) => sum + data.originTime.getTime(), 0);
  const avgOriginTime = new Date(sumTime / stationData.length);
  
  // Use least squares method to find the epicenter coordinates
  // Start with a weighted average as initial guess
  let sumLat = 0, sumLon = 0, sumWeights = 0;
  
  stationData.forEach(data => {
    const weight = 1 / (data.distance + 0.001); // Add small constant to avoid division by zero
    sumLat += data.latitude * weight;
    sumLon += data.longitude * weight;
    sumWeights += weight;
  });
  
  let epicenterLat = sumLat / sumWeights;
  let epicenterLon = sumLon / sumWeights;
  
  // Iterative refinement using least squares method
  // (simplified implementation - in real systems this would be more sophisticated)
  const ITERATIONS = 5;
  let depth = 10; // Starting with a default depth of 10km
  
  for (let i = 0; i < ITERATIONS; i++) {
    let sumLatAdjustment = 0;
    let sumLonAdjustment = 0;
    let sumDepthAdjustment = 0;
    let sumAdjustmentWeights = 0;
    
    stationData.forEach(data => {
      const calculatedDistance = calculate3DDistance(
        epicenterLat, epicenterLon, depth,
        data.latitude, data.longitude, data.depth
      );
      
      const error = calculatedDistance - data.distance;
      const weight = 1 / (calculatedDistance + 0.001);
      
      // Calculate direction vector from estimated epicenter to station
      const dLat = data.latitude - epicenterLat;
      const dLon = data.longitude - epicenterLon;
      const dDepth = data.depth - depth;
      
      // Normalize direction vector
      const magnitude = Math.sqrt(dLat*dLat + dLon*dLon + dDepth*dDepth);
      const unitLat = dLat / magnitude;
      const unitLon = dLon / magnitude;
      const unitDepth = dDepth / magnitude;
      
      // Apply adjustment proportional to error and in the direction of the station
      sumLatAdjustment += unitLat * error * weight;
      sumLonAdjustment += unitLon * error * weight;
      sumDepthAdjustment += unitDepth * error * weight;
      sumAdjustmentWeights += weight;
    });
    
    // Apply the weighted adjustments
    epicenterLat += sumLatAdjustment / sumAdjustmentWeights;
    epicenterLon += sumLonAdjustment / sumAdjustmentWeights;
    depth += sumDepthAdjustment / sumAdjustmentWeights;
    
    // Ensure depth is positive
    depth = Math.max(0, depth);
  }
  
  // Calculate average amplitude for magnitude estimation
  // (in real systems, amplitude would be obtained from seismic data)
  const assumedAmplitude = 100; // Placeholder value
  
  // Calculate average distance to estimate magnitude
  const avgDistance = stationData.reduce((sum, data) => sum + data.distance, 0) / stationData.length;
  
  // Estimate magnitude
  const magnitude = estimateMagnitude(assumedAmplitude, avgDistance);
  
  // Calculate confidence based on number of stations and consistency of results
  // This is a simplified approach
  const confidence = Math.min(100, 60 + (waveArrivals.length * 5));
  
  return {
    latitude: epicenterLat,
    longitude: epicenterLon,
    depth,
    magnitude,
    confidence,
    eventTime: avgOriginTime
  };
}

/**
 * Classifies seismic events based on magnitude
 */
export function classifySeismicEvent(magnitude: number): 'minor' | 'moderate' | 'major' {
  if (magnitude < 3.0) return 'minor';
  if (magnitude < 5.0) return 'moderate';
  return 'major';
}

/**
 * Prepares a seismic event object for insertion into the database
 */
export function prepareSeismicEvent(
  calculation: EpicenterCalculation,
  region: string
): InsertSeismicEvent {
  return {
    timestamp: calculation.eventTime,
    magnitude: calculation.magnitude,
    depth: calculation.depth,
    latitude: String(calculation.latitude),
    longitude: String(calculation.longitude),
    region,
    calculationConfidence: calculation.confidence,
    status: 'verified',
    type: 'earthquake',
    eventId: `EQ-${Date.now()}`,
    location: region
  };
}

/**
 * Generates a synthetic waveform data sample for testing
 */
export function generateSyntheticWaveform(
  baseAmplitude: number,
  duration: number,
  sampleRate: number
): number[] {
  const numSamples = Math.floor(duration * sampleRate);
  const waveform: number[] = [];
  
  for (let i = 0; i < numSamples; i++) {
    const time = i / sampleRate;
    
    // Primary wave (P-wave)
    const pWave = baseAmplitude * Math.exp(-0.5 * Math.pow((time - 0.2) / 0.05, 2)) * 
                 Math.sin(2 * Math.PI * 10 * time);
    
    // Secondary wave (S-wave) comes later and typically has larger amplitude
    const sWave = baseAmplitude * 1.5 * Math.exp(-0.5 * Math.pow((time - 0.5) / 0.1, 2)) * 
                 Math.sin(2 * Math.PI * 5 * time);
    
    // Surface waves come later with lower frequency and longer duration
    const surfaceWave = baseAmplitude * 2 * Math.exp(-0.5 * Math.pow((time - 1.0) / 0.3, 2)) * 
                       Math.sin(2 * Math.PI * 2 * time);
    
    // Add some random noise
    const noise = baseAmplitude * 0.1 * (Math.random() * 2 - 1);
    
    // Combine all components
    waveform.push(pWave + sWave + surfaceWave + noise);
  }
  
  return waveform;
}
