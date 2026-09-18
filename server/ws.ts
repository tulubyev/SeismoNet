import type { IncomingMessage, Server } from "http";
import type { Duplex } from "stream";
import { WebSocketServer, WebSocket } from "ws";
import { and } from "drizzle-orm";
import { storage, type ObjectScope } from "./storage";
import { WebSocketMessageType, WebSocketMessage } from "@shared/schema";
import { sendLowBatteryAlert as sendUnisenderBatteryAlert } from "./services/unisender";
import { sendLowBatteryAlert as sendTelegramBatteryAlert } from "./services/telegram";
import { describeError } from "./lib/errors";
import { resolveSessionUser } from "./auth";
import type { User as SelectUser } from "@shared/schema";

// Clients connected via WebSocket
const clients = new Set<WebSocket>();

type WsContext = { user: SelectUser; scope: ObjectScope };

export function broadcastMessage(message: WebSocketMessage) {
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

/** Session cookie → user + object scope, or null (anonymous / stale / store error). */
export async function authorizeUpgrade(req: IncomingMessage): Promise<WsContext | null> {
  try {
    const user = await resolveSessionUser(req);
    if (!user) return null;
    const scope: ObjectScope = user.role === "staff" ? { objectIds: await storage.getUserObjectIds(user.id) } : undefined;
    return { user, scope };
  } catch (err) {
    console.error(`WS upgrade auth failed: ${describeError(err)}`);
    return null;
  }
}

/**
 * Handle one `/ws` upgrade request: authorize it, then either reject with 401
 * or hand it to `wss`. `authorizeUpgrade` does a DB round-trip, so there is a
 * real gap between the `'upgrade'` event and this resolving — the client can
 * abort mid-wait. A no-op `error` listener keeps a `socket.write`/`destroy`
 * on an already-dead socket from surfacing as an unhandled `error` event, and
 * `socket.destroyed` is re-checked once the wait is over so a dead socket is
 * never written to or handed to `wss.handleUpgrade`.
 */
export function handleWsUpgrade(wss: WebSocketServer, req: IncomingMessage, socket: Duplex, head: Buffer) {
  const swallow = () => {};
  socket.on('error', swallow);
  authorizeUpgrade(req)
    .then((ctx) => {
      if (socket.destroyed) return;
      if (!ctx) {
        socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
        socket.destroy();
        return;
      }
      socket.off('error', swallow);
      wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req, ctx));
    })
    .catch((err) => {
      console.error(`WS upgrade failed: ${describeError(err)}`);
      if (!socket.destroyed) socket.destroy();
    });
}

export function attachWebSocket(httpServer: Server) {
  // Set up WebSocket server on /ws only. `noServer` + a manual upgrade handler
  // lets other upgrade requests (Vite HMR in dev) pass through untouched — with
  // `{ server, path }` the ws library would reject them with 400.
  const wss = new WebSocketServer({ noServer: true });
  httpServer.on('upgrade', (req, socket, head) => {
    const { pathname } = new URL(req.url ?? '/', 'http://localhost');
    if (pathname !== '/ws') return;
    handleWsUpgrade(wss, req, socket, head);
  });

  wss.on('connection', (ws: WebSocket, _req: IncomingMessage, ctx: WsContext) => {
    // Add the new client to the set of connected clients
    clients.add(ws);

    console.log(`WebSocket client connected: ${ctx.user.username}`);

    // Send initial station data to the client
    storage.getStations(ctx.scope).then(stations => {
      ws.send(JSON.stringify({
        type: WebSocketMessageType.STATION_STATUS,
        payload: stations
      }));
    }).catch(err => console.error(`WS initial send failed: ${describeError(err)}`));
    
    // Send initial system status
    Promise.all([storage.getSystemStatus(), storage.getStations(ctx.scope)]).then(([statusItems, allStations]) => {
      const managed = allStations.filter(s => s.isManaged);
      ws.send(JSON.stringify({
        type: WebSocketMessageType.NETWORK_STATUS,
        payload: {
          activeStations: managed.filter(s => s.status === 'online').length,
          totalStations: managed.length,
          dataProcessingHealth: statusItems.find(item => item.component === "Data Processing")?.value || 0,
          networkConnectivityHealth: statusItems.find(item => item.component === "Network Connectivity")?.value || 0,
          storageCapacityHealth: statusItems.find(item => item.component === "Storage Capacity")?.value || 0,
          apiPerformanceHealth: statusItems.find(item => item.component === "API Performance")?.value || 0
        }
      }));
    }).catch(err => console.error(`WS initial send failed: ${describeError(err)}`));
    
    // Send recent events
    storage.getRecentEvents(5).then(events => {
      ws.send(JSON.stringify({
        type: WebSocketMessageType.EVENT_NOTIFICATION,
        payload: events
      }));
    }).catch(err => console.error(`WS initial send failed: ${describeError(err)}`));
    
    // Send research networks data
    storage.getResearchNetworks().then(networks => {
      ws.send(JSON.stringify({
        type: WebSocketMessageType.DATA_EXCHANGE,
        payload: networks
      }));
    }).catch(err => console.error(`WS initial send failed: ${describeError(err)}`));
    
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
    startSimulation(ws, ctx.scope);
  });

  // API routes

  // Get all stations
}

// Simulate real-time data for the frontend
function startSimulation(ws: WebSocket, scope: ObjectScope) {
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
      Promise.all([storage.getSystemStatus(), storage.getStations(scope)]).then(([statusItems, allStations]) => {
        const managed = allStations.filter(s => s.isManaged);
        ws.send(JSON.stringify({
          type: WebSocketMessageType.NETWORK_STATUS,
          payload: {
            activeStations: managed.filter(s => s.status === 'online').length,
            totalStations: managed.length,
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
