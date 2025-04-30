import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { WebSocketMessageType, WebSocketMessage } from "@shared/schema";
import { sendSeismicEventNotification, sendLowBatteryAlert as sendUnisenderBatteryAlert } from "./services/unisender";
import { sendSeismicEventAlert, sendLowBatteryAlert as sendTelegramBatteryAlert } from "./services/telegram";
import { syncEarthquakeData, scheduleEarthquakeSyncJob } from "./services/earthquakeApi";
import { syncJMAEarthquakeData, scheduleJMAEarthquakeSyncJob } from "./services/jmaEarthquakeApi";
import { setupAuth, requireRole } from "./auth";

// Clients connected via WebSocket
const clients = new Set<WebSocket>();

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
  
  // SPECIAL DEBUG ROUTE - REMOVE IN PRODUCTION
  app.get('/api/debug/users', async (req, res) => {
    try {
      // Get all users with passwords visible for debugging
      const users = await storage.getUsers();
      res.json({
        message: "Debug information - ALL USER DATA INCLUDING PASSWORDS",
        users: users.map(user => ({
          id: user.id,
          username: user.username,
          password: user.password,
          email: user.email,
          role: user.role,
          active: user.active
        }))
      });
    } catch (error) {
      console.error("Error in debug route:", error);
      res.status(500).json({ error: "Failed to get debug info" });
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
      let mag: any = magnitude || 4.5;
      let per: 'day' | 'week' | 'month' = period || 'week';
      
      // Validate magnitude
      if (mag !== 'significant' && typeof mag === 'string') {
        mag = parseFloat(mag);
      }
      
      if (mag !== 'significant' && ![1.0, 2.5, 4.5].includes(mag)) {
        mag = 4.5;
      }
      
      // Validate period
      if (!['day', 'week', 'month'].includes(per)) {
        per = 'week';
      }
      
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
      
      const newEventsCount = await syncJMAEarthquakeData();
      
      res.json({ 
        message: `JMA earthquake data sync complete`, 
        newEvents: newEventsCount,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error syncing JMA earthquake data:', error);
      res.status(500).json({ message: 'Error syncing JMA earthquake data' });
    }
  });
  
  // Get all earthquakes (combines local and external data)
  app.get('/api/earthquakes', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const events = await storage.getRecentEvents(limit);
      
      // Filter to only include earthquakes (type = 'earthquake')
      const earthquakes = events.filter(event => event.type === 'earthquake');
      
      res.json(earthquakes);
    } catch (error) {
      console.error('Error fetching earthquakes:', error);
      res.status(500).json({ message: 'Error fetching earthquakes' });
    }
  });

  // Schedule regular earthquake data synchronization (every 30 minutes)
  const usgsEarthquakeJob = scheduleEarthquakeSyncJob(30);
  
  // Schedule JMA earthquake data synchronization (every 30 minutes)
  const jmaEarthquakeJob = scheduleJMAEarthquakeSyncJob(30);

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
          const newVolume = randomNetwork.syncedDataVolume + (Math.random() * 0.5);
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
