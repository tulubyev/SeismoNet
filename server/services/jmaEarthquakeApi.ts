import axios from 'axios';
import { storage } from '../storage';
import { InsertEvent } from '@shared/schema';

// Japan Meteorological Agency (JMA) API URLs
const JMA_API_BASE_URL = 'https://www.jma.go.jp/bosai/quake/data';
const JMA_EVENT_LIST_URL = `${JMA_API_BASE_URL}/list.json`;

// For details of a specific event
const getJMAEventDetailsUrl = (eventId: string) => 
  `${JMA_API_BASE_URL}/detail/${eventId}.json`;

interface JMAEarthquakeEvent {
  anid: string;     // Event ID
  at: string;       // Time string in JST
  en: {
    int: string;    // Intensity (Japanese scale)
    mag: number;    // Magnitude
  };
  cod: string;      // Code
  eid: string;      // Event ID
  rtt: string;      // Report type
  ser: string;      // Serial
  ttl: string;      // Title in Japanese
}

interface JMAEarthquakeDetails {
  earthquake: {
    hypocenters: [{
      areaji: string;     // Region name in Japanese
      depth: number;      // Depth in km
      latitude: number;   // Latitude
      longitude: number;  // Longitude
      magnitude: number;  // Magnitude
    }];
    originTime: string;   // Origin time in JST format
  };
  intensity: {
    maxInt: string;       // Maximum intensity on Japanese scale
  };
}

/**
 * Fetches recent earthquake data from JMA API
 * @returns Promise that resolves to the API response
 */
async function fetchJMAEarthquakes(): Promise<JMAEarthquakeEvent[]> {
  try {
    console.log(`Fetching earthquake data from JMA: ${JMA_EVENT_LIST_URL}`);
    const response = await axios.get<JMAEarthquakeEvent[]>(JMA_EVENT_LIST_URL);
    return response.data;
  } catch (error) {
    console.error('Error fetching JMA earthquake data:', error);
    throw error;
  }
}

/**
 * Fetches detailed information for a specific earthquake event
 * @param eventId JMA event ID
 * @returns Promise that resolves to the detailed event information
 */
async function fetchJMAEarthquakeDetails(eventId: string): Promise<JMAEarthquakeDetails> {
  try {
    const detailUrl = getJMAEventDetailsUrl(eventId);
    console.log(`Fetching earthquake details from JMA: ${detailUrl}`);
    const response = await axios.get<JMAEarthquakeDetails>(detailUrl);
    return response.data;
  } catch (error) {
    console.error(`Error fetching JMA earthquake details for event ${eventId}:`, error);
    throw error;
  }
}

/**
 * Converts JMA intensity scale to approximate Mercalli scale
 * This is an approximation as the scales don't directly correlate
 */
function convertJMAIntensityToMercalli(jmaIntensity: string): string {
  // JMA scale: 0, 1, 2, 3, 4, 5-, 5+, 6-, 6+, 7
  // Mercalli scale: I to XII
  
  switch (jmaIntensity) {
    case '0': return 'I'; // Not felt
    case '1': return 'II'; // Slightly felt
    case '2': return 'III'; // Weak
    case '3': return 'IV'; // Light
    case '4': return 'V'; // Moderate
    case '5-': return 'VI'; // Strong
    case '5+': return 'VII'; // Very strong
    case '6-': return 'VIII'; // Severe
    case '6+': return 'IX'; // Violent
    case '7': return 'X'; // Extreme
    default: return 'Unknown';
  }
}

/**
 * Converts JMA earthquake data to our application's Event format
 */
async function convertJMAEventToEvent(event: JMAEarthquakeEvent): Promise<InsertEvent | null> {
  try {
    // Fetch detailed information for this event
    const details = await fetchJMAEarthquakeDetails(event.eid);
    
    if (!details.earthquake || !details.earthquake.hypocenters || details.earthquake.hypocenters.length === 0) {
      console.warn(`Missing hypocenter data for JMA event ${event.eid}`);
      return null;
    }
    
    const hypocenter = details.earthquake.hypocenters[0];
    
    // Generate a unique event ID
    const eventId = `JMA-${event.eid}`;
    
    // Parse date from JMA format (YYYY/MM/DD HH:MM:SS in JST)
    // Need to convert from JST (UTC+9) to UTC
    const timestamp = new Date(details.earthquake.originTime);
    
    return {
      eventId,
      type: 'earthquake',
      status: 'verified', // JMA data is usually verified
      location: hypocenter.areaji || 'Japan', // Region in Japanese
      region: 'Japan',
      latitude: hypocenter.latitude.toString(),
      longitude: hypocenter.longitude.toString(),
      depth: hypocenter.depth,
      magnitude: hypocenter.magnitude || event.en.mag,
      timestamp,
      calculationConfidence: 0.95, // JMA data is generally high quality
      data: {
        source: 'JMA',
        title: event.ttl,
        intensity: {
          jma: details.intensity?.maxInt || event.en.int,
          mercalli: convertJMAIntensityToMercalli(details.intensity?.maxInt || event.en.int)
        },
        reportType: event.rtt,
        serial: event.ser,
        code: event.cod
      }
    };
  } catch (error) {
    console.error(`Error converting JMA event ${event.eid}:`, error);
    return null;
  }
}

/**
 * Fetches earthquake data from JMA and saves to database
 * Returns the number of new events added
 */
export async function syncJMAEarthquakeData(): Promise<number> {
  try {
    const events = await fetchJMAEarthquakes();
    console.log(`Fetched ${events.length} earthquakes from JMA`);
    
    let newEventCount = 0;
    
    // Get only the most recent 20 events since JMA can return many small earthquakes
    const recentEvents = events.slice(0, 20);
    
    // Process each earthquake and add to database if it doesn't exist
    for (const jmaEvent of recentEvents) {
      const eventId = `JMA-${jmaEvent.eid}`;
      
      // Check if this event is already in our database
      const existingEvent = await storage.getEventByEventId(eventId);
      
      if (!existingEvent) {
        // Convert to our data format and save
        const event = await convertJMAEventToEvent(jmaEvent);
        
        if (event) {
          await storage.createEvent(event);
          newEventCount++;
          
          console.log(`Added new earthquake from JMA: ${event.region}, Magnitude ${event.magnitude}`);
        }
      }
    }
    
    console.log(`Added ${newEventCount} new earthquakes from JMA to database`);
    return newEventCount;
  } catch (error) {
    console.error('Error syncing JMA earthquake data:', error);
    throw error;
  }
}

/**
 * Schedule regular synchronization of JMA earthquake data
 * This function sets up a timer to fetch earthquake data periodically
 */
export function scheduleJMAEarthquakeSyncJob(intervalMinutes = 30): NodeJS.Timeout {
  console.log(`Scheduling JMA earthquake data sync every ${intervalMinutes} minutes`);
  
  // Run immediately on startup
  syncJMAEarthquakeData().catch(err => {
    console.error('Initial JMA earthquake sync failed:', err);
  });
  
  // Then schedule regular updates
  return setInterval(() => {
    syncJMAEarthquakeData().catch(err => {
      console.error('Scheduled JMA earthquake sync failed:', err);
    });
  }, intervalMinutes * 60 * 1000);
}