import type { Alert, AuditLog, BuildingNorm, CalculationNoteHistory, CalibrationAfc, CalibrationSession, ComparisonSet, Developer, Event, InfrastructureObject, InsertAlert, InsertAuditLog, InsertBuildingNorm, InsertCalculationNoteHistory, InsertCalibrationAfc, InsertCalibrationSession, InsertComparisonSet, InsertDeveloper, InsertEvent, InsertInfrastructureObject, InsertMaintenanceRecord, InsertObjectCategory, InsertRegion, InsertResearchNetwork, InsertSeismicCalculation, InsertSeismogramRecord, InsertSensor, InsertSensorInstallation, InsertSoilLayer, InsertSoilProfile, InsertStation, InsertSystemStatus, InsertUser, InsertWaveformData, MaintenanceRecord, ObjectCategory, Region, ResearchNetwork, SeismicCalculation, SeismogramRecord, Sensor, SensorInstallation, SoilLayer, SoilProfile, Station, SystemStatus, User, WaveformData, waveformData } from "@shared/schema";
import type { Role } from "@shared/permissions";

const _rawNoteHistoryLimit = Number(process.env.NOTE_HISTORY_LIMIT);
export const NOTE_HISTORY_LIMIT =
  Number.isInteger(_rawNoteHistoryLimit) && _rawNoteHistoryLimit >= 1
    ? _rawNoteHistoryLimit
    : 50;

/** Row filter for the `staff` role: only these infrastructure objects (and things attached to them). undefined = no filter. */
export type ObjectScope = { objectIds: number[] } | undefined;

// Interface for storage operations

export interface IStorage {
  // User operations
  getUsers(): Promise<User[]>;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined>;
  updateUserRole(id: number, role: Role): Promise<User | undefined>;
  updateUserStatus(id: number, active: boolean): Promise<User | undefined>;
  setLastLogin(id: number): Promise<void>;
  bumpSessionEpoch(id: number): Promise<User | undefined>;
  updateUserGuarded(id: number, patch: Partial<InsertUser>): Promise<User | undefined>;

  // User ↔ object binding
  getUserObjectIds(userId: number): Promise<number[]>;
  setUserObjects(userId: number, objectIds: number[]): Promise<void>;

  // Region operations
  getRegions(): Promise<Region[]>;
  getRegion(id: number): Promise<Region | undefined>;
  getRegionByName(name: string): Promise<Region | undefined>;
  createRegion(region: InsertRegion): Promise<Region>;
  
  // Station operations
  getStations(scope?: ObjectScope): Promise<Station[]>;
  getStationsByRegionId(regionId: number, scope?: ObjectScope): Promise<Station[]>;
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
  getInfrastructureObjects(scope?: ObjectScope): Promise<InfrastructureObject[]>;
  getInfrastructureObject(id: number, scope?: ObjectScope): Promise<InfrastructureObject | undefined>;
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
  getSensorInstallations(objectId?: number, scope?: ObjectScope): Promise<SensorInstallation[]>;
  getSensorInstallation(id: number): Promise<SensorInstallation | undefined>;
  createSensorInstallation(inst: InsertSensorInstallation): Promise<SensorInstallation>;
  updateSensorInstallation(id: number, data: Partial<InsertSensorInstallation>): Promise<SensorInstallation | undefined>;
  deleteSensorInstallation(id: number): Promise<boolean>;

  // Sensor device operations
  getSensors(stationId?: string, objectId?: number, scope?: ObjectScope): Promise<Sensor[]>;
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
  getSeismicCalculations(calcType?: string, limit?: number, scope?: ObjectScope): Promise<SeismicCalculation[]>;
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

  // Audit log
  logAudit(entry: InsertAuditLog): Promise<void>;
  getAuditLog(limit: number): Promise<AuditLog[]>;
}
