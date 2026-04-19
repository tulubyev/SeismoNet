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
  status: text("status").notNull().default("offline"),
  lastUpdate: timestamp("last_update").notNull().defaultNow(),
  dataRate: real("data_rate"),
  regionId: integer("region_id").references(() => regions.id),

  batteryLevel: integer("battery_level"),
  batteryVoltage: real("battery_voltage"),
  powerConsumption: real("power_consumption"),
  solarCharging: real("solar_charging"),

  serialNumber: text("serial_number"),
  firmwareVersion: text("firmware_version"),
  hardwareModel: text("hardware_model"),
  installationDate: timestamp("installation_date"),

  sensorsCalibrated: boolean("sensors_calibrated").default(false),
  lastCalibrationDate: timestamp("last_calibration_date"),
  nextCalibrationDue: timestamp("next_calibration_due"),
  calibrationParameters: jsonb("calibration_parameters"),

  configuration: jsonb("configuration"),
  connectionStrength: integer("connection_strength"),
  storageRemaining: integer("storage_remaining")
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
  type: text("type").notNull().default("earthquake"),
  status: text("status").notNull().default("detected"),
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
  dataType: text("data_type").notNull(),
  sampleRate: integer("sample_rate").notNull()
});

// Research networks
export const researchNetworks = pgTable("research_networks", {
  id: serial("id").primaryKey(),
  networkId: text("network_id").notNull().unique(),
  name: text("name").notNull(),
  region: text("region"),
  connectionStatus: text("connection_status").notNull().default("disconnected"),
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

// Historical analysis records
export const historicalAnalysis = pgTable("historical_analysis", {
  id: serial("id").primaryKey(),
  analysisId: text("analysis_id").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  analysisType: text("analysis_type").notNull(),
  timeFrame: text("time_frame").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  parameters: jsonb("parameters").notNull(),
  results: jsonb("results").notNull(),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  isPublic: boolean("is_public").default(false)
});

// Comparison studies
export const comparisonStudies = pgTable("comparison_studies", {
  id: serial("id").primaryKey(),
  studyId: text("study_id").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  studyType: text("study_type").notNull(),
  primaryDataset: jsonb("primary_dataset").notNull(),
  comparisonDataset: jsonb("comparison_dataset").notNull(),
  comparisonResults: jsonb("comparison_results").notNull(),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  isPublic: boolean("is_public").default(false)
});

// Alerts and notifications
export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  alertType: text("alert_type").notNull(),
  severity: text("severity").notNull(),
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
  maintenanceType: text("maintenance_type").notNull(),
  performedBy: text("performed_by").notNull(),
  performedAt: timestamp("performed_at").notNull(),
  scheduledAt: timestamp("scheduled_at"),
  status: text("status").notNull().default("completed"),
  description: text("description"),
  findings: text("findings"),
  partsReplaced: jsonb("parts_replaced"),
  batteryReplaced: boolean("battery_replaced").default(false),
  calibrationPerformed: boolean("calibration_performed").default(false),
  firmwareUpdated: boolean("firmware_updated").default(false),
  nextMaintenanceDue: timestamp("next_maintenance_due"),
  images: jsonb("images"),
  notes: text("notes")
});

// ─── Irkutsk Infrastructure Monitoring ───────────────────────────────────────

// Civil and industrial infrastructure objects in Irkutsk
export const infrastructureObjects = pgTable("infrastructure_objects", {
  id: serial("id").primaryKey(),
  objectId: text("object_id").notNull().unique(),
  name: text("name").notNull(),
  address: text("address"),
  objectType: text("object_type").notNull(), // residential, industrial, bridge, dam, hospital, school, admin
  constructionYear: integer("construction_year"),
  floors: integer("floors"),
  latitude: numeric("latitude").notNull(),
  longitude: numeric("longitude").notNull(),
  district: text("district"), // Октябрьский, Свердловский, Ленинский, Правобережный, Иркутский район
  developer: text("developer"), // застройщик / подрядчик
  structuralSystem: text("structural_system"), // monolithic, frame, brick, panel, reinforced_concrete, steel, masonry, wood, mixed
  foundationType: text("foundation_type"), // pile, strip, slab, combined
  seismicCategory: text("seismic_category"), // I, II, III, IV (per SP 14.13330.2018)
  designIntensity: integer("design_intensity"), // MSK-64 intensity (6, 7, 8, 9)
  technicalCondition: text("technical_condition").default("satisfactory"), // good, satisfactory, poor, critical
  description: text("description"),
  responsibleOrganization: text("responsible_organization"),
  contactPerson: text("contact_person"),
  contactPhone: text("contact_phone"),
  isMonitored: boolean("is_monitored").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  metadata: jsonb("metadata")
});

// ─── Developers (застройщики) ────────────────────────────────────────────────
// Construction companies operating in Irkutsk. Tracks legal info, contacts,
// licenses, completed/planned objects, and seismic-monitoring program status.
export const developers = pgTable("developers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),                          // ГК «Новый город»
  legalForm: text("legal_form"),                         // ООО / АО / ГК / СЗ / ОАО / ИП
  inn: text("inn"),                                      // ИНН
  ogrn: text("ogrn"),                                    // ОГРН
  legalAddress: text("legal_address"),                   // юридический адрес
  officeAddress: text("office_address"),                 // фактический офис
  website: text("website"),
  phone: text("phone"),
  email: text("email"),
  contactPerson: text("contact_person"),                 // ФИО руководителя/контактного лица
  totalAreaThousandSqm: numeric("total_area_thousand_sqm"),  // суммарная площадь, тыс. м²
  // Лицензии и допуски — массив объектов { number, type, issuedDate, expiryDate, issuer, scope }
  licenses: jsonb("licenses"),
  // Введённые объекты — массив { name, year, floors, district, address, area }
  completedObjects: jsonb("completed_objects"),
  // Планируемые объекты — массив { name, plannedYear, floors, district, address, area, status }
  plannedObjects: jsonb("planned_objects"),
  // Состояние подключения к программе сейсмического мониторинга
  monitoringStatus: text("monitoring_status").notNull().default("not_connected"),
  //   not_connected | invited | pending | connected | declined | suspended
  monitoringConnectedDate: timestamp("monitoring_connected_date"),
  monitoringNotes: text("monitoring_notes"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Object categories — used for grouping monitoring objects on map layers
// and for the "тип объекта" lookup (replaces hard-coded list).
// `slug` matches `infrastructure_objects.object_type` so existing data keeps working.
export const objectCategories = pgTable("object_categories", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  color: text("color").notNull().default('#64748b'),  // hex, used for marker fill
  icon: text("icon"),                                  // optional lucide icon hint
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
});

// Soil profiles linked to infrastructure objects
export const soilProfiles = pgTable("soil_profiles", {
  id: serial("id").primaryKey(),
  objectId: integer("object_id").references(() => infrastructureObjects.id),
  profileName: text("profile_name").notNull(),
  // Geographic coordinates of the borehole / observation point
  latitude: numeric("latitude"),
  longitude: numeric("longitude"),
  // Relative position of the borehole within the building footprint (meters),
  // origin = top-left corner of the foundation plan. Optional — used for visual placement.
  positionX: real("position_x"),
  positionY: real("position_y"),
  soilCategory: text("soil_category").notNull(), // I, II, III, IV per SP 14.13330.2018
  avgShearVelocity: real("avg_shear_velocity"), // Vs30 (m/s), average over 30m depth
  groundwaterDepth: real("groundwater_depth"), // meters
  dominantFrequency: real("dominant_frequency"), // Hz
  amplificationFactor: real("amplification_factor"),
  boreholeDepth: real("borehole_depth"), // meters
  surveyDate: timestamp("survey_date"),
  surveyOrganization: text("survey_organization"),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

// Individual soil layers within a profile
export const soilLayers = pgTable("soil_layers", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").references(() => soilProfiles.id),
  layerNumber: integer("layer_number").notNull(),
  soilType: text("soil_type").notNull(), // clay, loam, sand, gravel, rock, fill
  thickness: real("thickness").notNull(), // meters
  depthFrom: real("depth_from").notNull(), // meters from surface
  depthTo: real("depth_to").notNull(), // meters from surface
  shearVelocity: real("shear_velocity").notNull(), // Vs (m/s)
  compressionalVelocity: real("compressional_velocity"), // Vp (m/s)
  density: real("density"), // kg/m³
  dampingRatio: real("damping_ratio"), // %
  description: text("description")
});

// Sensor installations linking stations to infrastructure objects
export const sensorInstallations = pgTable("sensor_installations", {
  id: serial("id").primaryKey(),
  stationId: text("station_id").notNull().references(() => stations.stationId),
  objectId: integer("object_id").references(() => infrastructureObjects.id),
  installationLocation: text("installation_location"), // foundation, ground_floor, mid_floor, roof, free_field
  floor: integer("floor"), // null = underground/free-field
  measurementAxes: text("measurement_axes").notNull().default("Z,NS,EW"), // comma-separated: Z, NS, EW
  installationDate: timestamp("installation_date").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  calibrationDate: timestamp("calibration_date"),
  sensorType: text("sensor_type"), // accelerometer, velocimeter, seismometer
  sensitivity: real("sensitivity"), // V/(m/s) or V/g
  frequencyRange: text("frequency_range"), // e.g., "0.1-50 Hz"
  // Trigger thresholds for automatic event recording
  triggerThresholdZ: real("trigger_threshold_z"),  // mm/s, vertical component
  triggerThresholdH: real("trigger_threshold_h"),  // mm/s, horizontal components (NS, EW)
  notes: text("notes")
});

// Calibration sessions for sensor installations
export const calibrationSessions = pgTable("calibration_sessions", {
  id: serial("id").primaryKey(),
  installationId: integer("installation_id").references(() => sensorInstallations.id),
  sessionDate: timestamp("session_date").notNull(),
  operator: text("operator").notNull(),
  sensitivityZ: real("sensitivity_z"),   // V/(m/s) vertical
  sensitivityNS: real("sensitivity_ns"), // V/(m/s) north-south
  sensitivityEW: real("sensitivity_ew"), // V/(m/s) east-west
  dampingRatio: real("damping_ratio"),   // % (критическое затухание)
  naturalFrequency: real("natural_frequency"), // Hz (собственная частота датчика)
  status: text("status").notNull().default("complete"), // pending, complete, expired
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

// AFC (amplitude-frequency response) data points for a calibration session
export const calibrationAfc = pgTable("calibration_afc", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => calibrationSessions.id),
  frequency: real("frequency").notNull(), // Hz
  amplitude: real("amplitude").notNull(), // dB (relative to 1 V/(m/s))
  phase: real("phase")                   // degrees
});

// Russian Building Norms and Standards reference
export const buildingNorms = pgTable("building_norms", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(), // e.g., "SP14.13330.2018"
  shortCode: text("short_code").notNull(), // e.g., "СП 14.13330.2018"
  name: text("name").notNull(),
  fullName: text("full_name"),
  category: text("category").notNull(), // seismic, loads, survey, foundations, structures, monitoring
  adoptionYear: integer("adoption_year"),
  status: text("status").notNull().default("active"), // active, superseded, draft
  supersedes: text("supersedes"), // e.g., "СНиП II-7-81*"
  description: text("description"),
  scope: text("scope"), // area of application
  keyParameters: jsonb("key_parameters"), // JSON with key numerical values and tables
  sections: jsonb("sections"), // array of main section titles
  url: text("url"), // external link to official document
  createdAt: timestamp("created_at").notNull().defaultNow()
});

// Stored seismogram recordings — catalog of digitised records (historical + current)
export const seismogramRecords = pgTable("seismogram_records", {
  id: serial("id").primaryKey(),
  recordId: text("record_id").notNull().unique(),
  stationId: text("station_id").notNull().references(() => stations.stationId),
  objectId: integer("object_id").references(() => infrastructureObjects.id),
  eventId: text("event_id").references(() => events.eventId),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  durationSec: real("duration_sec"),
  sampleRate: integer("sample_rate").notNull(),
  channels: text("channels").notNull().default("Z,NS,EW"),
  peakAmplitudeZ: real("peak_amplitude_z"),
  peakAmplitudeNS: real("peak_amplitude_ns"),
  peakAmplitudeEW: real("peak_amplitude_ew"),
  peakGroundAcceleration: real("peak_ground_acceleration"), // g
  dominantFrequency: real("dominant_frequency"), // Hz
  triggerThreshold: real("trigger_threshold"),
  recordingType: text("recording_type").notNull().default("triggered"), // triggered, continuous, manual, historical
  processingStatus: text("processing_status").notNull().default("raw"), // raw, filtered, processed
  dataZ: jsonb("data_z"),
  dataNS: jsonb("data_ns"),
  dataEW: jsonb("data_ew"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  // Extended catalog fields
  magnitude: real("magnitude"),               // earthquake magnitude (Ml, Ms, Mw)
  magnitudeType: text("magnitude_type"),       // Ml, Ms, Mw, mb
  focalDepthKm: real("focal_depth_km"),        // hypocenter depth (km)
  epicentralDistanceKm: real("epicentral_distance_km"), // km from epicenter to station
  soilCategory: text("soil_category"),         // I, II, III, IV per SP 14.13330
  locationName: text("location_name"),         // human-readable epicenter location
  dataSource: text("data_source"),             // local, iris, cesmd, historical, seismological_institute
  isHistorical: boolean("is_historical").notNull().default(false),
  responseSpectrum: jsonb("response_spectrum"), // {periods: number[], sa: number[], sd: number[]}
  fourierSpectrum: jsonb("fourier_spectrum"),   // {freqs: number[], amplitudes: number[]}
  usedForModelingCount: integer("used_for_modeling_count").notNull().default(0)
});

// ─── Seismic calculation results (МТСМ / response spectrum / resonance) ──────
export const seismicCalculations = pgTable("seismic_calculations", {
  id: serial("id").primaryKey(),
  calcType: text("calc_type").notNull(), // 'mtsm' | 'response_spectrum' | 'resonance'
  soilProfileId: integer("soil_profile_id").references(() => soilProfiles.id),
  objectId: integer("object_id").references(() => infrastructureObjects.id),
  inputParams: jsonb("input_params").notNull(),  // bedrock params, damping, etc.
  results: jsonb("results").notNull(),            // frequency arrays, amplitudes, risk level…
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: text("created_by"),
  notes: text("notes")
});

// ─── Insert schemas ────────────────────────────────────────────────────────────

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true, lastLogin: true });
export const insertRegionSchema = createInsertSchema(regions).omit({ id: true });
export const insertStationSchema = createInsertSchema(stations).omit({ id: true });
export const insertEventSchema = createInsertSchema(events).omit({ id: true });
export const insertWaveformDataSchema = createInsertSchema(waveformData).omit({ id: true });
export const insertResearchNetworkSchema = createInsertSchema(researchNetworks).omit({ id: true });
export const insertSystemStatusSchema = createInsertSchema(systemStatus).omit({ id: true });
export const insertAlertSchema = createInsertSchema(alerts).omit({ id: true });
export const insertMaintenanceRecordSchema = createInsertSchema(maintenanceRecords).omit({ id: true });
export const insertHistoricalAnalysisSchema = createInsertSchema(historicalAnalysis).omit({ id: true, createdAt: true, updatedAt: true });
export const insertComparisonStudySchema = createInsertSchema(comparisonStudies).omit({ id: true, createdAt: true, updatedAt: true });

// New Irkutsk-specific schemas
export const insertInfrastructureObjectSchema = createInsertSchema(infrastructureObjects).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSoilProfileSchema = createInsertSchema(soilProfiles).omit({ id: true, createdAt: true });
export const insertSoilLayerSchema = createInsertSchema(soilLayers).omit({ id: true });
export const insertSensorInstallationSchema = createInsertSchema(sensorInstallations).omit({ id: true });
export const insertBuildingNormSchema = createInsertSchema(buildingNorms).omit({ id: true, createdAt: true });
export const insertSeismogramRecordSchema = createInsertSchema(seismogramRecords).omit({ id: true, createdAt: true });
export const insertCalibrationSessionSchema = createInsertSchema(calibrationSessions).omit({ id: true, createdAt: true });
export const insertCalibrationAfcSchema = createInsertSchema(calibrationAfc).omit({ id: true });
export const insertObjectCategorySchema = createInsertSchema(objectCategories).omit({ id: true });
export const insertDeveloperSchema = createInsertSchema(developers).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSeismicCalculationSchema = createInsertSchema(seismicCalculations).omit({ id: true, createdAt: true });

// ─── Types ────────────────────────────────────────────────────────────────────

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

export type HistoricalAnalysis = typeof historicalAnalysis.$inferSelect;
export type InsertHistoricalAnalysis = z.infer<typeof insertHistoricalAnalysisSchema>;

export type ComparisonStudy = typeof comparisonStudies.$inferSelect;
export type InsertComparisonStudy = z.infer<typeof insertComparisonStudySchema>;

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;

export type MaintenanceRecord = typeof maintenanceRecords.$inferSelect;
export type InsertMaintenanceRecord = z.infer<typeof insertMaintenanceRecordSchema>;

export type InfrastructureObject = typeof infrastructureObjects.$inferSelect;
export type InsertInfrastructureObject = z.infer<typeof insertInfrastructureObjectSchema>;

export type ObjectCategory = typeof objectCategories.$inferSelect;
export type InsertObjectCategory = z.infer<typeof insertObjectCategorySchema>;

export type Developer = typeof developers.$inferSelect;
export type InsertDeveloper = z.infer<typeof insertDeveloperSchema>;

// Helper sub-types for the developer JSON columns
export interface DeveloperLicense {
  number: string;
  type: string;            // СРО / Минстрой / лицензия на проектирование / etc.
  issuedDate?: string;     // YYYY-MM-DD
  expiryDate?: string;     // YYYY-MM-DD
  issuer?: string;
  scope?: string;
}
export interface DeveloperObject {
  name: string;
  year?: number;
  floors?: number;
  district?: string;
  address?: string;
  area?: number;           // тыс. м²
  status?: string;         // for planned: design / construction / approved
}

export type SoilProfile = typeof soilProfiles.$inferSelect;
export type InsertSoilProfile = z.infer<typeof insertSoilProfileSchema>;

export type SoilLayer = typeof soilLayers.$inferSelect;
export type InsertSoilLayer = z.infer<typeof insertSoilLayerSchema>;

export type SensorInstallation = typeof sensorInstallations.$inferSelect;
export type InsertSensorInstallation = z.infer<typeof insertSensorInstallationSchema>;

export type BuildingNorm = typeof buildingNorms.$inferSelect;
export type InsertBuildingNorm = z.infer<typeof insertBuildingNormSchema>;

export type SeismogramRecord = typeof seismogramRecords.$inferSelect;
export type InsertSeismogramRecord = z.infer<typeof insertSeismogramRecordSchema>;

export type CalibrationSession = typeof calibrationSessions.$inferSelect;
export type InsertCalibrationSession = z.infer<typeof insertCalibrationSessionSchema>;

export type CalibrationAfc = typeof calibrationAfc.$inferSelect;
export type InsertCalibrationAfc = z.infer<typeof insertCalibrationAfcSchema>;

export type SeismicCalculation = typeof seismicCalculations.$inferSelect;
export type InsertSeismicCalculation = z.infer<typeof insertSeismicCalculationSchema>;

// ─── WebSocket / API types ─────────────────────────────────────────────────────

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
