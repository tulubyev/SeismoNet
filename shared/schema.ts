import { pgTable, text, serial, integer, boolean, timestamp, jsonb, numeric, real, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define user roles
export const userRoleEnum = pgEnum('user_role', ['administrator', 'user', 'viewer']);

// User accounts
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: userRoleEnum("role").notNull().default('viewer'),
  active: boolean("active").notNull().default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  profileImage: text("profile_image"),
  contactPhone: text("contact_phone"),
  organization: text("organization"),
  jobTitle: text("job_title"),
  specialization: text("specialization"),
  preferences: jsonb("preferences")
});

// Geographic regions for grouping stations
export const regions = pgTable("regions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  centerLatitude: numeric("center_latitude").notNull(),
  centerLongitude: numeric("center_longitude").notNull(),
  radiusKm: real("radius_km").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

// Seismic stations with extended field operations capabilities
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
  regionId: integer("region_id").references(() => regions.id),
  
  // Field operations data
  batteryLevel: integer("battery_level"), // percentage (0-100)
  batteryVoltage: real("battery_voltage"), // actual voltage reading
  powerConsumption: real("power_consumption"), // in watts
  solarCharging: real("solar_charging"), // in watts (if equipped with solar)
  
  // Hardware details
  serialNumber: text("serial_number"),
  firmwareVersion: text("firmware_version"),
  hardwareModel: text("hardware_model"),
  installationDate: timestamp("installation_date"),
  
  // Sensor parameters and calibration
  sensorsCalibrated: boolean("sensors_calibrated").default(false),
  lastCalibrationDate: timestamp("last_calibration_date"),
  nextCalibrationDue: timestamp("next_calibration_due"),
  calibrationParameters: jsonb("calibration_parameters"),
  
  // Configuration and additional data
  configuration: jsonb("configuration"),
  connectionStrength: integer("connection_strength"), // signal strength as percentage
  storageRemaining: integer("storage_remaining") // percentage of local storage remaining
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
  eventId: text("event_id").references(() => events.eventId),
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

// Maintenance records for field devices
export const maintenanceRecords = pgTable("maintenance_records", {
  id: serial("id").primaryKey(),
  stationId: text("station_id").notNull().references(() => stations.stationId),
  maintenanceType: text("maintenance_type").notNull(), // calibration, repair, upgrade, inspection, battery
  performedBy: text("performed_by").notNull(),
  performedAt: timestamp("performed_at").notNull(),
  scheduledAt: timestamp("scheduled_at"),
  status: text("status").notNull().default("completed"), // scheduled, in-progress, completed, cancelled
  description: text("description"),
  findings: text("findings"),
  partsReplaced: jsonb("parts_replaced"),
  batteryReplaced: boolean("battery_replaced").default(false),
  calibrationPerformed: boolean("calibration_performed").default(false),
  firmwareUpdated: boolean("firmware_updated").default(false),
  nextMaintenanceDue: timestamp("next_maintenance_due"),
  images: jsonb("images"), // URLs to maintenance photos
  notes: text("notes")
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true, lastLogin: true });
export const insertRegionSchema = createInsertSchema(regions).omit({ id: true });
export const insertStationSchema = createInsertSchema(stations).omit({ id: true });
export const insertEventSchema = createInsertSchema(events).omit({ id: true });
export const insertWaveformDataSchema = createInsertSchema(waveformData).omit({ id: true });
export const insertResearchNetworkSchema = createInsertSchema(researchNetworks).omit({ id: true });
export const insertSystemStatusSchema = createInsertSchema(systemStatus).omit({ id: true });
export const insertAlertSchema = createInsertSchema(alerts).omit({ id: true });
export const insertMaintenanceRecordSchema = createInsertSchema(maintenanceRecords).omit({ id: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Region = typeof regions.$inferSelect;
export type InsertRegion = z.infer<typeof insertRegionSchema>;

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

export type MaintenanceRecord = typeof maintenanceRecords.$inferSelect;
export type InsertMaintenanceRecord = z.infer<typeof insertMaintenanceRecordSchema>;

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
