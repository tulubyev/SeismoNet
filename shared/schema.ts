import { pgTable, text, serial, integer, boolean, timestamp, jsonb, numeric, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Seismic stations
export const stations = pgTable("stations", {
  id: serial("id").primaryKey(),
  stationId: text("station_id").notNull().unique(),
  name: text("name").notNull(),
  location: text("location"),
  latitude: numeric("latitude").notNull(),
  longitude: numeric("longitude").notNull(),
  status: text("status").notNull().default("offline"), // online, degraded, offline
  lastUpdate: timestamp("last_update").notNull().defaultNow(),
  dataRate: real("data_rate"),
  configuration: jsonb("configuration")
});

// Seismic events
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  eventId: text("event_id").notNull().unique(),
  region: text("region").notNull(),
  location: text("location"),
  latitude: numeric("latitude").notNull(),
  longitude: numeric("longitude").notNull(),
  depth: real("depth").notNull(),
  magnitude: real("magnitude").notNull(),
  type: text("type").notNull().default("earthquake"), // earthquake, volcanic, etc.
  status: text("status").notNull().default("detected"), // detected, verified, false_positive
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  calculationConfidence: real("calculation_confidence"),
  data: jsonb("data")
});

// Seismic waveform data
export const waveformData = pgTable("waveform_data", {
  id: serial("id").primaryKey(),
  stationId: text("station_id").notNull().references(() => stations.stationId),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  dataPoints: jsonb("data_points").notNull(),
  dataType: text("data_type").notNull(), // p-wave, s-wave, etc.
  sampleRate: integer("sample_rate").notNull()
});

// Research networks
export const researchNetworks = pgTable("research_networks", {
  id: serial("id").primaryKey(),
  networkId: text("network_id").notNull().unique(),
  name: text("name").notNull(),
  region: text("region"),
  connectionStatus: text("connection_status").notNull().default("disconnected"), // connected, disconnected, syncing
  lastSyncTimestamp: timestamp("last_sync_timestamp"),
  syncedDataVolume: real("synced_data_volume"),
  apiEndpoint: text("api_endpoint")
});

// System status information
export const systemStatus = pgTable("system_status", {
  id: serial("id").primaryKey(),
  component: text("component").notNull(),
  status: text("status").notNull(),
  value: real("value"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  message: text("message")
});

// Alerts and notifications
export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  alertType: text("alert_type").notNull(),
  severity: text("severity").notNull(), // info, warning, danger
  message: text("message").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  relatedEntityId: text("related_entity_id"),
  relatedEntityType: text("related_entity_type"),
  isRead: boolean("is_read").notNull().default(false)
});

// Insert schemas
export const insertStationSchema = createInsertSchema(stations).omit({ id: true });
export const insertEventSchema = createInsertSchema(events).omit({ id: true });
export const insertWaveformDataSchema = createInsertSchema(waveformData).omit({ id: true });
export const insertResearchNetworkSchema = createInsertSchema(researchNetworks).omit({ id: true });
export const insertSystemStatusSchema = createInsertSchema(systemStatus).omit({ id: true });
export const insertAlertSchema = createInsertSchema(alerts).omit({ id: true });

// Types
export type Station = typeof stations.$inferSelect;
export type InsertStation = z.infer<typeof insertStationSchema>;

export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;

export type WaveformData = typeof waveformData.$inferSelect;
export type InsertWaveformData = z.infer<typeof insertWaveformDataSchema>;

export type ResearchNetwork = typeof researchNetworks.$inferSelect;
export type InsertResearchNetwork = z.infer<typeof insertResearchNetworkSchema>;

export type SystemStatus = typeof systemStatus.$inferSelect;
export type InsertSystemStatus = z.infer<typeof insertSystemStatusSchema>;

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;

// Types for API communication
export type SeismicDataPoint = {
  timestamp: number;
  value: number;
};

export type LiveWaveformData = {
  stationId: string;
  timestamp: number;
  dataPoints: SeismicDataPoint[];
  dataType: string;
};

export type NetworkStatusUpdate = {
  activeStations: number;
  totalStations: number;
  dataProcessingHealth: number;
  networkConnectivityHealth: number;
  storageCapacityHealth: number;
  apiPerformanceHealth: number;
};

export type EventNotification = {
  eventId: string;
  region: string;
  location: string;
  magnitude: number;
  depth: number;
  timestamp: number;
  status: string;
};

export type StationStatusUpdate = {
  stationId: string;
  status: string;
  dataRate?: number;
  lastUpdate: number;
};

export type EpicenterCalculation = {
  eventId: string;
  latitude: number;
  longitude: number;
  depth: number;
  magnitude: number;
  confidence: number;
  contributingStations: {
    stationId: string;
    distance: number;
    pWaveArrival: number;
    sWaveArrival: number;
  }[];
};

export type DataExchangeUpdate = {
  networkId: string;
  dataTransferred: number;
  connectionStatus: string;
  lastSync?: number;
};

export enum WebSocketMessageType {
  STATION_STATUS = 'station_status',
  NETWORK_STATUS = 'network_status',
  WAVEFORM_DATA = 'waveform_data',
  EVENT_NOTIFICATION = 'event_notification',
  EPICENTER_CALCULATION = 'epicenter_calculation',
  DATA_EXCHANGE = 'data_exchange',
  ALERT = 'alert',
  ERROR = 'error'
}

export type WebSocketMessage = {
  type: WebSocketMessageType;
  payload: any;
};
