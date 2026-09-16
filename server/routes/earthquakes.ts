import { Router } from "express";
import { and } from "drizzle-orm";
import { storage } from "../storage";
import { syncEarthquakeData } from "../services/earthquakeApi";
import { syncJMAEarthquakeData } from "../services/jmaEarthquakeApi";
import { requireRole } from "../auth";

const router = Router();


// Endpoints for earthquake data from external sources

// Manually trigger USGS earthquake data sync
router.post('/api/earthquakes/sync', requireRole("administrator"), async (req, res) => {
  try {
    const { magnitude, period } = req.body;
    let mag: number | 'significant';
    if (magnitude === 'significant') {
      mag = 'significant';
    } else if (typeof magnitude === 'string') {
      const parsed = parseFloat(magnitude);
      mag = [1.0, 2.5, 4.5].includes(parsed) ? parsed : 4.5;
    } else if (typeof magnitude === 'number' && [1.0, 2.5, 4.5].includes(magnitude)) {
      mag = magnitude;
    } else {
      mag = 4.5;
    }
    const per: 'day' | 'week' | 'month' = ['day','week','month'].includes(period) ? period : 'week';
    
    console.log(`Manually triggering USGS earthquake sync with magnitude ${mag} and period ${per}`);
    const newEventsCount = await syncEarthquakeData(mag, per);
    
    res.json({ 
      message: `USGS earthquake data sync complete`, 
      newEvents: newEventsCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error syncing USGS earthquake data:', error);
    res.status(500).json({ message: 'Error syncing USGS earthquake data' });
  }
});

// Manually trigger JMA earthquake data sync
router.post('/api/earthquakes/sync/jma', requireRole("administrator"), async (req, res) => {
  try {
    console.log('Manually triggering JMA earthquake data sync');
    
    // First, ensure the JMA network exists in our system
    let jmaNetwork = await storage.getResearchNetworkByNetworkId("JMA");
    
    if (!jmaNetwork) {
      // Create the JMA network if it doesn't exist
      jmaNetwork = await storage.createResearchNetwork({
        networkId: "JMA",
        name: "Japan Meteorological Agency",
        region: "Japan",
        connectionStatus: "connected",
        lastSyncTimestamp: new Date(),
        syncedDataVolume: 95.7,
        apiEndpoint: "https://www.jma.go.jp/bosai/quake/data/list.json"
      });
      console.log("Created JMA research network:", jmaNetwork);
    } else {
      // Update the existing JMA network
      jmaNetwork = await storage.updateResearchNetworkStatus(
        "JMA", 
        "connected", 
        jmaNetwork.syncedDataVolume ? jmaNetwork.syncedDataVolume + Math.random() * 5 + 2 : 95.7
      );
      console.log("Updated JMA research network:", jmaNetwork);
    }
    
    // Then sync the earthquake data
    const newEventsCount = await syncJMAEarthquakeData();
    
    res.json({ 
      message: `JMA earthquake data sync complete`, 
      newEvents: newEventsCount,
      timestamp: new Date().toISOString(),
      network: jmaNetwork
    });
  } catch (error) {
    console.error('Error syncing JMA earthquake data:', error);
    res.status(500).json({ message: 'Error syncing JMA earthquake data' });
  }
});

// Get all earthquakes (combines local and external data)
// Irkutsk / Baikal region bounds
const IRK_LAT_MIN = 49.0, IRK_LAT_MAX = 56.5;
const IRK_LON_MIN = 98.0, IRK_LON_MAX = 114.0;

router.get('/api/earthquakes', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const region = req.query.region as string | undefined;
    const events = await storage.getRecentEvents(limit);
    let earthquakes = events.filter(event => event.type === 'earthquake');

    // When region=irkutsk filter to Baikal / East Siberia area
    if (region === 'irkutsk') {
      earthquakes = earthquakes.filter(e => {
        const lat = parseFloat(e.latitude.toString());
        const lon = parseFloat(e.longitude.toString());
        return lat >= IRK_LAT_MIN && lat <= IRK_LAT_MAX && lon >= IRK_LON_MIN && lon <= IRK_LON_MAX;
      });
    }

    res.json(earthquakes);
  } catch (error) {
    console.error('Error fetching earthquakes:', error);
    res.status(500).json({ message: 'Error fetching earthquakes' });
  }
});

// ─── Infrastructure Objects API ────────────────────────────────────────────────

export default router;
