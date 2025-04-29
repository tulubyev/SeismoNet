import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { WebSocketMessageType, WebSocketMessage } from "@shared/schema";

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
  }, 2000); // Update every 2 seconds
  
  // Clean up when disconnected
  ws.on('close', () => {
    clearInterval(simulationIntervalId);
  });
}
