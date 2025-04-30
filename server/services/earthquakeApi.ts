import axios from 'axios';
import { storage } from '../storage';
import { InsertEvent } from '@shared/schema';

// USGS Earthquake API URLs
const USGS_API_BASE_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary';
const USGS_PAST_DAY_SIGNIFICANT = `${USGS_API_BASE_URL}/significant_day.geojson`;
const USGS_PAST_DAY_ALL = `${USGS_API_BASE_URL}/all_day.geojson`;
const USGS_PAST_DAY_M45 = `${USGS_API_BASE_URL}/4.5_day.geojson`;
const USGS_PAST_DAY_M25 = `${USGS_API_BASE_URL}/2.5_day.geojson`;
const USGS_PAST_DAY_M10 = `${USGS_API_BASE_URL}/1.0_day.geojson`;

// Same feeds but for past 7 days
const USGS_PAST_WEEK_SIGNIFICANT = `${USGS_API_BASE_URL}/significant_week.geojson`;
const USGS_PAST_WEEK_M45 = `${USGS_API_BASE_URL}/4.5_week.geojson`;
const USGS_PAST_WEEK_M25 = `${USGS_API_BASE_URL}/2.5_week.geojson`;

// Same feeds but for past 30 days
const USGS_PAST_MONTH_SIGNIFICANT = `${USGS_API_BASE_URL}/significant_month.geojson`;
const USGS_PAST_MONTH_M45 = `${USGS_API_BASE_URL}/4.5_month.geojson`;
const USGS_PAST_MONTH_M25 = `${USGS_API_BASE_URL}/2.5_month.geojson`;

// EMSC API (European-Mediterranean Seismological Centre)
const EMSC_API_URL = 'https://www.seismicportal.eu/fdsnws/event/1/query';

interface USGSEarthquakeFeature {
  type: string;
  properties: {
    mag: number;
    place: string;
    time: number;
    updated: number;
    url: string;
    detail: string;
    felt: number | null;
    cdi: number | null;
    mmi: number | null;
    alert: string | null;
    status: string;
    tsunami: number;
    sig: number;
    net: string;
    code: string;
    ids: string;
    sources: string;
    types: string;
    nst: number | null;
    dmin: number | null;
    rms: number;
    gap: number | null;
    magType: string;
    type: string;
    title: string;
  };
  geometry: {
    type: string;
    coordinates: [number, number, number]; // longitude, latitude, depth (km)
  };
  id: string;
}

interface USGSEarthquakeResponse {
  type: string;
  metadata: {
    generated: number;
    url: string;
    title: string;
    status: number;
    api: string;
    count: number;
  };
  features: USGSEarthquakeFeature[];
}

/**
 * Fetches recent earthquake data from USGS API
 * @param magnitude Minimum magnitude to filter by (1.0, 2.5, 4.5, or "significant")
 * @param period Time period to fetch data for ("day", "week", or "month")
 * @returns Promise that resolves to the API response
 */
async function fetchUSGSEarthquakes(
  magnitude: 1.0 | 2.5 | 4.5 | 'significant' = 4.5,
  period: 'day' | 'week' | 'month' = 'day'
): Promise<USGSEarthquakeResponse> {
  let url: string;

  // Select appropriate URL based on magnitude and period
  if (magnitude === 'significant') {
    if (period === 'day') url = USGS_PAST_DAY_SIGNIFICANT;
    else if (period === 'week') url = USGS_PAST_WEEK_SIGNIFICANT;
    else url = USGS_PAST_MONTH_SIGNIFICANT;
  } else if (magnitude === 4.5) {
    if (period === 'day') url = USGS_PAST_DAY_M45;
    else if (period === 'week') url = USGS_PAST_WEEK_M45;
    else url = USGS_PAST_MONTH_M45;
  } else if (magnitude === 2.5) {
    if (period === 'day') url = USGS_PAST_DAY_M25;
    else if (period === 'week') url = USGS_PAST_WEEK_M25;
    else url = USGS_PAST_MONTH_M25;
  } else {
    // Only day has 1.0 magnitude feed
    url = USGS_PAST_DAY_M10;
  }

  try {
    console.log(`Fetching earthquake data from ${url}`);
    const response = await axios.get<USGSEarthquakeResponse>(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching USGS earthquake data:', error);
    throw error;
  }
}

/**
 * Converts a USGS earthquake feature to our application's Event format
 */
function convertUSGSFeatureToEvent(feature: USGSEarthquakeFeature): InsertEvent {
  // Extract location name or use coordinates if no place is specified
  const location = feature.properties.place || 
    `${feature.geometry.coordinates[1]}, ${feature.geometry.coordinates[0]}`;
    
  // Get region from location string (typically "XX km XX of [Location]")
  // Extract just the main location name if possible
  const locationParts = location.split(' of ');
  const region = locationParts.length > 1 ? locationParts[1] : location;

  // Generate a unique event ID based on the USGS ID
  const eventId = `USGS-${feature.id}`;
  
  return {
    eventId,
    type: 'earthquake',
    status: 'detected',
    location,
    region,
    latitude: feature.geometry.coordinates[1].toString(), // Note: USGS uses [longitude, latitude, depth]
    longitude: feature.geometry.coordinates[0].toString(),
    depth: feature.geometry.coordinates[2],
    magnitude: feature.properties.mag,
    timestamp: new Date(feature.properties.time),
    calculationConfidence: 0.95, // USGS data is generally high quality
    data: {
      source: 'USGS',
      url: feature.properties.url,
      tsunami: feature.properties.tsunami === 1,
      felt: feature.properties.felt,
      significance: feature.properties.sig,
      magType: feature.properties.magType,
      title: feature.properties.title,
      alertLevel: feature.properties.alert,
      updated: new Date(feature.properties.updated).toISOString()
    }
  };
}

/**
 * Fetches earthquake data from USGS and saves to database
 * Returns the number of new events added
 */
export async function syncEarthquakeData(
  magnitude: 1.0 | 2.5 | 4.5 | 'significant' = 4.5,
  period: 'day' | 'week' | 'month' = 'day'
): Promise<number> {
  try {
    const data = await fetchUSGSEarthquakes(magnitude, period);
    console.log(`Fetched ${data.features.length} earthquakes from USGS`);
    
    let newEventCount = 0;
    
    // Process each earthquake and add to database if it doesn't exist
    for (const feature of data.features) {
      const eventId = `USGS-${feature.id}`;
      
      // Check if this event is already in our database
      const existingEvent = await storage.getEventByEventId(eventId);
      
      if (!existingEvent) {
        // Convert to our data format and save
        const event = convertUSGSFeatureToEvent(feature);
        await storage.createEvent(event);
        newEventCount++;
        
        console.log(`Added new earthquake: ${event.region}, Magnitude ${event.magnitude}`);
      }
    }
    
    console.log(`Added ${newEventCount} new earthquakes to database`);
    return newEventCount;
  } catch (error) {
    console.error('Error syncing earthquake data:', error);
    throw error;
  }
}

/**
 * Schedule regular synchronization of earthquake data
 * This function sets up a timer to fetch earthquake data periodically
 */
export function scheduleEarthquakeSyncJob(intervalMinutes = 30): NodeJS.Timeout {
  console.log(`Scheduling earthquake data sync every ${intervalMinutes} minutes`);
  
  // Run immediately on startup
  syncEarthquakeData(4.5, 'week').catch(err => {
    console.error('Initial earthquake sync failed:', err);
  });
  
  // Then schedule regular updates
  return setInterval(() => {
    syncEarthquakeData(4.5, 'day').catch(err => {
      console.error('Scheduled earthquake sync failed:', err);
    });
  }, intervalMinutes * 60 * 1000);
}