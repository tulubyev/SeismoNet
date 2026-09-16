import { 
  User,
  InsertUser,
  Region,
  InsertRegion,
  Station, 
  InsertStation, 
  Event, 
  InsertEvent, 
  WaveformData, 
  InsertWaveformData,
  ResearchNetwork,
  InsertResearchNetwork,
  SystemStatus,
  InsertSystemStatus,
  Alert,
  InsertAlert,
  MaintenanceRecord,
  InsertMaintenanceRecord,
  InfrastructureObject,
  InsertInfrastructureObject,
  ObjectCategory,
  InsertObjectCategory,
  SoilProfile,
  InsertSoilProfile,
  SoilLayer,
  InsertSoilLayer,
  SensorInstallation,
  InsertSensorInstallation,
  Sensor,
  InsertSensor,
  BuildingNorm,
  InsertBuildingNorm,
  SeismogramRecord,
  InsertSeismogramRecord,
  CalibrationSession,
  InsertCalibrationSession,
  CalibrationAfc,
  InsertCalibrationAfc,
  Developer,
  InsertDeveloper,
  SeismicCalculation,
  InsertSeismicCalculation,
  CalculationNoteHistory,
  InsertCalculationNoteHistory,
  ComparisonSet,
  InsertComparisonSet
} from "@shared/schema";

// Maximum number of note history entries to keep per calculation
// Can be overridden via the NOTE_HISTORY_LIMIT environment variable (must be a positive integer).
// Values that are missing, non-integer, zero, or negative fall back to 50.
const _rawNoteHistoryLimit = Number(process.env.NOTE_HISTORY_LIMIT);
export const NOTE_HISTORY_LIMIT =
  Number.isInteger(_rawNoteHistoryLimit) && _rawNoteHistoryLimit >= 1
    ? _rawNoteHistoryLimit
    : 50;

// Interface for storage operations
export interface IStorage {
  // User operations
  getUsers(): Promise<User[]>;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined>;
  updateUserRole(id: number, role: 'administrator' | 'user' | 'viewer'): Promise<User | undefined>;
  updateUserStatus(id: number, active: boolean): Promise<User | undefined>;
  
  // Region operations
  getRegions(): Promise<Region[]>;
  getRegion(id: number): Promise<Region | undefined>;
  getRegionByName(name: string): Promise<Region | undefined>;
  createRegion(region: InsertRegion): Promise<Region>;
  
  // Station operations
  getStations(): Promise<Station[]>;
  getStationsByRegionId(regionId: number): Promise<Station[]>;
  getStation(id: number): Promise<Station | undefined>;
  getStationByStationId(stationId: string): Promise<Station | undefined>;
  createStation(station: InsertStation): Promise<Station>;
  updateStation(stationId: string, updates: Partial<Station>): Promise<Station | undefined>;
  updateStationStatus(stationId: string, status: string): Promise<Station | undefined>;
  updateStationBatteryInfo(stationId: string, batteryLevel: number, batteryVoltage: number, powerConsumption: number): Promise<Station | undefined>;
  updateStationStorageInfo(stationId: string, storageRemaining: number): Promise<Station | undefined>;
  
  // Event operations
  getEvents(): Promise<Event[]>;
  getRecentEvents(limit: number): Promise<Event[]>;
  getEvent(id: number): Promise<Event | undefined>;
  getEventByEventId(eventId: string): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEventStatus(eventId: string, status: string): Promise<Event | undefined>;
  
  // Waveform data operations
  getWaveformData(stationId: string, limit: number): Promise<WaveformData[]>;
  createWaveformData(waveformData: InsertWaveformData): Promise<WaveformData>;
  
  // Maintenance operations
  getMaintenanceRecords(stationId: string): Promise<MaintenanceRecord[]>;
  getMaintenanceRecord(id: number): Promise<MaintenanceRecord | undefined>;
  createMaintenanceRecord(record: InsertMaintenanceRecord): Promise<MaintenanceRecord>;
  updateMaintenanceStatus(id: number, status: string): Promise<MaintenanceRecord | undefined>;
  getUpcomingMaintenanceRecords(days: number): Promise<MaintenanceRecord[]>;
  
  // Research network operations
  getResearchNetworks(): Promise<ResearchNetwork[]>;
  getResearchNetwork(id: number): Promise<ResearchNetwork | undefined>;
  getResearchNetworkByNetworkId(networkId: string): Promise<ResearchNetwork | undefined>;
  createResearchNetwork(network: InsertResearchNetwork): Promise<ResearchNetwork>;
  updateResearchNetworkStatus(networkId: string, status: string, dataVolume?: number): Promise<ResearchNetwork | undefined>;
  
  // System status operations
  getSystemStatus(): Promise<SystemStatus[]>;
  createSystemStatus(status: InsertSystemStatus): Promise<SystemStatus>;
  
  // Alert operations
  getAlerts(limit: number): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  markAlertAsRead(id: number): Promise<Alert | undefined>;
  markAllAlertsAsRead(): Promise<void>;

  // Infrastructure object operations
  getInfrastructureObjects(): Promise<InfrastructureObject[]>;
  getInfrastructureObject(id: number): Promise<InfrastructureObject | undefined>;
  getInfrastructureObjectByObjectId(objectId: string): Promise<InfrastructureObject | undefined>;
  createInfrastructureObject(obj: InsertInfrastructureObject): Promise<InfrastructureObject>;
  updateInfrastructureObject(id: number, data: Partial<InsertInfrastructureObject>): Promise<InfrastructureObject | undefined>;
  deleteInfrastructureObject(id: number): Promise<boolean>;

  // Object category operations
  getObjectCategories(): Promise<ObjectCategory[]>;
  getObjectCategory(id: number): Promise<ObjectCategory | undefined>;
  getObjectCategoryBySlug(slug: string): Promise<ObjectCategory | undefined>;
  createObjectCategory(cat: InsertObjectCategory): Promise<ObjectCategory>;
  updateObjectCategory(id: number, data: Partial<InsertObjectCategory>): Promise<ObjectCategory | undefined>;
  deleteObjectCategory(id: number): Promise<boolean>;

  // Soil profile operations
  getSoilProfiles(objectId?: number): Promise<SoilProfile[]>;
  getSoilProfile(id: number): Promise<SoilProfile | undefined>;
  getSoilProfileNearCoords(lat: number, lng: number): Promise<SoilProfile | undefined>;
  createSoilProfile(profile: InsertSoilProfile): Promise<SoilProfile>;
  updateSoilProfile(id: number, data: Partial<InsertSoilProfile>): Promise<SoilProfile | undefined>;
  deleteSoilProfile(id: number): Promise<boolean>;
  getSoilLayers(profileId: number): Promise<SoilLayer[]>;
  createSoilLayer(layer: InsertSoilLayer): Promise<SoilLayer>;
  updateSoilLayer(id: number, data: Partial<InsertSoilLayer>): Promise<SoilLayer | undefined>;
  deleteSoilLayer(id: number): Promise<boolean>;

  // Sensor installation operations
  getSensorInstallations(objectId?: number): Promise<SensorInstallation[]>;
  getSensorInstallation(id: number): Promise<SensorInstallation | undefined>;
  createSensorInstallation(inst: InsertSensorInstallation): Promise<SensorInstallation>;
  updateSensorInstallation(id: number, data: Partial<InsertSensorInstallation>): Promise<SensorInstallation | undefined>;
  deleteSensorInstallation(id: number): Promise<boolean>;

  // Sensor device operations
  getSensors(stationId?: string, objectId?: number): Promise<Sensor[]>;
  getSensor(id: number): Promise<Sensor | undefined>;
  getSensorBySensorCode(code: string): Promise<Sensor | undefined>;
  createSensor(sensor: InsertSensor): Promise<Sensor>;
  updateSensor(id: number, data: Partial<InsertSensor>): Promise<Sensor | undefined>;
  deleteSensor(id: number): Promise<boolean>;

  // Building norms operations
  getBuildingNorms(category?: string): Promise<BuildingNorm[]>;
  getBuildingNorm(id: number): Promise<BuildingNorm | undefined>;
  getBuildingNormByCode(code: string): Promise<BuildingNorm | undefined>;
  createBuildingNorm(norm: InsertBuildingNorm): Promise<BuildingNorm>;

  // Seismogram record operations
  getSeismogramRecords(stationId?: string, limit?: number): Promise<SeismogramRecord[]>;
  getSeismogramRecord(id: number): Promise<SeismogramRecord | undefined>;
  createSeismogramRecord(record: InsertSeismogramRecord): Promise<SeismogramRecord>;
  updateSeismogramProcessingStatus(id: number, status: string): Promise<SeismogramRecord | undefined>;

  // Calibration session operations
  getCalibrationSessions(installationId?: number): Promise<CalibrationSession[]>;
  getCalibrationSession(id: number): Promise<CalibrationSession | undefined>;
  createCalibrationSession(session: InsertCalibrationSession): Promise<CalibrationSession>;
  updateCalibrationSession(id: number, data: Partial<InsertCalibrationSession>): Promise<CalibrationSession | undefined>;
  deleteCalibrationSession(id: number): Promise<boolean>;

  // AFC data operations
  getCalibrationAfc(sessionId: number): Promise<CalibrationAfc[]>;
  createCalibrationAfcPoint(point: InsertCalibrationAfc): Promise<CalibrationAfc>;
  deleteCalibrationAfcPoint(id: number): Promise<boolean>;
  replaceCalibrationAfc(sessionId: number, points: InsertCalibrationAfc[]): Promise<CalibrationAfc[]>;

  // Developer operations
  getDevelopers(): Promise<Developer[]>;
  getDeveloper(id: number): Promise<Developer | undefined>;
  getDeveloperByName(name: string): Promise<Developer | undefined>;
  createDeveloper(dev: InsertDeveloper): Promise<Developer>;
  updateDeveloper(id: number, data: Partial<InsertDeveloper>): Promise<Developer | undefined>;
  deleteDeveloper(id: number): Promise<boolean>;

  // Seismic calculation operations
  getSeismicCalculations(calcType?: string, limit?: number): Promise<SeismicCalculation[]>;
  getSeismicCalculation(id: number): Promise<SeismicCalculation | undefined>;
  createSeismicCalculation(calc: InsertSeismicCalculation): Promise<SeismicCalculation>;
  updateSeismicCalculation(id: number, data: Partial<Pick<InsertSeismicCalculation, 'notes'>> & { notesUpdatedBy?: string | null }): Promise<SeismicCalculation | undefined>;
  deleteSeismicCalculation(id: number): Promise<boolean>;

  // Calculation note history
  getCalculationNoteHistory(calculationId: number): Promise<CalculationNoteHistory[]>;
  createCalculationNoteHistory(entry: InsertCalculationNoteHistory): Promise<CalculationNoteHistory>;

  // Saved comparison set operations
  getComparisonSets(): Promise<ComparisonSet[]>;
  getComparisonSet(id: number): Promise<ComparisonSet | undefined>;
  createComparisonSet(set: InsertComparisonSet): Promise<ComparisonSet>;
  deleteComparisonSet(id: number): Promise<boolean>;
}

import { db } from './db';
import { eq, desc, and, gt, lte, inArray } from 'drizzle-orm';
import { schema } from './db';
import {
  users, regions, stations, events, waveformData, researchNetworks,
  systemStatus, alerts, maintenanceRecords,
  infrastructureObjects, objectCategories, soilProfiles, soilLayers, sensorInstallations,
  sensors, buildingNorms, seismogramRecords
} from "@shared/schema";

// Database storage implementation
export class DatabaseStorage implements IStorage {
  // User operations
  async getUsers(): Promise<User[]> {
    return db.query.users.findMany();
  }
  
  async getUser(id: number): Promise<User | undefined> {
    return db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, id)
    });
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return db.query.users.findFirst({
      where: (users, { eq }) => eq(users.username, username)
    });
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, email)
    });
  }
  
  async createUser(user: InsertUser): Promise<User> {
    const now = new Date();
    const userWithTimestamps = {
      ...user,
      createdAt: now,
      updatedAt: now,
      lastLogin: null
    };
    const [newUser] = await db.insert(schema.users).values(userWithTimestamps).returning();
    return newUser;
  }
  
  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(schema.users)
      .set({
        ...userData,
        updatedAt: new Date()
      })
      .where(eq(schema.users.id, id))
      .returning();
    return updatedUser;
  }
  
  async updateUserRole(id: number, role: 'administrator' | 'user' | 'viewer'): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(schema.users)
      .set({
        role,
        updatedAt: new Date()
      })
      .where(eq(schema.users.id, id))
      .returning();
    return updatedUser;
  }
  
  async updateUserStatus(id: number, active: boolean): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(schema.users)
      .set({
        active,
        updatedAt: new Date()
      })
      .where(eq(schema.users.id, id))
      .returning();
    return updatedUser;
  }
  
  // Region operations
  async getRegions(): Promise<Region[]> {
    return db.query.regions.findMany();
  }
  
  async getRegion(id: number): Promise<Region | undefined> {
    return db.query.regions.findFirst({
      where: (regions, { eq }) => eq(regions.id, id)
    });
  }
  
  async getRegionByName(name: string): Promise<Region | undefined> {
    return db.query.regions.findFirst({
      where: (regions, { eq }) => eq(regions.name, name)
    });
  }
  
  async createRegion(region: InsertRegion): Promise<Region> {
    const [newRegion] = await db.insert(schema.regions).values(region).returning();
    return newRegion;
  }
  
  // Station operations
  async getStations(): Promise<Station[]> {
    return db.query.stations.findMany();
  }
  
  async getStationsByRegionId(regionId: number): Promise<Station[]> {
    return db.query.stations.findMany({
      where: (stations, { eq }) => eq(stations.regionId, regionId)
    });
  }
  
  async getStation(id: number): Promise<Station | undefined> {
    return db.query.stations.findFirst({
      where: (stations, { eq }) => eq(stations.id, id)
    });
  }
  
  async getStationByStationId(stationId: string): Promise<Station | undefined> {
    return db.query.stations.findFirst({
      where: (stations, { eq }) => eq(stations.stationId, stationId)
    });
  }
  
  async createStation(station: InsertStation): Promise<Station> {
    const [newStation] = await db.insert(schema.stations).values(station).returning();
    return newStation;
  }
  
  async updateStation(stationId: string, updates: Partial<Station>): Promise<Station | undefined> {
    const { id: _id, stationId: _sid, ...safeUpdates } = updates;
    const [updatedStation] = await db
      .update(schema.stations)
      .set({ ...safeUpdates, lastUpdate: new Date() })
      .where(eq(schema.stations.stationId, stationId))
      .returning();
    return updatedStation;
  }

  async updateStationStatus(stationId: string, status: string): Promise<Station | undefined> {
    const [updatedStation] = await db
      .update(schema.stations)
      .set({ status, lastUpdate: new Date() })
      .where(eq(schema.stations.stationId, stationId))
      .returning();
    return updatedStation;
  }
  
  async updateStationBatteryInfo(
    stationId: string, 
    batteryLevel: number, 
    batteryVoltage: number, 
    powerConsumption: number
  ): Promise<Station | undefined> {
    // Convert floating point values to integers to avoid the type error
    const batteryLevelInt = Math.round(batteryLevel);
    const batteryVoltageInt = Math.round(batteryVoltage * 100) / 100; // Keep two decimal places
    const powerConsumptionInt = Math.round(powerConsumption * 100) / 100; // Keep two decimal places
    
    const [updatedStation] = await db
      .update(schema.stations)
      .set({ 
        batteryLevel: batteryLevelInt, 
        batteryVoltage: batteryVoltageInt, 
        powerConsumption: powerConsumptionInt,
        lastUpdate: new Date() 
      })
      .where(eq(schema.stations.stationId, stationId))
      .returning();
    return updatedStation;
  }
  
  async updateStationStorageInfo(stationId: string, storageRemaining: number): Promise<Station | undefined> {
    // Convert floating point values to integers to avoid the type error
    const storageRemainingInt = Math.round(storageRemaining);
    
    const [updatedStation] = await db
      .update(schema.stations)
      .set({ 
        storageRemaining: storageRemainingInt,
        lastUpdate: new Date() 
      })
      .where(eq(schema.stations.stationId, stationId))
      .returning();
    return updatedStation;
  }
  
  // Event operations
  async getEvents(): Promise<Event[]> {
    return db.query.events.findMany();
  }
  
  async getRecentEvents(limit: number): Promise<Event[]> {
    return db.query.events.findMany({
      orderBy: (events, { desc }) => [desc(events.timestamp)],
      limit
    });
  }
  
  async getEvent(id: number): Promise<Event | undefined> {
    return db.query.events.findFirst({
      where: (events, { eq }) => eq(events.id, id)
    });
  }
  
  async getEventByEventId(eventId: string): Promise<Event | undefined> {
    return db.query.events.findFirst({
      where: (events, { eq }) => eq(events.eventId, eventId)
    });
  }
  
  async createEvent(event: InsertEvent): Promise<Event> {
    const [newEvent] = await db.insert(schema.events).values(event).returning();
    return newEvent;
  }
  
  async updateEventStatus(eventId: string, status: string): Promise<Event | undefined> {
    const [updatedEvent] = await db
      .update(schema.events)
      .set({ status })
      .where(eq(schema.events.eventId, eventId))
      .returning();
    return updatedEvent;
  }
  
  // Waveform data operations
  async getWaveformData(stationId: string, limit: number): Promise<WaveformData[]> {
    return db.query.waveformData.findMany({
      where: (waveformData, { eq }) => eq(waveformData.stationId, stationId),
      orderBy: (waveformData, { desc }) => [desc(waveformData.timestamp)],
      limit
    });
  }
  
  async createWaveformData(data: InsertWaveformData): Promise<WaveformData> {
    const [newData] = await db.insert(schema.waveformData).values(data).returning();
    return newData;
  }
  
  // Maintenance operations
  async getMaintenanceRecords(stationId: string): Promise<MaintenanceRecord[]> {
    return db.query.maintenanceRecords.findMany({
      where: (records, { eq }) => eq(records.stationId, stationId),
      orderBy: (records, { desc }) => [desc(records.performedAt)]
    });
  }
  
  async getMaintenanceRecord(id: number): Promise<MaintenanceRecord | undefined> {
    return db.query.maintenanceRecords.findFirst({
      where: (records, { eq }) => eq(records.id, id)
    });
  }
  
  async createMaintenanceRecord(record: InsertMaintenanceRecord): Promise<MaintenanceRecord> {
    const [newRecord] = await db.insert(schema.maintenanceRecords).values(record).returning();
    
    // If calibration was performed, update the station calibration info
    if (record.calibrationPerformed) {
      await db
        .update(schema.stations)
        .set({ 
          sensorsCalibrated: true,
          lastCalibrationDate: record.performedAt,
          nextCalibrationDue: record.nextMaintenanceDue
        })
        .where(eq(schema.stations.stationId, record.stationId));
    }
    
    return newRecord;
  }
  
  async updateMaintenanceStatus(id: number, status: string): Promise<MaintenanceRecord | undefined> {
    const [updatedRecord] = await db
      .update(schema.maintenanceRecords)
      .set({ status })
      .where(eq(schema.maintenanceRecords.id, id))
      .returning();
    
    return updatedRecord;
  }
  
  async getUpcomingMaintenanceRecords(days: number): Promise<MaintenanceRecord[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    
    return db.query.maintenanceRecords.findMany({
      where: (records, { and, lte, gt, eq }) => 
        and(
          lte(records.scheduledAt, futureDate),
          gt(records.scheduledAt, new Date()),
          eq(records.status, "scheduled")
        ),
      orderBy: (records, { asc }) => [asc(records.scheduledAt)]
    });
  }
  
  // Research network operations
  async getResearchNetworks(): Promise<ResearchNetwork[]> {
    return db.query.researchNetworks.findMany();
  }
  
  async getResearchNetwork(id: number): Promise<ResearchNetwork | undefined> {
    return db.query.researchNetworks.findFirst({
      where: (networks, { eq }) => eq(networks.id, id)
    });
  }
  
  async getResearchNetworkByNetworkId(networkId: string): Promise<ResearchNetwork | undefined> {
    return db.query.researchNetworks.findFirst({
      where: (networks, { eq }) => eq(networks.networkId, networkId)
    });
  }
  
  async createResearchNetwork(network: InsertResearchNetwork): Promise<ResearchNetwork> {
    const [newNetwork] = await db.insert(schema.researchNetworks).values(network).returning();
    return newNetwork;
  }
  
  async updateResearchNetworkStatus(
    networkId: string, 
    status: string, 
    dataVolume?: number
  ): Promise<ResearchNetwork | undefined> {
    const updateData: Partial<ResearchNetwork> = { 
      connectionStatus: status,
      lastSyncTimestamp: new Date()
    };
    
    if (dataVolume !== undefined) {
      updateData.syncedDataVolume = dataVolume;
    }
    
    const [updatedNetwork] = await db
      .update(schema.researchNetworks)
      .set(updateData)
      .where(eq(schema.researchNetworks.networkId, networkId))
      .returning();
    
    return updatedNetwork;
  }
  
  // System status operations
  async getSystemStatus(): Promise<SystemStatus[]> {
    return db.query.systemStatus.findMany();
  }
  
  async createSystemStatus(status: InsertSystemStatus): Promise<SystemStatus> {
    const [newStatus] = await db.insert(schema.systemStatus).values(status).returning();
    return newStatus;
  }
  
  // Alert operations
  async getAlerts(limit: number): Promise<Alert[]> {
    return db.query.alerts.findMany({
      orderBy: (alerts, { desc }) => [desc(alerts.timestamp)],
      limit
    });
  }
  
  async createAlert(alert: InsertAlert): Promise<Alert> {
    const [newAlert] = await db.insert(schema.alerts).values(alert).returning();
    return newAlert;
  }
  
  async markAlertAsRead(id: number): Promise<Alert | undefined> {
    const [updatedAlert] = await db
      .update(schema.alerts)
      .set({ isRead: true })
      .where(eq(schema.alerts.id, id))
      .returning();
    return updatedAlert;
  }

  async markAllAlertsAsRead(): Promise<void> {
    await db.update(schema.alerts).set({ isRead: true }).where(eq(schema.alerts.isRead, false));
  }

  // ─── Infrastructure object operations ────────────────────────────────────────

  async getInfrastructureObjects(): Promise<InfrastructureObject[]> {
    return db.query.infrastructureObjects.findMany({
      orderBy: (t, { asc }) => [asc(t.name)]
    });
  }

  async getInfrastructureObject(id: number): Promise<InfrastructureObject | undefined> {
    return db.query.infrastructureObjects.findFirst({
      where: (t, { eq }) => eq(t.id, id)
    });
  }

  async getInfrastructureObjectByObjectId(objectId: string): Promise<InfrastructureObject | undefined> {
    return db.query.infrastructureObjects.findFirst({
      where: (t, { eq }) => eq(t.objectId, objectId)
    });
  }

  async createInfrastructureObject(obj: InsertInfrastructureObject): Promise<InfrastructureObject> {
    const [newObj] = await db.insert(schema.infrastructureObjects).values(obj).returning();
    return newObj;
  }

  async updateInfrastructureObject(id: number, data: Partial<InsertInfrastructureObject>): Promise<InfrastructureObject | undefined> {
    const [updated] = await db
      .update(schema.infrastructureObjects)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.infrastructureObjects.id, id))
      .returning();
    return updated;
  }

  async deleteInfrastructureObject(id: number): Promise<boolean> {
    await db
      .delete(schema.sensorInstallations)
      .where(eq(schema.sensorInstallations.objectId, id));
    const result = await db
      .delete(schema.infrastructureObjects)
      .where(eq(schema.infrastructureObjects.id, id))
      .returning({ id: schema.infrastructureObjects.id });
    return result.length > 0;
  }

  // ─── Developer operations ────────────────────────────────────────────────────

  async getDevelopers(): Promise<Developer[]> {
    return db.query.developers.findMany({
      orderBy: (t, { asc }) => [asc(t.name)]
    });
  }

  async getDeveloper(id: number): Promise<Developer | undefined> {
    return db.query.developers.findFirst({
      where: (t, { eq }) => eq(t.id, id)
    });
  }

  async getDeveloperByName(name: string): Promise<Developer | undefined> {
    return db.query.developers.findFirst({
      where: (t, { eq }) => eq(t.name, name)
    });
  }

  async createDeveloper(dev: InsertDeveloper): Promise<Developer> {
    const [created] = await db.insert(schema.developers).values(dev).returning();
    return created;
  }

  async updateDeveloper(id: number, data: Partial<InsertDeveloper>): Promise<Developer | undefined> {
    const [updated] = await db
      .update(schema.developers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.developers.id, id))
      .returning();
    return updated;
  }

  async deleteDeveloper(id: number): Promise<boolean> {
    const result = await db
      .delete(schema.developers)
      .where(eq(schema.developers.id, id))
      .returning({ id: schema.developers.id });
    return result.length > 0;
  }

  // ─── Seismic calculation operations ──────────────────────────────────────────
  async getSeismicCalculations(calcType?: string, limit = 50): Promise<SeismicCalculation[]> {
    return db.query.seismicCalculations.findMany({
      where: calcType ? (t, { eq }) => eq(t.calcType, calcType) : undefined,
      orderBy: (t, { desc }) => [desc(t.createdAt)],
      limit,
    });
  }
  async getSeismicCalculation(id: number): Promise<SeismicCalculation | undefined> {
    return db.query.seismicCalculations.findFirst({ where: (t, { eq }) => eq(t.id, id) });
  }
  async createSeismicCalculation(calc: InsertSeismicCalculation): Promise<SeismicCalculation> {
    const [row] = await db.insert(schema.seismicCalculations).values(calc).returning();
    return row;
  }
  async updateSeismicCalculation(id: number, data: Partial<Pick<InsertSeismicCalculation, 'notes'>> & { notesUpdatedBy?: string | null }): Promise<SeismicCalculation | undefined> {
    const patch: Record<string, unknown> = {};
    if (data.notes !== undefined) {
      const existing = await db.query.seismicCalculations.findFirst({ where: (t, { eq }) => eq(t.id, id) });
      if (!existing) return undefined;
      await this.createCalculationNoteHistory({
        calculationId: id,
        previousText: existing.notes ?? null,
        editedBy: data.notesUpdatedBy ?? null,
        editedAt: new Date(),
      });
      patch.notes = data.notes ?? null;
      patch.notesUpdatedAt = new Date();
      patch.notesUpdatedBy = data.notesUpdatedBy ?? null;
    }
    if (Object.keys(patch).length === 0) {
      return db.query.seismicCalculations.findFirst({ where: (t, { eq }) => eq(t.id, id) });
    }
    const [row] = await db.update(schema.seismicCalculations)
      .set(patch)
      .where(eq(schema.seismicCalculations.id, id))
      .returning();
    return row;
  }
  async deleteSeismicCalculation(id: number): Promise<boolean> {
    const res = await db.delete(schema.seismicCalculations)
      .where(eq(schema.seismicCalculations.id, id))
      .returning({ id: schema.seismicCalculations.id });
    return res.length > 0;
  }

  // ─── Calculation note history ────────────────────────────────────────────────
  async getCalculationNoteHistory(calculationId: number): Promise<CalculationNoteHistory[]> {
    return db.query.calculationNoteHistory.findMany({
      where: (t, { eq }) => eq(t.calculationId, calculationId),
      orderBy: (t, { asc }) => [asc(t.editedAt)],
    });
  }
  async createCalculationNoteHistory(entry: InsertCalculationNoteHistory): Promise<CalculationNoteHistory> {
    const [row] = await db.insert(schema.calculationNoteHistory).values(entry).returning();
    // Trim oldest entries beyond the limit for this calculation (bulk delete)
    const allEntries = await db.query.calculationNoteHistory.findMany({
      where: (t, { eq }) => eq(t.calculationId, entry.calculationId),
      orderBy: (t, { desc }) => [desc(t.editedAt), desc(t.id)],
      columns: { id: true },
    });
    if (allEntries.length > NOTE_HISTORY_LIMIT) {
      const idsToDelete = allEntries.slice(NOTE_HISTORY_LIMIT).map(e => e.id);
      await db.delete(schema.calculationNoteHistory)
        .where(inArray(schema.calculationNoteHistory.id, idsToDelete));
    }
    return row;
  }

  // ─── Comparison set operations ───────────────────────────────────────────────
  async getComparisonSets(): Promise<ComparisonSet[]> {
    return db.query.comparisonSets.findMany({
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    });
  }
  async getComparisonSet(id: number): Promise<ComparisonSet | undefined> {
    return db.query.comparisonSets.findFirst({ where: (t, { eq }) => eq(t.id, id) });
  }
  async createComparisonSet(set: InsertComparisonSet): Promise<ComparisonSet> {
    const [row] = await db.insert(schema.comparisonSets).values(set).returning();
    return row;
  }
  async deleteComparisonSet(id: number): Promise<boolean> {
    const res = await db.delete(schema.comparisonSets)
      .where(eq(schema.comparisonSets.id, id))
      .returning({ id: schema.comparisonSets.id });
    return res.length > 0;
  }

  // ─── Object category operations ──────────────────────────────────────────────
  async getObjectCategories(): Promise<ObjectCategory[]> {
    return db.query.objectCategories.findMany({
      orderBy: (t, { asc }) => [asc(t.sortOrder), asc(t.name)],
    });
  }
  async getObjectCategory(id: number): Promise<ObjectCategory | undefined> {
    return db.query.objectCategories.findFirst({ where: (t, { eq }) => eq(t.id, id) });
  }
  async getObjectCategoryBySlug(slug: string): Promise<ObjectCategory | undefined> {
    return db.query.objectCategories.findFirst({ where: (t, { eq }) => eq(t.slug, slug) });
  }
  async createObjectCategory(cat: InsertObjectCategory): Promise<ObjectCategory> {
    const [newCat] = await db.insert(schema.objectCategories).values(cat).returning();
    return newCat;
  }
  async updateObjectCategory(id: number, data: Partial<InsertObjectCategory>): Promise<ObjectCategory | undefined> {
    const [updated] = await db.update(schema.objectCategories).set(data).where(eq(schema.objectCategories.id, id)).returning();
    return updated;
  }
  async deleteObjectCategory(id: number): Promise<boolean> {
    const result = await db.delete(schema.objectCategories).where(eq(schema.objectCategories.id, id)).returning();
    return result.length > 0;
  }

  // ─── Soil profile operations ──────────────────────────────────────────────────

  async getSoilProfiles(objectId?: number): Promise<SoilProfile[]> {
    if (objectId !== undefined) {
      return db.query.soilProfiles.findMany({
        where: (t, { eq }) => eq(t.objectId, objectId)
      });
    }
    return db.query.soilProfiles.findMany();
  }

  async getSoilProfile(id: number): Promise<SoilProfile | undefined> {
    return db.query.soilProfiles.findFirst({
      where: (t, { eq }) => eq(t.id, id)
    });
  }

  async getSoilProfileNearCoords(lat: number, lng: number): Promise<SoilProfile | undefined> {
    const all = await db.query.soilProfiles.findMany();
    let nearest: SoilProfile | undefined;
    let minDist = Infinity;
    for (const p of all) {
      if (!p.latitude || !p.longitude) continue;
      const dlat = parseFloat(String(p.latitude)) - lat;
      const dlng = parseFloat(String(p.longitude)) - lng;
      const dist = Math.sqrt(dlat * dlat + dlng * dlng);
      if (dist < minDist) { minDist = dist; nearest = p; }
    }
    return minDist < 0.1 ? nearest : undefined;
  }

  async createSoilProfile(profile: InsertSoilProfile): Promise<SoilProfile> {
    const [newProfile] = await db.insert(schema.soilProfiles).values(profile).returning();
    return newProfile;
  }

  async updateSoilProfile(id: number, data: Partial<InsertSoilProfile>): Promise<SoilProfile | undefined> {
    const [updated] = await db.update(schema.soilProfiles).set(data).where(eq(schema.soilProfiles.id, id)).returning();
    return updated;
  }

  async deleteSoilProfile(id: number): Promise<boolean> {
    const result = await db.delete(schema.soilProfiles).where(eq(schema.soilProfiles.id, id)).returning();
    return result.length > 0;
  }

  async getSoilLayers(profileId: number): Promise<SoilLayer[]> {
    return db.query.soilLayers.findMany({
      where: (t, { eq }) => eq(t.profileId, profileId),
      orderBy: (t, { asc }) => [asc(t.layerNumber)]
    });
  }

  async createSoilLayer(layer: InsertSoilLayer): Promise<SoilLayer> {
    const [newLayer] = await db.insert(schema.soilLayers).values(layer).returning();
    return newLayer;
  }

  async updateSoilLayer(id: number, data: Partial<InsertSoilLayer>): Promise<SoilLayer | undefined> {
    const [updated] = await db.update(schema.soilLayers).set(data).where(eq(schema.soilLayers.id, id)).returning();
    return updated;
  }

  async deleteSoilLayer(id: number): Promise<boolean> {
    const result = await db.delete(schema.soilLayers).where(eq(schema.soilLayers.id, id)).returning();
    return result.length > 0;
  }

  // ─── Sensor installation operations ──────────────────────────────────────────

  async getSensorInstallations(objectId?: number): Promise<SensorInstallation[]> {
    if (objectId !== undefined) {
      return db.query.sensorInstallations.findMany({
        where: (t, { eq }) => eq(t.objectId, objectId)
      });
    }
    return db.query.sensorInstallations.findMany();
  }

  async getSensorInstallation(id: number): Promise<SensorInstallation | undefined> {
    return db.query.sensorInstallations.findFirst({
      where: (t, { eq }) => eq(t.id, id)
    });
  }

  async createSensorInstallation(inst: InsertSensorInstallation): Promise<SensorInstallation> {
    const [newInst] = await db.insert(schema.sensorInstallations).values(inst).returning();
    return newInst;
  }

  async updateSensorInstallation(id: number, data: Partial<InsertSensorInstallation>): Promise<SensorInstallation | undefined> {
    const [updated] = await db
      .update(schema.sensorInstallations)
      .set(data)
      .where(eq(schema.sensorInstallations.id, id))
      .returning();
    return updated;
  }

  async deleteSensorInstallation(id: number): Promise<boolean> {
    const result = await db.delete(schema.sensorInstallations).where(eq(schema.sensorInstallations.id, id)).returning();
    return result.length > 0;
  }

  // ─── Sensor device operations ─────────────────────────────────────────────────

  async getSensors(stationId?: string, objectId?: number): Promise<Sensor[]> {
    if (objectId != null) {
      return db.query.sensors.findMany({
        where: (t, { eq }) => eq(t.objectId, objectId),
        orderBy: (t, { asc }) => [asc(t.floor), asc(t.sensorCode)]
      });
    }
    if (stationId) {
      return db.query.sensors.findMany({
        where: (t, { eq }) => eq(t.stationId, stationId),
        orderBy: (t, { asc }) => [asc(t.sensorCode)]
      });
    }
    return db.query.sensors.findMany({ orderBy: (t, { asc }) => [asc(t.stationId), asc(t.sensorCode)] });
  }

  async getSensor(id: number): Promise<Sensor | undefined> {
    return db.query.sensors.findFirst({ where: (t, { eq }) => eq(t.id, id) });
  }

  async getSensorBySensorCode(code: string): Promise<Sensor | undefined> {
    return db.query.sensors.findFirst({ where: (t, { eq }) => eq(t.sensorCode, code) });
  }

  async createSensor(sensor: InsertSensor): Promise<Sensor> {
    const [row] = await db.insert(schema.sensors).values(sensor).returning();
    return row;
  }

  async updateSensor(id: number, data: Partial<InsertSensor>): Promise<Sensor | undefined> {
    const [row] = await db.update(schema.sensors).set(data).where(eq(schema.sensors.id, id)).returning();
    return row;
  }

  async deleteSensor(id: number): Promise<boolean> {
    const result = await db.delete(schema.sensors).where(eq(schema.sensors.id, id)).returning();
    return result.length > 0;
  }

  // ─── Building norms operations ────────────────────────────────────────────────

  async getBuildingNorms(category?: string): Promise<BuildingNorm[]> {
    if (category) {
      return db.query.buildingNorms.findMany({
        where: (t, { eq }) => eq(t.category, category),
        orderBy: (t, { asc }) => [asc(t.shortCode)]
      });
    }
    return db.query.buildingNorms.findMany({
      orderBy: (t, { asc }) => [asc(t.category), asc(t.shortCode)]
    });
  }

  async getBuildingNorm(id: number): Promise<BuildingNorm | undefined> {
    return db.query.buildingNorms.findFirst({
      where: (t, { eq }) => eq(t.id, id)
    });
  }

  async getBuildingNormByCode(code: string): Promise<BuildingNorm | undefined> {
    return db.query.buildingNorms.findFirst({
      where: (t, { eq }) => eq(t.code, code)
    });
  }

  async createBuildingNorm(norm: InsertBuildingNorm): Promise<BuildingNorm> {
    const [newNorm] = await db.insert(schema.buildingNorms).values(norm).returning();
    return newNorm;
  }

  // ─── Seismogram record operations ─────────────────────────────────────────────

  async getSeismogramRecords(stationId?: string, limit: number = 50): Promise<SeismogramRecord[]> {
    if (stationId) {
      return db.query.seismogramRecords.findMany({
        where: (t, { eq }) => eq(t.stationId, stationId),
        orderBy: (t, { desc }) => [desc(t.startTime)],
        limit
      });
    }
    return db.query.seismogramRecords.findMany({
      orderBy: (t, { desc }) => [desc(t.startTime)],
      limit
    });
  }

  async getSeismogramRecord(id: number): Promise<SeismogramRecord | undefined> {
    return db.query.seismogramRecords.findFirst({
      where: (t, { eq }) => eq(t.id, id)
    });
  }

  async createSeismogramRecord(record: InsertSeismogramRecord): Promise<SeismogramRecord> {
    const [newRecord] = await db.insert(schema.seismogramRecords).values(record).returning();
    return newRecord;
  }

  async updateSeismogramProcessingStatus(id: number, status: string): Promise<SeismogramRecord | undefined> {
    const [updated] = await db
      .update(schema.seismogramRecords)
      .set({ processingStatus: status })
      .where(eq(schema.seismogramRecords.id, id))
      .returning();
    return updated;
  }

  // ─── Calibration session operations ────────────────────────────────────────

  async getCalibrationSessions(installationId?: number): Promise<CalibrationSession[]> {
    if (installationId !== undefined) {
      return db.query.calibrationSessions.findMany({
        where: (t, { eq }) => eq(t.installationId, installationId),
        orderBy: (t, { desc }) => [desc(t.sessionDate)]
      });
    }
    return db.query.calibrationSessions.findMany({
      orderBy: (t, { desc }) => [desc(t.sessionDate)]
    });
  }

  async getCalibrationSession(id: number): Promise<CalibrationSession | undefined> {
    return db.query.calibrationSessions.findFirst({
      where: (t, { eq }) => eq(t.id, id)
    });
  }

  async createCalibrationSession(session: InsertCalibrationSession): Promise<CalibrationSession> {
    const [newSession] = await db.insert(schema.calibrationSessions).values(session).returning();
    return newSession;
  }

  async updateCalibrationSession(id: number, data: Partial<InsertCalibrationSession>): Promise<CalibrationSession | undefined> {
    const [updated] = await db
      .update(schema.calibrationSessions)
      .set(data)
      .where(eq(schema.calibrationSessions.id, id))
      .returning();
    return updated;
  }

  async deleteCalibrationSession(id: number): Promise<boolean> {
    await db.delete(schema.calibrationAfc).where(eq(schema.calibrationAfc.sessionId, id));
    const result = await db.delete(schema.calibrationSessions).where(eq(schema.calibrationSessions.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // ─── AFC operations ─────────────────────────────────────────────────────────

  async getCalibrationAfc(sessionId: number): Promise<CalibrationAfc[]> {
    return db.query.calibrationAfc.findMany({
      where: (t, { eq }) => eq(t.sessionId, sessionId),
      orderBy: (t, { asc }) => [asc(t.frequency)]
    });
  }

  async createCalibrationAfcPoint(point: InsertCalibrationAfc): Promise<CalibrationAfc> {
    const [newPoint] = await db.insert(schema.calibrationAfc).values(point).returning();
    return newPoint;
  }

  async deleteCalibrationAfcPoint(id: number): Promise<boolean> {
    const result = await db.delete(schema.calibrationAfc).where(eq(schema.calibrationAfc.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async replaceCalibrationAfc(sessionId: number, points: InsertCalibrationAfc[]): Promise<CalibrationAfc[]> {
    await db.delete(schema.calibrationAfc).where(eq(schema.calibrationAfc.sessionId, sessionId));
    if (points.length === 0) return [];
    const inserted = await db.insert(schema.calibrationAfc)
      .values(points.map(p => ({ ...p, sessionId })))
      .returning();
    return inserted;
  }
}

// Export the database storage
export const storage = new DatabaseStorage();
