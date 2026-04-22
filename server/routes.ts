import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema as dbSchema } from "./db";
import { storage } from "./storage";
import { WebSocketMessageType, WebSocketMessage, insertDeveloperSchema, insertSeismicCalculationSchema } from "@shared/schema";
import { sendSeismicEventNotification, sendLowBatteryAlert as sendUnisenderBatteryAlert } from "./services/unisender";
import { sendSeismicEventAlert, sendLowBatteryAlert as sendTelegramBatteryAlert } from "./services/telegram";
import { syncEarthquakeData, scheduleEarthquakeSyncJob } from "./services/earthquakeApi";
import { syncJMAEarthquakeData, scheduleJMAEarthquakeSyncJob } from "./services/jmaEarthquakeApi";
import { setupAuth, requireRole } from "./auth";
import { encodeMiniSEED, type MseedChannel } from "./lib/miniseed";

// Clients connected via WebSocket
const clients = new Set<WebSocket>();

// Ensure columns added after initial table creation exist in all environments
async function runStartupMigrations() {
  try {
    await db.execute(
      `ALTER TABLE seismic_calculations ADD COLUMN IF NOT EXISTS notes_updated_at timestamp`
    );
    await db.execute(
      `ALTER TABLE seismic_calculations ADD COLUMN IF NOT EXISTS notes_updated_by text`
    );
    await db.execute(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_system_status_pageviews ON system_status (component) WHERE component = 'PageViews'`
    );
    console.log('Startup migrations applied (seismic_calculations columns ensured).');
  } catch (e) {
    console.error('Startup migration error (seismic_calculations columns):', e);
  }
}

// Function to ensure all research networks are initialized
async function initializeResearchNetworks() {
  console.log('Initializing research networks...');
  
  // Initialize JMA network if it doesn't exist
  let jmaNetwork = await storage.getResearchNetworkByNetworkId("JMA");
  if (!jmaNetwork) {
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
    console.log("JMA research network already exists");
  }
}

// Function to send a message to all connected WebSocket clients
function broadcastMessage(message: WebSocketMessage) {
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication with passport.js
  setupAuth(app);
  
  // Apply any missing column migrations before serving requests
  await runStartupMigrations();

  // Initialize research networks before server startup
  await initializeResearchNetworks();
  
  const httpServer = createServer(app);

  // Set up WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    // Add the new client to the set of connected clients
    clients.add(ws);
    
    console.log('WebSocket client connected');
    
    // Send initial station data to the client
    storage.getStations().then(stations => {
      ws.send(JSON.stringify({
        type: WebSocketMessageType.STATION_STATUS,
        payload: stations
      }));
    });
    
    // Send initial system status
    storage.getSystemStatus().then(statusItems => {
      ws.send(JSON.stringify({
        type: WebSocketMessageType.NETWORK_STATUS,
        payload: {
          dataProcessingHealth: statusItems.find(item => item.component === "Data Processing")?.value || 0,
          networkConnectivityHealth: statusItems.find(item => item.component === "Network Connectivity")?.value || 0,
          storageCapacityHealth: statusItems.find(item => item.component === "Storage Capacity")?.value || 0,
          apiPerformanceHealth: statusItems.find(item => item.component === "API Performance")?.value || 0
        }
      }));
    });
    
    // Send recent events
    storage.getRecentEvents(5).then(events => {
      ws.send(JSON.stringify({
        type: WebSocketMessageType.EVENT_NOTIFICATION,
        payload: events
      }));
    });
    
    // Send research networks data
    storage.getResearchNetworks().then(networks => {
      ws.send(JSON.stringify({
        type: WebSocketMessageType.DATA_EXCHANGE,
        payload: networks
      }));
    });
    
    // Handle messages from clients (e.g., filter changes, data requests)
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString()) as WebSocketMessage;
        
        // Process different message types
        switch (message.type) {
          case WebSocketMessageType.STATION_STATUS:
            // Handle station status updates - can be used to update station status in UI
            break;
            
          case WebSocketMessageType.EVENT_NOTIFICATION:
            // Handle event notification requests - can be used to get details about an event
            if (message.payload && message.payload.eventId) {
              const event = await storage.getEventByEventId(message.payload.eventId);
              if (event) {
                ws.send(JSON.stringify({
                  type: WebSocketMessageType.EVENT_NOTIFICATION,
                  payload: event
                }));
              }
            }
            break;
            
          default:
            console.log('Unhandled message type:', message.type);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
        ws.send(JSON.stringify({
          type: WebSocketMessageType.ERROR,
          payload: { message: 'Invalid message format' }
        }));
      }
    });
    
    // Handle disconnection
    ws.on('close', () => {
      clients.delete(ws);
      console.log('WebSocket client disconnected');
    });
    
    // Simulate real-time seismic data
    startSimulation(ws);
  });

  // API routes
  
  // Get all stations
  app.get('/api/stations', async (req, res) => {
    try {
      const stations = await storage.getStations();
      res.json(stations);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching stations' });
    }
  });

  // Get a specific station by ID
  app.get('/api/stations/:stationId', async (req, res) => {
    try {
      const station = await storage.getStationByStationId(req.params.stationId);
      if (!station) {
        return res.status(404).json({ message: 'Station not found' });
      }
      res.json(station);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching station' });
    }
  });

  // Get recent events
  app.get('/api/events/recent', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const events = await storage.getRecentEvents(limit);
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching events' });
    }
  });

  // Get a specific event by ID
  app.get('/api/events/:eventId', async (req, res) => {
    try {
      const event = await storage.getEventByEventId(req.params.eventId);
      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }
      res.json(event);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching event' });
    }
  });

  // Get research networks
  app.get('/api/networks', async (req, res) => {
    try {
      const networks = await storage.getResearchNetworks();
      res.json(networks);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching research networks' });
    }
  });

  // Get system status
  app.get('/api/system/status', async (req, res) => {
    try {
      const status = await storage.getSystemStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching system status' });
    }
  });

  // Get alerts
  app.get('/api/alerts', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const alerts = await storage.getAlerts(limit);
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching alerts' });
    }
  });

  // Mark alert as read
  app.post('/api/alerts/:id/read', async (req, res) => {
    try {
      const alertId = parseInt(req.params.id);
      const alert = await storage.markAlertAsRead(alertId);
      if (!alert) {
        return res.status(404).json({ message: 'Alert not found' });
      }
      res.json(alert);
    } catch (error) {
      res.status(500).json({ message: 'Error updating alert' });
    }
  });

  // Mark all alerts as read
  app.post('/api/alerts/read-all', async (req, res) => {
    try {
      await storage.markAllAlertsAsRead();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Error updating alerts' });
    }
  });
  
  
  // --- Field Operations API Routes ---
  
  // Get all regions
  app.get('/api/regions', async (req, res) => {
    try {
      const regions = await storage.getRegions();
      res.json(regions);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching regions' });
    }
  });
  
  // Get region by ID
  app.get('/api/regions/:id', async (req, res) => {
    try {
      const regionId = parseInt(req.params.id);
      const region = await storage.getRegion(regionId);
      if (!region) {
        return res.status(404).json({ message: 'Region not found' });
      }
      res.json(region);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching region' });
    }
  });
  
  // Get stations in a region
  app.get('/api/regions/:id/stations', async (req, res) => {
    try {
      const regionId = parseInt(req.params.id);
      const stations = await storage.getStationsByRegionId(regionId);
      res.json(stations);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching stations for region' });
    }
  });
  
  // Get all maintenance records for a station
  app.get('/api/stations/:stationId/maintenance', async (req, res) => {
    try {
      const records = await storage.getMaintenanceRecords(req.params.stationId);
      res.json(records);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching maintenance records' });
    }
  });
  
  // Get a specific maintenance record
  app.get('/api/maintenance/:id', async (req, res) => {
    try {
      const recordId = parseInt(req.params.id);
      const record = await storage.getMaintenanceRecord(recordId);
      if (!record) {
        return res.status(404).json({ message: 'Maintenance record not found' });
      }
      res.json(record);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching maintenance record' });
    }
  });
  
  // Create a new maintenance record
  app.post('/api/stations/:stationId/maintenance', async (req, res) => {
    try {
      const stationId = req.params.stationId;
      const station = await storage.getStationByStationId(stationId);
      
      if (!station) {
        return res.status(404).json({ message: 'Station not found' });
      }
      
      const record = {
        ...req.body,
        stationId
      };
      
      const newRecord = await storage.createMaintenanceRecord(record);
      res.status(201).json(newRecord);
    } catch (error) {
      res.status(500).json({ message: 'Error creating maintenance record' });
    }
  });
  
  // Update maintenance record status
  app.patch('/api/maintenance/:id/status', async (req, res) => {
    try {
      const recordId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!status) {
        return res.status(400).json({ message: 'Status is required' });
      }
      
      const updatedRecord = await storage.updateMaintenanceStatus(recordId, status);
      
      if (!updatedRecord) {
        return res.status(404).json({ message: 'Maintenance record not found' });
      }
      
      res.json(updatedRecord);
    } catch (error) {
      res.status(500).json({ message: 'Error updating maintenance status' });
    }
  });
  
  // Get upcoming maintenance records
  app.get('/api/maintenance/upcoming', async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const records = await storage.getUpcomingMaintenanceRecords(days);
      res.json(records);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching upcoming maintenance records' });
    }
  });
  
  // General station update (calibration, communication, location, etc.)
  app.patch('/api/stations/:stationId', requireRole(['administrator', 'user']), async (req, res) => {
    try {
      const stationId = req.params.stationId;
      const updates = req.body;
      const updatedStation = await storage.updateStation(stationId, updates);
      if (!updatedStation) {
        return res.status(404).json({ message: 'Station not found' });
      }
      res.json(updatedStation);
    } catch (error) {
      res.status(500).json({ message: 'Error updating station' });
    }
  });

  // Update station battery info
  app.patch('/api/stations/:stationId/battery', async (req, res) => {
    try {
      const stationId = req.params.stationId;
      const { batteryLevel, batteryVoltage, powerConsumption } = req.body;
      
      if (batteryLevel === undefined || batteryVoltage === undefined || powerConsumption === undefined) {
        return res.status(400).json({ message: 'Battery level, voltage, and power consumption are required' });
      }
      
      const updatedStation = await storage.updateStationBatteryInfo(
        stationId, 
        batteryLevel, 
        batteryVoltage, 
        powerConsumption
      );
      
      if (!updatedStation) {
        return res.status(404).json({ message: 'Station not found' });
      }
      
      res.json(updatedStation);
    } catch (error) {
      res.status(500).json({ message: 'Error updating battery information' });
    }
  });
  
  // Update station storage info
  app.patch('/api/stations/:stationId/storage', async (req, res) => {
    try {
      const stationId = req.params.stationId;
      const { storageRemaining } = req.body;
      
      if (storageRemaining === undefined) {
        return res.status(400).json({ message: 'Storage remaining percentage is required' });
      }
      
      const updatedStation = await storage.updateStationStorageInfo(stationId, storageRemaining);
      
      if (!updatedStation) {
        return res.status(404).json({ message: 'Station not found' });
      }
      
      res.json(updatedStation);
    } catch (error) {
      res.status(500).json({ message: 'Error updating storage information' });
    }
  });
  
  // --- Notification API Routes ---
  
  // Send seismic event notification via Unisender
  app.post('/api/notifications/email/event', async (req, res) => {
    try {
      const { eventId, recipients } = req.body;
      
      if (!process.env.UNISENDER_API_KEY) {
        return res.status(400).json({ message: 'Unisender API key not configured' });
      }
      
      if (!eventId || !recipients || !Array.isArray(recipients)) {
        return res.status(400).json({ message: 'Event ID and recipients array are required' });
      }
      
      const event = await storage.getEventByEventId(eventId);
      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }
      
      const result = await sendSeismicEventNotification(
        process.env.UNISENDER_API_KEY,
        recipients,
        {
          eventId: event.eventId,
          region: event.region,
          location: event.location || 'Unknown',
          magnitude: event.magnitude,
          depth: event.depth,
          timestamp: event.timestamp.getTime()
        }
      );
      
      if (result) {
        res.json({ success: true, message: 'Notification sent successfully' });
      } else {
        res.status(500).json({ success: false, message: 'Failed to send notification' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Error sending email notification' });
    }
  });
  
  // Send seismic event notification via Telegram
  app.post('/api/notifications/telegram/event', async (req, res) => {
    try {
      const { eventId, chatId } = req.body;
      
      if (!process.env.TELEGRAM_BOT_TOKEN) {
        return res.status(400).json({ message: 'Telegram bot token not configured' });
      }
      
      if (!eventId || !chatId) {
        return res.status(400).json({ message: 'Event ID and chat ID are required' });
      }
      
      const event = await storage.getEventByEventId(eventId);
      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }
      
      const result = await sendSeismicEventAlert(
        process.env.TELEGRAM_BOT_TOKEN,
        chatId,
        {
          eventId: event.eventId,
          region: event.region,
          location: event.location || 'Unknown',
          magnitude: event.magnitude,
          depth: event.depth,
          timestamp: event.timestamp.getTime()
        }
      );
      
      if (result) {
        res.json({ success: true, message: 'Telegram notification sent successfully' });
      } else {
        res.status(500).json({ success: false, message: 'Failed to send Telegram notification' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Error sending Telegram notification' });
    }
  });

  // Endpoints for earthquake data from external sources
  
  // Manually trigger USGS earthquake data sync
  app.post('/api/earthquakes/sync', requireRole("administrator"), async (req, res) => {
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
  app.post('/api/earthquakes/sync/jma', requireRole("administrator"), async (req, res) => {
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

  app.get('/api/earthquakes', async (req, res) => {
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

  app.get('/api/infrastructure-objects', async (req, res) => {
    try {
      const objects = await storage.getInfrastructureObjects();
      res.json(objects);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching infrastructure objects' });
    }
  });

  app.get('/api/infrastructure-objects/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const obj = await storage.getInfrastructureObject(id);
      if (!obj) return res.status(404).json({ message: 'Object not found' });
      res.json(obj);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching infrastructure object' });
    }
  });

  app.post('/api/infrastructure-objects', requireRole(['administrator', 'user']), async (req, res) => {
    try {
      const newObj = await storage.createInfrastructureObject(req.body);
      res.status(201).json(newObj);
    } catch (error) {
      res.status(500).json({ message: 'Error creating infrastructure object' });
    }
  });

  app.patch('/api/infrastructure-objects/:id', requireRole(['administrator', 'user']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.updateInfrastructureObject(id, req.body);
      if (!updated) return res.status(404).json({ message: 'Object not found' });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: 'Error updating infrastructure object' });
    }
  });

  app.delete('/api/infrastructure-objects/:id', requireRole(['administrator']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const ok = await storage.deleteInfrastructureObject(id);
      if (!ok) return res.status(404).json({ message: 'Object not found' });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting infrastructure object' });
    }
  });

  // ─── Developers API ───────────────────────────────────────────────────────────

  app.get('/api/developers', async (_req, res) => {
    try {
      const list = await storage.getDevelopers();
      res.json(list);
    } catch (e) {
      console.error('GET /api/developers error:', e);
      res.status(500).json({ message: 'Error fetching developers' });
    }
  });

  app.get('/api/developers/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const dev = await storage.getDeveloper(id);
      if (!dev) return res.status(404).json({ message: 'Developer not found' });
      res.json(dev);
    } catch (e) {
      res.status(500).json({ message: 'Error fetching developer' });
    }
  });

  app.post('/api/developers', requireRole(['administrator', 'user']), async (req, res) => {
    try {
      const parsed = insertDeveloperSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid developer payload', errors: parsed.error.flatten() });
      }
      const created = await storage.createDeveloper(parsed.data);
      res.status(201).json(created);
    } catch (e) {
      console.error('POST /api/developers error:', e);
      res.status(500).json({ message: 'Error creating developer' });
    }
  });

  app.patch('/api/developers/:id', requireRole(['administrator', 'user']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid id' });
      const parsed = insertDeveloperSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid developer payload', errors: parsed.error.flatten() });
      }
      const updated = await storage.updateDeveloper(id, parsed.data);
      if (!updated) return res.status(404).json({ message: 'Developer not found' });
      res.json(updated);
    } catch (e) {
      console.error('PATCH /api/developers error:', e);
      res.status(500).json({ message: 'Error updating developer' });
    }
  });

  app.delete('/api/developers/:id', requireRole(['administrator']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid id' });
      const ok = await storage.deleteDeveloper(id);
      if (!ok) return res.status(404).json({ message: 'Developer not found' });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ message: 'Error deleting developer' });
    }
  });

  // ─── Seismic Calculations API ─────────────────────────────────────────────────

  app.get('/api/calculations', async (req, res) => {
    try {
      const { type, limit } = req.query;
      const rows = await storage.getSeismicCalculations(
        type as string | undefined,
        limit ? parseInt(limit as string) : 50
      );
      res.json(rows);
    } catch (e) {
      console.error('GET /api/calculations failed:', e);
      res.status(500).json({ message: 'Error fetching calculations' });
    }
  });

  app.get('/api/calculations/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const row = await storage.getSeismicCalculation(id);
      if (!row) return res.status(404).json({ message: 'Calculation not found' });
      res.json(row);
    } catch (e) {
      res.status(500).json({ message: 'Error fetching calculation' });
    }
  });

  app.post('/api/calculations', requireRole(['administrator', 'user']), async (req, res) => {
    try {
      const parsed = insertSeismicCalculationSchema.safeParse({
        ...req.body,
        createdBy: (req.user as { id?: number } | undefined)?.id ?? null,
      });
      if (!parsed.success) return res.status(400).json({ message: 'Invalid calculation data', errors: parsed.error.flatten() });
      const row = await storage.createSeismicCalculation(parsed.data);
      res.status(201).json(row);
    } catch (e) {
      res.status(500).json({ message: 'Error saving calculation' });
    }
  });

  app.patch('/api/calculations/:id', requireRole(['administrator', 'user']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid id' });
      const patchSchema = insertSeismicCalculationSchema.pick({ notes: true }).partial();
      const parsed = patchSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: 'Invalid patch data', errors: parsed.error.flatten() });
      const editor = (req.user as { username?: string } | undefined)?.username ?? null;
      const row = await storage.updateSeismicCalculation(id, { ...parsed.data, notesUpdatedBy: editor });
      if (!row) return res.status(404).json({ message: 'Calculation not found' });
      res.json(row);
    } catch (e) {
      console.error('PATCH /api/calculations/:id failed:', e);
      res.status(500).json({ message: 'Error updating calculation' });
    }
  });

  app.get('/api/calculations/:id/note-history', requireRole(['administrator', 'user', 'viewer']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid id' });
      const history = await storage.getCalculationNoteHistory(id);
      res.json(history);
    } catch (e) {
      console.error('GET /api/calculations/:id/note-history failed:', e);
      res.status(500).json({ message: 'Error fetching note history' });
    }
  });

  app.post('/api/calculations/:id/note-history/revert', requireRole(['administrator', 'user']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid id' });
      const { historyId } = req.body as { historyId?: number };
      if (typeof historyId !== 'number') return res.status(400).json({ message: 'historyId required' });
      const history = await storage.getCalculationNoteHistory(id);
      const entry = history.find(h => h.id === historyId);
      if (!entry) return res.status(404).json({ message: 'History entry not found' });
      const editor = (req.user as { username?: string } | undefined)?.username ?? null;
      const row = await storage.updateSeismicCalculation(id, { notes: entry.previousText, notesUpdatedBy: editor });
      if (!row) return res.status(404).json({ message: 'Calculation not found' });
      res.json(row);
    } catch (e) {
      console.error('POST /api/calculations/:id/note-history/revert failed:', e);
      res.status(500).json({ message: 'Error reverting note' });
    }
  });

  app.delete('/api/calculations/:id', requireRole(['administrator']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const ok = await storage.deleteSeismicCalculation(id);
      if (!ok) return res.status(404).json({ message: 'Calculation not found' });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ message: 'Error deleting calculation' });
    }
  });

  // ─── Saved comparison sets API ────────────────────────────────────────────────

  app.get('/api/comparison-sets', async (_req, res) => {
    try {
      const sets = await storage.getComparisonSets();
      res.json(sets);
    } catch (e) {
      console.error('GET /api/comparison-sets failed:', e);
      res.status(500).json({ message: 'Error fetching comparison sets' });
    }
  });

  app.post('/api/comparison-sets', requireRole(['administrator', 'user']), async (req, res) => {
    try {
      const { name, calcType, calcIds } = req.body ?? {};
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ message: 'name is required' });
      }
      if (typeof calcType !== 'string' || !calcType.trim()) {
        return res.status(400).json({ message: 'calcType is required' });
      }
      if (!Array.isArray(calcIds) || calcIds.length < 2 ||
          !calcIds.every((n: unknown) => Number.isInteger(n))) {
        return res.status(400).json({ message: 'calcIds must be an integer array of length >= 2' });
      }
      const set = await storage.createComparisonSet({
        name: name.trim().slice(0, 120),
        calcType,
        calcIds: calcIds as number[],
        createdBy: (req.user as { username?: string } | undefined)?.username ?? null,
      });
      res.status(201).json(set);
    } catch (e) {
      console.error('POST /api/comparison-sets failed:', e);
      res.status(500).json({ message: 'Error creating comparison set' });
    }
  });

  app.delete('/api/comparison-sets/:id', requireRole(['administrator', 'user']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const ok = await storage.deleteComparisonSet(id);
      if (!ok) return res.status(404).json({ message: 'Comparison set not found' });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ message: 'Error deleting comparison set' });
    }
  });

  // ─── Object Categories API ────────────────────────────────────────────────────

  app.get('/api/object-categories', async (_req, res) => {
    try {
      const cats = await storage.getObjectCategories();
      res.json(cats);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching object categories' });
    }
  });

  app.post('/api/object-categories', requireRole(['administrator']), async (req, res) => {
    try {
      const cat = await storage.createObjectCategory(req.body);
      res.status(201).json(cat);
    } catch (error) {
      res.status(500).json({ message: 'Error creating object category' });
    }
  });

  app.patch('/api/object-categories/:id', requireRole(['administrator']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.updateObjectCategory(id, req.body);
      if (!updated) return res.status(404).json({ message: 'Category not found' });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: 'Error updating object category' });
    }
  });

  app.delete('/api/object-categories/:id', requireRole(['administrator']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const ok = await storage.deleteObjectCategory(id);
      if (!ok) return res.status(404).json({ message: 'Category not found' });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting object category' });
    }
  });

  // ─── Soil Profiles API ─────────────────────────────────────────────────────────

  app.get('/api/soil-profiles', async (req, res) => {
    try {
      const objectId = req.query.objectId ? parseInt(req.query.objectId as string) : undefined;
      const profiles = await storage.getSoilProfiles(objectId);
      res.json(profiles);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching soil profiles' });
    }
  });

  app.get('/api/soil-profiles/nearest', async (req, res) => {
    try {
      const lat = parseFloat(req.query.lat as string);
      const lng = parseFloat(req.query.lng as string);
      if (isNaN(lat) || isNaN(lng)) return res.status(400).json({ message: 'lat and lng query params required' });
      const profile = await storage.getSoilProfileNearCoords(lat, lng);
      if (!profile) return res.status(404).json({ message: 'No profile near given coordinates' });
      res.json(profile);
    } catch (error) {
      res.status(500).json({ message: 'Error looking up nearest soil profile' });
    }
  });

  app.get('/api/soil-profiles/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const profile = await storage.getSoilProfile(id);
      if (!profile) return res.status(404).json({ message: 'Profile not found' });
      res.json(profile);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching soil profile' });
    }
  });

  app.get('/api/soil-profiles/:id/layers', async (req, res) => {
    try {
      const profileId = parseInt(req.params.id);
      const layers = await storage.getSoilLayers(profileId);
      res.json(layers);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching soil layers' });
    }
  });

  app.post('/api/soil-profiles', requireRole(['administrator', 'user']), async (req, res) => {
    try {
      const profile = await storage.createSoilProfile(req.body);
      res.status(201).json(profile);
    } catch (error) {
      res.status(500).json({ message: 'Error creating soil profile' });
    }
  });

  app.post('/api/soil-layers', requireRole(['administrator', 'user']), async (req, res) => {
    try {
      const layer = await storage.createSoilLayer(req.body);
      res.status(201).json(layer);
    } catch (error) {
      res.status(500).json({ message: 'Error creating soil layer' });
    }
  });

  app.patch('/api/soil-profiles/:id', requireRole(['administrator', 'user']), async (req, res) => {
    try {
      const updated = await storage.updateSoilProfile(parseInt(req.params.id), req.body);
      if (!updated) return res.status(404).json({ message: 'Profile not found' });
      res.json(updated);
    } catch (error) { res.status(500).json({ message: 'Error updating soil profile' }); }
  });

  app.delete('/api/soil-profiles/:id', requireRole(['administrator', 'user']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const profile = await storage.getSoilProfile(id);
      if (!profile) return res.status(404).json({ message: 'Profile not found' });
      const layers = await storage.getSoilLayers(id);
      for (const layer of layers) await storage.deleteSoilLayer(layer.id);
      const ok = await storage.deleteSoilProfile(id);
      if (!ok) return res.status(500).json({ message: 'Failed to delete profile' });
      res.json({ success: true });
    } catch (error) { res.status(500).json({ message: 'Error deleting soil profile' }); }
  });

  app.patch('/api/soil-layers/:id', requireRole(['administrator', 'user']), async (req, res) => {
    try {
      const updated = await storage.updateSoilLayer(parseInt(req.params.id), req.body);
      if (!updated) return res.status(404).json({ message: 'Layer not found' });
      res.json(updated);
    } catch (error) { res.status(500).json({ message: 'Error updating soil layer' }); }
  });

  app.delete('/api/soil-layers/:id', requireRole(['administrator', 'user']), async (req, res) => {
    try {
      const ok = await storage.deleteSoilLayer(parseInt(req.params.id));
      if (!ok) return res.status(404).json({ message: 'Layer not found' });
      res.json({ success: true });
    } catch (error) { res.status(500).json({ message: 'Error deleting soil layer' }); }
  });

  // ─── Sensor Installations API ──────────────────────────────────────────────────

  app.get('/api/sensor-installations', async (req, res) => {
    try {
      const objectId = req.query.objectId ? parseInt(req.query.objectId as string) : undefined;
      const installations = await storage.getSensorInstallations(objectId);
      res.json(installations);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching sensor installations' });
    }
  });

  app.post('/api/sensor-installations', requireRole(['administrator', 'user']), async (req, res) => {
    try {
      const installation = await storage.createSensorInstallation(req.body);
      res.status(201).json(installation);
    } catch (error) {
      res.status(500).json({ message: 'Error creating sensor installation' });
    }
  });

  app.patch('/api/sensor-installations/:id', requireRole(['administrator', 'user']), async (req, res) => {
    try {
      const updated = await storage.updateSensorInstallation(parseInt(req.params.id), req.body);
      if (!updated) return res.status(404).json({ message: 'Installation not found' });
      res.json(updated);
    } catch (error) { res.status(500).json({ message: 'Error updating sensor installation' }); }
  });

  app.delete('/api/sensor-installations/:id', requireRole(['administrator', 'user']), async (req, res) => {
    try {
      const ok = await storage.deleteSensorInstallation(parseInt(req.params.id));
      if (!ok) return res.status(404).json({ message: 'Installation not found' });
      res.json({ success: true });
    } catch (error) { res.status(500).json({ message: 'Error deleting sensor installation' }); }
  });

  // ─── Building Norms API ────────────────────────────────────────────────────────

  app.get('/api/building-norms', async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const norms = await storage.getBuildingNorms(category);
      res.json(norms);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching building norms' });
    }
  });

  app.get('/api/building-norms/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const norm = await storage.getBuildingNorm(id);
      if (!norm) return res.status(404).json({ message: 'Norm not found' });
      res.json(norm);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching building norm' });
    }
  });

  app.post('/api/building-norms', requireRole('administrator'), async (req, res) => {
    try {
      const norm = await storage.createBuildingNorm(req.body);
      res.status(201).json(norm);
    } catch (error) {
      res.status(500).json({ message: 'Error creating building norm' });
    }
  });

  // ─── Seismogram Records API ────────────────────────────────────────────────────

  app.get('/api/seismograms', async (req, res) => {
    try {
      const stationId = req.query.stationId as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const records = await storage.getSeismogramRecords(stationId, limit);
      res.json(records);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching seismogram records' });
    }
  });

  app.get('/api/seismograms/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const record = await storage.getSeismogramRecord(id);
      if (!record) return res.status(404).json({ message: 'Seismogram not found' });
      res.json(record);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching seismogram' });
    }
  });

  app.post('/api/seismograms', requireRole(['administrator', 'user']), async (req, res) => {
    try {
      const body = { ...req.body };
      if (typeof body.startTime === 'string') body.startTime = new Date(body.startTime);
      if (typeof body.endTime === 'string') body.endTime = new Date(body.endTime);
      const record = await storage.createSeismogramRecord(body);
      res.status(201).json(record);
    } catch (error) {
      console.error('createSeismogramRecord error:', error);
      const payload: { message: string; detail?: string } = { message: 'Error creating seismogram record' };
      if (process.env.NODE_ENV !== 'production') payload.detail = String(error);
      res.status(500).json(payload);
    }
  });

  app.patch('/api/seismograms/:id/use-for-modeling', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const record = await storage.getSeismogramRecord(id);
      if (!record) return res.status(404).json({ message: 'Seismogram not found' });
      const [updated] = await db
        .update(dbSchema.seismogramRecords)
        .set({ usedForModelingCount: (record.usedForModelingCount ?? 0) + 1 })
        .where(eq(dbSchema.seismogramRecords.id, id))
        .returning();
      res.json(updated ?? record);
    } catch (error) {
      res.status(500).json({ message: 'Error updating modeling count' });
    }
  });

  app.patch('/api/seismograms/:id/status', requireRole(['administrator', 'user']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      const updated = await storage.updateSeismogramProcessingStatus(id, status);
      if (!updated) return res.status(404).json({ message: 'Seismogram not found' });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: 'Error updating seismogram status' });
    }
  });

  // ─── miniSEED export ──────────────────────────────────────────────────────

  app.get('/api/seismograms/:id/mseed', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ message: 'Invalid id' });
      const rec = await storage.getSeismogramRecord(id);
      if (!rec) return res.status(404).json({ message: 'Seismogram not found' });

      const sampleRate = rec.sampleRate ?? 100;
      const durationSec = rec.durationSec ?? Math.max(1, Math.round(((rec.endTime as Date).getTime() - (rec.startTime as Date).getTime()) / 1000));
      const totalSamples = Math.max(1, Math.round(durationSec * sampleRate));

      // Convert to Int32 counts. If we have stored arrays use them, otherwise
      // synthesize a damped sine consistent with PGA + dominant frequency.
      const pga = rec.peakGroundAcceleration ?? 0.005; // g
      const freq = rec.dominantFrequency ?? 2;          // Hz
      const seed = id * 1337;
      const SCALE = 1_000_000;

      const stored: Record<string, number[] | null> = {
        Z: (rec.dataZ as number[] | null) ?? null,
        NS: (rec.dataNS as number[] | null) ?? null,
        EW: (rec.dataEW as number[] | null) ?? null,
      };

      function synth(amp: number, salt: number): Int32Array {
        const arr = new Int32Array(totalSamples);
        let s = seed + salt;
        const rng = () => {
          s = (s * 9301 + 49297) % 233280;
          return s / 233280;
        };
        const dt = 1 / sampleRate;
        for (let i = 0; i < totalSamples; i++) {
          const t = i * dt;
          const decay = Math.exp(-0.05 * t);
          const v = amp * decay * Math.sin(2 * Math.PI * freq * t) + amp * 0.15 * (rng() - 0.5);
          arr[i] = Math.round(v * SCALE);
        }
        return arr;
      }

      function toInt32(arr: number[] | null, fallbackAmp: number, salt: number): Int32Array {
        if (arr && arr.length > 0) {
          const out = new Int32Array(arr.length);
          for (let i = 0; i < arr.length; i++) out[i] = Math.round(arr[i] * SCALE) | 0;
          return out;
        }
        return synth(fallbackAmp, salt);
      }

      const channels: MseedChannel[] = [
        { code: 'BHZ', amp: pga,        salt: 0, raw: stored.Z },
        { code: 'BHN', amp: pga * 0.82, salt: 1, raw: stored.NS },
        { code: 'BHE', amp: pga * 0.71, salt: 2, raw: stored.EW },
      ].map(c => ({
        network: 'IR',
        station: (rec.stationId ?? 'IRK01').toString(),
        location: '00',
        channel: c.code,
        sampleRate,
        startTime: rec.startTime as Date,
        samples: toInt32(c.raw, c.amp, c.salt),
      }));

      const buf = encodeMiniSEED(channels);
      const filename = `${rec.recordId ?? `seismogram_${id}`}.mseed`.replace(/[^A-Za-z0-9._-]/g, '_');
      res.setHeader('Content-Type', 'application/vnd.fdsn.mseed');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', String(buf.length));
      res.end(buf);
    } catch (error) {
      console.error('mseed export error:', error);
      res.status(500).json({ message: 'Error generating miniSEED' });
    }
  });

  // ─── Calibration sessions ─────────────────────────────────────────────────

  app.get('/api/calibration-sessions', async (req, res) => {
    try {
      let installationId: number | undefined;
      if (req.query.installationId !== undefined) {
        installationId = parseInt(req.query.installationId as string);
        if (isNaN(installationId) || installationId <= 0) return res.status(400).json({ message: 'installationId must be a positive integer' });
      }
      const sessions = await storage.getCalibrationSessions(installationId);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching calibration sessions' });
    }
  });

  app.get('/api/calibration-sessions/:id', async (req, res) => {
    try {
      const session = await storage.getCalibrationSession(parseInt(req.params.id));
      if (!session) return res.status(404).json({ message: 'Session not found' });
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching calibration session' });
    }
  });

  const calibrationSessionSchema = z.object({
    installationId: z.number().int().positive(),
    sessionDate:    z.coerce.date().transform(d => d.toISOString()),
    operator:       z.string().min(1).max(200),
    sensitivityZ:   z.number().finite().optional(),
    sensitivityNS:  z.number().finite().optional(),
    sensitivityEW:  z.number().finite().optional(),
    dampingRatio:   z.number().finite().min(0).max(100).optional(),
    naturalFrequency: z.number().finite().positive().optional(),
    status:         z.enum(['complete', 'pending']).default('complete'),
    notes:          z.string().max(1000).optional()
  });

  app.post('/api/calibration-sessions', requireRole(['administrator', 'user']), async (req, res) => {
    const parsed = calibrationSessionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Invalid session data', errors: parsed.error.flatten() });
    try {
      const session = await storage.createCalibrationSession(parsed.data);
      res.status(201).json(session);
    } catch (error) {
      res.status(500).json({ message: 'Error creating calibration session' });
    }
  });

  app.patch('/api/calibration-sessions/:id', requireRole(['administrator', 'user']), async (req, res) => {
    const parsed = calibrationSessionSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Invalid session data', errors: parsed.error.flatten() });
    try {
      const updated = await storage.updateCalibrationSession(parseInt(req.params.id), parsed.data);
      if (!updated) return res.status(404).json({ message: 'Session not found' });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: 'Error updating calibration session' });
    }
  });

  app.delete('/api/calibration-sessions/:id', requireRole(['administrator', 'user']), async (req, res) => {
    try {
      const ok = await storage.deleteCalibrationSession(parseInt(req.params.id));
      if (!ok) return res.status(404).json({ message: 'Session not found' });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting calibration session' });
    }
  });

  // ─── AFC data ─────────────────────────────────────────────────────────────

  app.get('/api/calibration-afc', async (req, res) => {
    try {
      const sessionId = parseInt(req.query.sessionId as string);
      if (isNaN(sessionId) || sessionId <= 0) return res.status(400).json({ message: 'sessionId must be a positive integer' });
      const points = await storage.getCalibrationAfc(sessionId);
      res.json(points);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching AFC data' });
    }
  });

  const afcPointSchema = z.object({
    frequency: z.number().finite().positive({ message: 'frequency must be > 0' }),
    amplitude: z.number().finite(),
    phase:     z.number().finite().optional()
  });

  const afcPayloadSchema = z.object({
    sessionId: z.number().int().positive(),
    points:    z.array(afcPointSchema).min(1).max(500)
  });

  app.put('/api/calibration-afc', requireRole(['administrator', 'user']), async (req, res) => {
    const parsed = afcPayloadSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Invalid AFC data', errors: parsed.error.flatten() });
    try {
      const { sessionId, points } = parsed.data;
      const session = await storage.getCalibrationSession(sessionId);
      if (!session) return res.status(404).json({ message: `Calibration session ${sessionId} not found` });
      const result = await storage.replaceCalibrationAfc(sessionId, points.map(p => ({ ...p, sessionId })));
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: 'Error saving AFC data' });
    }
  });

  app.delete('/api/calibration-afc/:id', requireRole(['administrator', 'user']), async (req, res) => {
    try {
      const ok = await storage.deleteCalibrationAfcPoint(parseInt(req.params.id));
      if (!ok) return res.status(404).json({ message: 'AFC point not found' });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting AFC point' });
    }
  });

  // Schedule regular earthquake data synchronization (every 30 minutes)
  const usgsEarthquakeJob = scheduleEarthquakeSyncJob(30);
  
  // Schedule JMA earthquake data synchronization (every 30 minutes)
  const jmaEarthquakeJob = scheduleJMAEarthquakeSyncJob(30);

  // --- Page Views API ---

  app.get('/api/page-views', async (req, res) => {
    try {
      const rows = await storage.getSystemStatus();
      const row = rows.find(r => r.component === 'PageViews');
      res.json({ views: row ? Math.round(row.value ?? 0) : 0 });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching page views' });
    }
  });

  app.post('/api/page-views', async (req, res) => {
    try {
      const result = await db.execute(sql`
        INSERT INTO system_status (component, status, value, timestamp, message)
        VALUES ('PageViews', 'ok', 1, NOW(), 'Home page view counter')
        ON CONFLICT (component) WHERE component = 'PageViews'
        DO UPDATE SET value = system_status.value + 1, timestamp = NOW()
        RETURNING value
      `);
      const views = Math.round((result.rows[0] as { value: number })?.value ?? 1);
      res.json({ views });
    } catch (error) {
      res.status(500).json({ message: 'Error updating page views' });
    }
  });

  return httpServer;
}

// Simulate real-time data for the frontend
function startSimulation(ws: WebSocket) {
  // Variables to track simulation state
  let simulationIntervalId: NodeJS.Timeout;
  
  // Generate random seismic waveform data for a station
  const generateWaveformData = (stationId: string) => {
    const now = Date.now();
    const dataPoints = [];
    
    // Create 60 data points (1 per second for the last minute)
    for (let i = 0; i < 60; i++) {
      const timestamp = now - (59 - i) * 1000; // Timestamps going back 1 minute
      
      // Use sine wave with some noise for realistic seismic data
      const baseValue = Math.sin(i / 5) * 0.5;
      const noise = (Math.random() - 0.5) * 0.3;
      const value = baseValue + noise;
      
      dataPoints.push({ timestamp, value });
    }
    
    return {
      stationId,
      timestamp: now,
      dataPoints,
      dataType: "combined"
    };
  };
  
  // Start the simulation interval
  simulationIntervalId = setInterval(() => {
    if (ws.readyState !== WebSocket.OPEN) {
      clearInterval(simulationIntervalId);
      return;
    }
    
    // Send waveform data for different stations
    const stationIds = ["PNWST-03", "SOCAL-12", "ALASKA-07"];
    stationIds.forEach(stationId => {
      const waveformData = generateWaveformData(stationId);
      ws.send(JSON.stringify({
        type: WebSocketMessageType.WAVEFORM_DATA,
        payload: waveformData
      }));
    });
    
    // Occasionally send a new seismic event (rare)
    if (Math.random() < 0.05) { // 5% chance each interval
      storage.getRecentEvents(1).then(events => {
        if (events.length > 0) {
          ws.send(JSON.stringify({
            type: WebSocketMessageType.EVENT_NOTIFICATION,
            payload: events[0]
          }));
        }
      });
    }
    
    // Update network status occasionally
    if (Math.random() < 0.1) { // 10% chance each interval
      storage.getSystemStatus().then(statusItems => {
        ws.send(JSON.stringify({
          type: WebSocketMessageType.NETWORK_STATUS,
          payload: {
            activeStations: Math.floor(90 * Math.random() + 80), // Between 80-90
            totalStations: 94,
            dataProcessingHealth: statusItems.find(item => item.component === "Data Processing")?.value || 0,
            networkConnectivityHealth: statusItems.find(item => item.component === "Network Connectivity")?.value || 0,
            storageCapacityHealth: statusItems.find(item => item.component === "Storage Capacity")?.value || 0,
            apiPerformanceHealth: statusItems.find(item => item.component === "API Performance")?.value || 0
          }
        }));
      });
    }
    
    // Update research network sync status occasionally
    if (Math.random() < 0.2) { // 20% chance each interval
      storage.getResearchNetworks().then(networks => {
        const randomNetwork = networks[Math.floor(Math.random() * networks.length)];
        if (randomNetwork) {
          // Small increase in synced data volume
          const newVolume = (randomNetwork.syncedDataVolume ?? 0) + (Math.random() * 0.5);
          storage.updateResearchNetworkStatus(
            randomNetwork.networkId, 
            randomNetwork.connectionStatus,
            newVolume
          ).then(updatedNetwork => {
            if (updatedNetwork) {
              ws.send(JSON.stringify({
                type: WebSocketMessageType.DATA_EXCHANGE,
                payload: {
                  networkId: updatedNetwork.networkId,
                  dataTransferred: updatedNetwork.syncedDataVolume,
                  connectionStatus: updatedNetwork.connectionStatus,
                  lastSync: updatedNetwork.lastSyncTimestamp?.getTime()
                }
              }));
            }
          });
        }
      });
    }
    
    // Simulate field station battery and storage changes
    if (Math.random() < 0.1) { // 10% chance each interval
      // Choose a random station
      const stationIds = ["PNWST-03", "SOCAL-12", "ALASKA-07", "FIJI-01"];
      const randomStationId = stationIds[Math.floor(Math.random() * stationIds.length)];
      
      storage.getStationByStationId(randomStationId).then(station => {
        if (station) {
          // Simulate some battery drain (0-1% decrease)
          const batteryDrain = Math.random();
          
          // If this is the Alaska station, deplete more rapidly
          const modifier = randomStationId === "ALASKA-07" ? 2 : 1;
          const newBatteryLevel = Math.max(0, (station.batteryLevel || 100) - (batteryDrain * modifier));
          
          // Battery voltage changes with level
          const newVoltage = Math.max(
            10, 
            (station.batteryVoltage || 12) - (batteryDrain * 0.05 * modifier)
          );
          
          // Power consumption varies slightly
          const newPowerConsumption = 
            (station.powerConsumption || 3) + ((Math.random() - 0.5) * 0.2);
          
          // Storage decreases as data is collected
          const storageDecrease = Math.random() * 0.3; // 0-0.3% decrease
          const newStorageRemaining = Math.max(
            0, 
            (station.storageRemaining || 100) - storageDecrease
          );
          
          // First update battery info
          storage.updateStationBatteryInfo(
            randomStationId,
            newBatteryLevel,
            newVoltage,
            newPowerConsumption
          ).then(() => {
            // Then update storage info
            storage.updateStationStorageInfo(randomStationId, newStorageRemaining);
          });
          
          // Generate alerts for low battery (only for Alaska to demonstrate alerts)
          if (randomStationId === "ALASKA-07" && newBatteryLevel < 40 && Math.random() < 0.3) {
            const alert = {
              alertType: "low_battery",
              severity: "warning",
              message: `Low battery on ${randomStationId} station (${newBatteryLevel.toFixed(0)}%)`,
              timestamp: new Date(),
              relatedEntityId: randomStationId,
              relatedEntityType: "station",
              isRead: false
            };
            
            storage.createAlert(alert).then(async newAlert => {
              // Send alert via WebSocket
              ws.send(JSON.stringify({
                type: WebSocketMessageType.ALERT,
                payload: newAlert
              }));
              
              // Send alert via Unisender and Telegram if API keys are available
              if (process.env.UNISENDER_API_KEY) {
                // For demo purposes, we're estimating remaining runtime based on battery level
                // In a real system, this would be calculated based on actual power consumption
                const estimatedRuntime = newBatteryLevel * 0.5; // 0.5 hours per 1% battery level
                
                await sendUnisenderBatteryAlert(
                  process.env.UNISENDER_API_KEY,
                  ['field_team@example.com', 'operations@example.com'],
                  {
                    stationId: randomStationId,
                    stationName: station.name,
                    batteryLevel: newBatteryLevel,
                    batteryVoltage: newVoltage,
                    estimatedRuntime: estimatedRuntime
                  }
                );
              }
              
              if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
                // For demo purposes, we're estimating remaining runtime based on battery level
                const estimatedRuntime = newBatteryLevel * 0.5; // 0.5 hours per 1% battery level
                
                await sendTelegramBatteryAlert(
                  process.env.TELEGRAM_BOT_TOKEN,
                  process.env.TELEGRAM_CHAT_ID,
                  {
                    stationId: randomStationId,
                    stationName: station.name,
                    batteryLevel: newBatteryLevel,
                    batteryVoltage: newVoltage,
                    estimatedRuntime: estimatedRuntime
                  }
                );
              }
            });
          }
        }
      });
    }
  }, 2000); // Update every 2 seconds
  
  // Clean up when disconnected
  ws.on('close', () => {
    clearInterval(simulationIntervalId);
  });
}
