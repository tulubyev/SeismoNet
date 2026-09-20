import type { Alert, AuditLog, BuildingNorm, CalculationNoteHistory, CalibrationAfc, CalibrationSession, ComparisonSet, Customer, Developer, Event, InfrastructureObject, InsertAlert, InsertAuditLog, InsertBuildingNorm, InsertCalculationNoteHistory, InsertCalibrationAfc, InsertCalibrationSession, InsertComparisonSet, InsertCustomer, InsertDeveloper, InsertEvent, InsertInfrastructureObject, InsertMaintenanceRecord, InsertObjectCategory, InsertRegion, InsertResearchNetwork, InsertSeismicCalculation, InsertSeismogramRecord, InsertSensor, InsertSensorInstallation, InsertSoilLayer, InsertSoilProfile, InsertStation, InsertSystemStatus, InsertUser, InsertWaveformData, MaintenanceRecord, ObjectCategory, Region, ResearchNetwork, SeismicCalculation, SeismogramRecord, Sensor, SensorInstallation, SoilLayer, SoilProfile, Station, SystemStatus, User, WaveformData, waveformData } from "@shared/schema";
import type { Role } from "@shared/permissions";

const _rawNoteHistoryLimit = Number(process.env.NOTE_HISTORY_LIMIT);
export const NOTE_HISTORY_LIMIT =
  Number.isInteger(_rawNoteHistoryLimit) && _rawNoteHistoryLimit >= 1
    ? _rawNoteHistoryLimit
    : 50;

/**
 * Per-request row filter. `customerId === null` = all customers (superadmin only).
 * `objectIds` narrows further for `staff` (only bound infrastructure objects).
 */
export type Scope = { customerId: number | null; objectIds?: number[] };
/** @deprecated transitional alias, removed once every storage file takes `Scope`. */
export type ObjectScope = Scope;

// Interface for storage operations

export interface IStorage {
  // User operations
  getUsers(scope: Scope): Promise<User[]>;
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
  getStations(scope: Scope): Promise<Station[]>;
  getStationsByRegionId(regionId: number, scope: Scope): Promise<Station[]>;
  getStation(id: number, scope: Scope): Promise<Station | undefined>;
  getStationByStationId(stationId: string, scope: Scope): Promise<Station | undefined>;
  createStation(station: InsertStation, customerId: number): Promise<Station>;
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
  getMaintenanceRecords(stationId: string, scope: Scope): Promise<MaintenanceRecord[]>;
  getMaintenanceRecord(id: number, scope: Scope): Promise<MaintenanceRecord | undefined>;
  createMaintenanceRecord(record: InsertMaintenanceRecord): Promise<MaintenanceRecord>;
  updateMaintenanceStatus(id: number, status: string): Promise<MaintenanceRecord | undefined>;
  getUpcomingMaintenanceRecords(days: number, scope: Scope): Promise<MaintenanceRecord[]>;
  
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
  getAlerts(limit: number, scope: Scope): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  markAlertAsRead(id: number, scope: Scope): Promise<Alert | undefined>;
  markAllAlertsAsRead(scope: Scope): Promise<void>;

  // Infrastructure object operations
  getInfrastructureObjects(scope: Scope): Promise<InfrastructureObject[]>;
  getInfrastructureObject(id: number, scope: Scope): Promise<InfrastructureObject | undefined>;
  getInfrastructureObjectByObjectId(objectId: string, scope: Scope): Promise<InfrastructureObject | undefined>;
  createInfrastructureObject(obj: InsertInfrastructureObject, customerId: number): Promise<InfrastructureObject>;
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
  getSoilProfiles(objectId: number | undefined, scope: Scope): Promise<SoilProfile[]>;
  getSoilProfile(id: number, scope: Scope): Promise<SoilProfile | undefined>;
  getSoilProfileNearCoords(lat: number, lng: number, scope: Scope): Promise<SoilProfile | undefined>;
  createSoilProfile(profile: InsertSoilProfile, customerId: number): Promise<SoilProfile>;
  updateSoilProfile(id: number, data: Partial<InsertSoilProfile>): Promise<SoilProfile | undefined>;
  deleteSoilProfile(id: number): Promise<boolean>;
  getSoilLayers(profileId: number): Promise<SoilLayer[]>;
  getSoilLayer(id: number, scope: Scope): Promise<SoilLayer | undefined>;
  createSoilLayer(layer: InsertSoilLayer): Promise<SoilLayer>;
  updateSoilLayer(id: number, data: Partial<InsertSoilLayer>): Promise<SoilLayer | undefined>;
  deleteSoilLayer(id: number): Promise<boolean>;

  // Sensor installation operations
  getSensorInstallations(objectId: number | undefined, scope: Scope): Promise<SensorInstallation[]>;
  getSensorInstallation(id: number, scope: Scope): Promise<SensorInstallation | undefined>;
  createSensorInstallation(inst: InsertSensorInstallation): Promise<SensorInstallation>;
  updateSensorInstallation(id: number, data: Partial<InsertSensorInstallation>): Promise<SensorInstallation | undefined>;
  deleteSensorInstallation(id: number): Promise<boolean>;

  // Sensor device operations
  getSensors(stationId: string | undefined, objectId: number | undefined, scope: Scope): Promise<Sensor[]>;
  getSensor(id: number, scope: Scope): Promise<Sensor | undefined>;
  getSensorBySensorCode(code: string, scope: Scope): Promise<Sensor | undefined>;
  createSensor(sensor: InsertSensor, customerId: number): Promise<Sensor>;
  updateSensor(id: number, data: Partial<InsertSensor>): Promise<Sensor | undefined>;
  deleteSensor(id: number): Promise<boolean>;

  // Building norms operations
  getBuildingNorms(category?: string): Promise<BuildingNorm[]>;
  getBuildingNorm(id: number): Promise<BuildingNorm | undefined>;
  getBuildingNormByCode(code: string): Promise<BuildingNorm | undefined>;
  createBuildingNorm(norm: InsertBuildingNorm): Promise<BuildingNorm>;

  // Seismogram record operations
  getSeismogramRecords(stationId: string | undefined, limit: number, scope: Scope): Promise<SeismogramRecord[]>;
  getSeismogramRecord(id: number, scope: Scope): Promise<SeismogramRecord | undefined>;
  createSeismogramRecord(record: InsertSeismogramRecord): Promise<SeismogramRecord>;
  updateSeismogramProcessingStatus(id: number, status: string): Promise<SeismogramRecord | undefined>;

  // Calibration session operations
  getCalibrationSessions(installationId: number | undefined, scope: Scope): Promise<CalibrationSession[]>;
  getCalibrationSession(id: number, scope: Scope): Promise<CalibrationSession | undefined>;
  createCalibrationSession(session: InsertCalibrationSession, customerId: number): Promise<CalibrationSession>;
  updateCalibrationSession(id: number, data: Partial<InsertCalibrationSession>): Promise<CalibrationSession | undefined>;
  deleteCalibrationSession(id: number): Promise<boolean>;

  // AFC data operations
  getCalibrationAfc(sessionId: number): Promise<CalibrationAfc[]>;
  getCalibrationAfcPoint(id: number, scope: Scope): Promise<CalibrationAfc | undefined>;
  createCalibrationAfcPoint(point: InsertCalibrationAfc): Promise<CalibrationAfc>;
  deleteCalibrationAfcPoint(id: number): Promise<boolean>;
  replaceCalibrationAfc(sessionId: number, points: InsertCalibrationAfc[]): Promise<CalibrationAfc[]>;

  // Developer operations
  getDevelopers(scope: Scope): Promise<Developer[]>;
  getDeveloper(id: number, scope: Scope): Promise<Developer | undefined>;
  getDeveloperByName(name: string, scope: Scope): Promise<Developer | undefined>;
  createDeveloper(dev: InsertDeveloper, customerId: number): Promise<Developer>;
  updateDeveloper(id: number, data: Partial<InsertDeveloper>): Promise<Developer | undefined>;
  deleteDeveloper(id: number): Promise<boolean>;

  // Seismic calculation operations
  getSeismicCalculations(calcType: string | undefined, limit: number, scope: Scope): Promise<SeismicCalculation[]>;
  getSeismicCalculation(id: number, scope: Scope): Promise<SeismicCalculation | undefined>;
  createSeismicCalculation(calc: InsertSeismicCalculation, customerId: number): Promise<SeismicCalculation>;
  updateSeismicCalculation(id: number, data: Partial<Pick<InsertSeismicCalculation, 'notes'>> & { notesUpdatedBy?: string | null }): Promise<SeismicCalculation | undefined>;
  deleteSeismicCalculation(id: number): Promise<boolean>;

  // Calculation note history
  getCalculationNoteHistory(calculationId: number): Promise<CalculationNoteHistory[]>;
  createCalculationNoteHistory(entry: InsertCalculationNoteHistory): Promise<CalculationNoteHistory>;

  // Saved comparison set operations
  getComparisonSets(scope: Scope): Promise<ComparisonSet[]>;
  getComparisonSet(id: number, scope: Scope): Promise<ComparisonSet | undefined>;
  createComparisonSet(set: InsertComparisonSet, customerId: number): Promise<ComparisonSet>;
  deleteComparisonSet(id: number): Promise<boolean>;

  // Audit log
  logAudit(entry: InsertAuditLog): Promise<void>;
  getAuditLog(limit: number): Promise<AuditLog[]>;

  // Customers
  getCustomers(): Promise<Customer[]>;
  getCustomer(id: number): Promise<Customer | undefined>;
  getCustomerByCode(code: string): Promise<Customer | undefined>;
  createCustomer(c: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, data: Partial<InsertCustomer>): Promise<Customer | undefined>;
  countCustomerRows(id: number): Promise<{ objects: number; users: number }>;
}
