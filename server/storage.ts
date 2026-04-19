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
  SoilProfile,
  InsertSoilProfile,
  SoilLayer,
  InsertSoilLayer,
  SensorInstallation,
  InsertSensorInstallation,
  BuildingNorm,
  InsertBuildingNorm,
  SeismogramRecord,
  InsertSeismogramRecord
} from "@shared/schema";

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

  // Infrastructure object operations
  getInfrastructureObjects(): Promise<InfrastructureObject[]>;
  getInfrastructureObject(id: number): Promise<InfrastructureObject | undefined>;
  getInfrastructureObjectByObjectId(objectId: string): Promise<InfrastructureObject | undefined>;
  createInfrastructureObject(obj: InsertInfrastructureObject): Promise<InfrastructureObject>;
  updateInfrastructureObject(id: number, data: Partial<InsertInfrastructureObject>): Promise<InfrastructureObject | undefined>;

  // Soil profile operations
  getSoilProfiles(objectId?: number): Promise<SoilProfile[]>;
  getSoilProfile(id: number): Promise<SoilProfile | undefined>;
  createSoilProfile(profile: InsertSoilProfile): Promise<SoilProfile>;
  getSoilLayers(profileId: number): Promise<SoilLayer[]>;
  createSoilLayer(layer: InsertSoilLayer): Promise<SoilLayer>;

  // Sensor installation operations
  getSensorInstallations(objectId?: number): Promise<SensorInstallation[]>;
  getSensorInstallation(id: number): Promise<SensorInstallation | undefined>;
  createSensorInstallation(inst: InsertSensorInstallation): Promise<SensorInstallation>;
  updateSensorInstallation(id: number, data: Partial<InsertSensorInstallation>): Promise<SensorInstallation | undefined>;

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
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private stations: Map<number, Station>;
  private events: Map<number, Event>;
  private waveformData: Map<number, WaveformData>;
  private researchNetworks: Map<number, ResearchNetwork>;
  private systemStatuses: Map<number, SystemStatus>;
  private alerts: Map<number, Alert>;
  
  private currentUserId: number;
  private currentStationId: number;
  private currentEventId: number;
  private currentWaveformDataId: number;
  private currentNetworkId: number;
  private currentStatusId: number;
  private currentAlertId: number;
  
  constructor() {
    this.users = new Map();
    this.stations = new Map();
    this.events = new Map();
    this.waveformData = new Map();
    this.researchNetworks = new Map();
    this.systemStatuses = new Map();
    this.alerts = new Map();
    
    this.currentUserId = 1;
    this.currentStationId = 1;
    this.currentEventId = 1;
    this.currentWaveformDataId = 1;
    this.currentNetworkId = 1;
    this.currentStatusId = 1;
    this.currentAlertId = 1;
    
    // Initialize with sample data
    this.initializeData();
  }
  
  private initializeData() {
    // Initialize users
    const sampleUsers: InsertUser[] = [
      {
        username: "admin",
        fullName: "System Administrator",
        email: "admin@seismic-network.org",
        password: "password", // User-requested plain password
        role: "administrator",
        active: true,
        organization: "Seismic Network Research Center",
        jobTitle: "Network Administrator",
        specialization: "System Administration"
      },
      {
        username: "fieldtech",
        fullName: "Field Technician",
        email: "fieldtech@seismic-network.org",
        password: "password", // Standard password for testing
        role: "user",
        active: true,
        organization: "Seismic Network Research Center",
        jobTitle: "Field Technician",
        specialization: "Station Maintenance"
      },
      {
        username: "researcher",
        fullName: "Seismic Researcher",
        email: "researcher@seismic-network.org",
        password: "password", // In a real system, this would be hashed
        role: "viewer",
        active: true,
        organization: "University Research Institute",
        jobTitle: "Researcher",
        specialization: "Seismic Analysis"
      }
    ];
    
    sampleUsers.forEach(user => this.createUser(user));
    
    // Initialize stations
    const sampleStations: InsertStation[] = [
      {
        stationId: "PNWST-03",
        name: "Pacific Northwest Station 03",
        location: "Seattle, WA",
        latitude: "47.6062",
        longitude: "-122.3321",
        status: "online",
        lastUpdate: new Date(),
        dataRate: 1.2,
        configuration: {}
      },
      {
        stationId: "SOCAL-12",
        name: "Southern California Station 12",
        location: "Los Angeles, CA",
        latitude: "34.0522",
        longitude: "-118.2437",
        status: "online",
        lastUpdate: new Date(),
        dataRate: 1.5,
        configuration: {}
      },
      {
        stationId: "ALASKA-07",
        name: "Alaska Station 07",
        location: "Anchorage, AK",
        latitude: "61.2181",
        longitude: "-149.9003",
        status: "degraded",
        lastUpdate: new Date(),
        dataRate: 0.8,
        configuration: {}
      },
      {
        stationId: "FIJI-01",
        name: "Fiji Station 01",
        location: "Suva, Fiji",
        latitude: "-18.1134",
        longitude: "178.4253",
        status: "online",
        lastUpdate: new Date(),
        dataRate: 1.0,
        configuration: {}
      }
    ];
    
    sampleStations.forEach(station => this.createStation(station));
    
    // Initialize events
    const sampleEvents: InsertEvent[] = [
      {
        eventId: "EV-20230801-001",
        region: "South Pacific Region",
        location: "Fiji Islands",
        latitude: "-18.1134",
        longitude: "178.4253",
        depth: 45.3,
        magnitude: 5.7,
        type: "earthquake",
        status: "verified",
        timestamp: new Date(Date.now() - 12 * 60 * 1000), // 12 minutes ago
        calculationConfidence: 94,
        data: {}
      },
      {
        eventId: "EV-20230801-002",
        region: "Aleutian Islands",
        location: "Alaska, USA",
        latitude: "52.5200",
        longitude: "-171.9027",
        depth: 28.7,
        magnitude: 4.2,
        type: "earthquake",
        status: "verified",
        timestamp: new Date(Date.now() - 38 * 60 * 1000), // 38 minutes ago
        calculationConfidence: 92,
        data: {}
      },
      {
        eventId: "EV-20230801-003",
        region: "Baja California",
        location: "Mexico",
        latitude: "30.2672",
        longitude: "-115.7528",
        depth: 12.4,
        magnitude: 3.8,
        type: "earthquake",
        status: "verified",
        timestamp: new Date(Date.now() - 72 * 60 * 1000), // 1 hour 12 minutes ago
        calculationConfidence: 89,
        data: {}
      },
      {
        eventId: "EV-20230801-004",
        region: "Central Italy",
        location: "Perugia Province",
        latitude: "43.0962",
        longitude: "12.3861",
        depth: 5.8,
        magnitude: 2.6,
        type: "earthquake",
        status: "verified",
        timestamp: new Date(Date.now() - 155 * 60 * 1000), // 2 hours 35 minutes ago
        calculationConfidence: 87,
        data: {}
      }
    ];
    
    sampleEvents.forEach(event => this.createEvent(event));
    
    // Initialize research networks
    const sampleNetworks: InsertResearchNetwork[] = [
      {
        networkId: "USGS",
        name: "USGS Network",
        region: "United States",
        connectionStatus: "connected",
        lastSyncTimestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        syncedDataVolume: 86.2,
        apiEndpoint: "https://earthquake.usgs.gov/fdsnws/event/1/"
      },
      {
        networkId: "EMSC",
        name: "EMSC",
        region: "European-Mediterranean",
        connectionStatus: "connected",
        lastSyncTimestamp: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
        syncedDataVolume: 74.5,
        apiEndpoint: "https://www.seismicportal.eu/fdsnws/event/1/"
      },
      {
        networkId: "NIED",
        name: "NIED Network",
        region: "Japan",
        connectionStatus: "connected",
        lastSyncTimestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
        syncedDataVolume: 58.1,
        apiEndpoint: "https://www.hinet.bosai.go.jp/"
      },
      {
        networkId: "JMA",
        name: "Japan Meteorological Agency",
        region: "Japan",
        connectionStatus: "connected",
        lastSyncTimestamp: new Date(Date.now() - 3 * 60 * 1000), // 3 minutes ago
        syncedDataVolume: 93.7,
        apiEndpoint: "https://www.jma.go.jp/bosai/quake/data/list.json"
      },
      {
        networkId: "GFZ",
        name: "GFZ Network",
        region: "Germany",
        connectionStatus: "syncing",
        lastSyncTimestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        syncedDataVolume: 28.0,
        apiEndpoint: "https://geofon.gfz-potsdam.de/eqinfo/list.php"
      }
    ];
    
    sampleNetworks.forEach(network => this.createResearchNetwork(network));
    
    // Initialize system status
    const sampleStatuses: InsertSystemStatus[] = [
      {
        component: "Data Processing",
        status: "Excellent",
        value: 98,
        timestamp: new Date(),
        message: "Data processing system running optimally"
      },
      {
        component: "Network Connectivity",
        status: "Good",
        value: 94,
        timestamp: new Date(),
        message: "Network connectivity stable"
      },
      {
        component: "Storage Capacity",
        status: "Moderate",
        value: 72,
        timestamp: new Date(),
        message: "Storage capacity at 72%, consider cleanup"
      },
      {
        component: "API Performance",
        status: "Good",
        value: 89,
        timestamp: new Date(),
        message: "API performance within expected parameters"
      }
    ];
    
    sampleStatuses.forEach(status => this.createSystemStatus(status));
    
    // Initialize alerts
    const sampleAlerts: InsertAlert[] = [
      {
        alertType: "connection_timeout",
        severity: "warning",
        message: "Connection timeout on SOCAL-15",
        timestamp: new Date(Date.now() - 24 * 60 * 1000), // 24 minutes ago
        relatedEntityId: "SOCAL-15",
        relatedEntityType: "station",
        isRead: false
      },
      {
        alertType: "station_offline",
        severity: "danger",
        message: "ALASKA-09 station offline",
        timestamp: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        relatedEntityId: "ALASKA-09",
        relatedEntityType: "station",
        isRead: false
      },
      {
        alertType: "scheduled_maintenance",
        severity: "info",
        message: "Scheduled maintenance for HAWAII cluster",
        timestamp: new Date(Date.now() - 120 * 60 * 1000), // 2 hours ago
        relatedEntityId: "HAWAII",
        relatedEntityType: "cluster",
        isRead: true
      }
    ];
    
    sampleAlerts.forEach(alert => this.createAlert(alert));
  }
  
  // User operations
  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    console.log(`[MemStorage] Looking for user: ${username}`);
    console.log(`[MemStorage] Available users: ${Array.from(this.users.values()).map(u => u.username).join(', ')}`);
    console.log(`[MemStorage] Admin user password: ${Array.from(this.users.values()).find(u => u.username === 'admin')?.password}`);
    
    const user = Array.from(this.users.values()).find(
      (user) => user.username === username
    );
    
    if (user) {
      console.log(`[MemStorage] Found user: ${username}, password: ${user.password}`);
    } else {
      console.log(`[MemStorage] User not found: ${username}`);
    }
    
    return user;
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email
    );
  }
  
  async createUser(user: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const now = new Date();
    const newUser: User = {
      ...user,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.users.set(id, newUser);
    return newUser;
  }
  
  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (user) {
      const updatedUser: User = {
        ...user,
        ...userData,
        updatedAt: new Date()
      };
      this.users.set(id, updatedUser);
      return updatedUser;
    }
    return undefined;
  }
  
  async updateUserRole(id: number, role: 'administrator' | 'user' | 'viewer'): Promise<User | undefined> {
    return this.updateUser(id, { role });
  }
  
  async updateUserStatus(id: number, active: boolean): Promise<User | undefined> {
    return this.updateUser(id, { active });
  }
  
  // Station operations
  async getStations(): Promise<Station[]> {
    return Array.from(this.stations.values());
  }
  
  async getStation(id: number): Promise<Station | undefined> {
    return this.stations.get(id);
  }
  
  async getStationByStationId(stationId: string): Promise<Station | undefined> {
    return Array.from(this.stations.values()).find(
      (station) => station.stationId === stationId
    );
  }
  
  async createStation(station: InsertStation): Promise<Station> {
    const id = this.currentStationId++;
    const newStation: Station = { ...station, id };
    this.stations.set(id, newStation);
    return newStation;
  }
  
  async updateStationStatus(stationId: string, status: string): Promise<Station | undefined> {
    const station = await this.getStationByStationId(stationId);
    if (station) {
      const updatedStation: Station = {
        ...station,
        status,
        lastUpdate: new Date()
      };
      this.stations.set(station.id, updatedStation);
      return updatedStation;
    }
    return undefined;
  }
  
  // Event operations
  async getEvents(): Promise<Event[]> {
    return Array.from(this.events.values());
  }
  
  async getRecentEvents(limit: number): Promise<Event[]> {
    return Array.from(this.events.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
  
  async getEvent(id: number): Promise<Event | undefined> {
    return this.events.get(id);
  }
  
  async getEventByEventId(eventId: string): Promise<Event | undefined> {
    return Array.from(this.events.values()).find(
      (event) => event.eventId === eventId
    );
  }
  
  async createEvent(event: InsertEvent): Promise<Event> {
    const id = this.currentEventId++;
    const newEvent: Event = { ...event, id };
    this.events.set(id, newEvent);
    return newEvent;
  }
  
  async updateEventStatus(eventId: string, status: string): Promise<Event | undefined> {
    const event = await this.getEventByEventId(eventId);
    if (event) {
      const updatedEvent: Event = {
        ...event,
        status
      };
      this.events.set(event.id, updatedEvent);
      return updatedEvent;
    }
    return undefined;
  }
  
  // Waveform data operations
  async getWaveformData(stationId: string, limit: number): Promise<WaveformData[]> {
    return Array.from(this.waveformData.values())
      .filter(data => data.stationId === stationId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
  
  async createWaveformData(waveformData: InsertWaveformData): Promise<WaveformData> {
    const id = this.currentWaveformDataId++;
    const newWaveformData: WaveformData = { ...waveformData, id };
    this.waveformData.set(id, newWaveformData);
    return newWaveformData;
  }
  
  // Research network operations
  async getResearchNetworks(): Promise<ResearchNetwork[]> {
    return Array.from(this.researchNetworks.values());
  }
  
  async getResearchNetwork(id: number): Promise<ResearchNetwork | undefined> {
    return this.researchNetworks.get(id);
  }
  
  async getResearchNetworkByNetworkId(networkId: string): Promise<ResearchNetwork | undefined> {
    return Array.from(this.researchNetworks.values()).find(
      (network) => network.networkId === networkId
    );
  }
  
  async createResearchNetwork(network: InsertResearchNetwork): Promise<ResearchNetwork> {
    const id = this.currentNetworkId++;
    const newNetwork: ResearchNetwork = { ...network, id };
    this.researchNetworks.set(id, newNetwork);
    return newNetwork;
  }
  
  async updateResearchNetworkStatus(
    networkId: string, 
    status: string, 
    dataVolume?: number
  ): Promise<ResearchNetwork | undefined> {
    const network = await this.getResearchNetworkByNetworkId(networkId);
    if (network) {
      const updatedNetwork: ResearchNetwork = {
        ...network,
        connectionStatus: status,
        lastSyncTimestamp: new Date(),
        syncedDataVolume: dataVolume !== undefined ? dataVolume : network.syncedDataVolume
      };
      this.researchNetworks.set(network.id, updatedNetwork);
      return updatedNetwork;
    }
    return undefined;
  }
  
  // System status operations
  async getSystemStatus(): Promise<SystemStatus[]> {
    return Array.from(this.systemStatuses.values());
  }
  
  async createSystemStatus(status: InsertSystemStatus): Promise<SystemStatus> {
    const id = this.currentStatusId++;
    const newStatus: SystemStatus = { ...status, id };
    this.systemStatuses.set(id, newStatus);
    return newStatus;
  }
  
  // Alert operations
  async getAlerts(limit: number): Promise<Alert[]> {
    return Array.from(this.alerts.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
  
  async createAlert(alert: InsertAlert): Promise<Alert> {
    const id = this.currentAlertId++;
    const newAlert: Alert = { ...alert, id };
    this.alerts.set(id, newAlert);
    return newAlert;
  }
  
  async markAlertAsRead(id: number): Promise<Alert | undefined> {
    const alert = this.alerts.get(id);
    if (alert) {
      const updatedAlert: Alert = { ...alert, isRead: true };
      this.alerts.set(id, updatedAlert);
      return updatedAlert;
    }
    return undefined;
  }

  // ─── Stub implementations for new Irkutsk entities (MemStorage) ───────────

  async getInfrastructureObjects(): Promise<InfrastructureObject[]> { return []; }
  async getInfrastructureObject(_id: number): Promise<InfrastructureObject | undefined> { return undefined; }
  async getInfrastructureObjectByObjectId(_objectId: string): Promise<InfrastructureObject | undefined> { return undefined; }
  async createInfrastructureObject(obj: InsertInfrastructureObject): Promise<InfrastructureObject> {
    return { ...obj, id: 1, createdAt: new Date(), updatedAt: new Date() } as unknown as InfrastructureObject;
  }
  async updateInfrastructureObject(_id: number, _data: Partial<InsertInfrastructureObject>): Promise<InfrastructureObject | undefined> { return undefined; }

  async getSoilProfiles(_objectId?: number): Promise<SoilProfile[]> { return []; }
  async getSoilProfile(_id: number): Promise<SoilProfile | undefined> { return undefined; }
  async createSoilProfile(profile: InsertSoilProfile): Promise<SoilProfile> {
    return { ...profile, id: 1, createdAt: new Date() } as unknown as SoilProfile;
  }
  async getSoilLayers(_profileId: number): Promise<SoilLayer[]> { return []; }
  async createSoilLayer(layer: InsertSoilLayer): Promise<SoilLayer> {
    return { ...layer, id: 1 } as unknown as SoilLayer;
  }

  async getSensorInstallations(_objectId?: number): Promise<SensorInstallation[]> { return []; }
  async getSensorInstallation(_id: number): Promise<SensorInstallation | undefined> { return undefined; }
  async createSensorInstallation(inst: InsertSensorInstallation): Promise<SensorInstallation> {
    return { ...inst, id: 1 } as unknown as SensorInstallation;
  }
  async updateSensorInstallation(_id: number, _data: Partial<InsertSensorInstallation>): Promise<SensorInstallation | undefined> { return undefined; }

  async getBuildingNorms(_category?: string): Promise<BuildingNorm[]> { return []; }
  async getBuildingNorm(_id: number): Promise<BuildingNorm | undefined> { return undefined; }
  async getBuildingNormByCode(_code: string): Promise<BuildingNorm | undefined> { return undefined; }
  async createBuildingNorm(norm: InsertBuildingNorm): Promise<BuildingNorm> {
    return { ...norm, id: 1, createdAt: new Date() } as unknown as BuildingNorm;
  }

  async getSeismogramRecords(_stationId?: string, _limit?: number): Promise<SeismogramRecord[]> { return []; }
  async getSeismogramRecord(_id: number): Promise<SeismogramRecord | undefined> { return undefined; }
  async createSeismogramRecord(record: InsertSeismogramRecord): Promise<SeismogramRecord> {
    return { ...record, id: 1, createdAt: new Date() } as unknown as SeismogramRecord;
  }
  async updateSeismogramProcessingStatus(_id: number, _status: string): Promise<SeismogramRecord | undefined> { return undefined; }
}

import { db } from './db';
import { eq, desc, and, gt, lte } from 'drizzle-orm';
import { schema } from './db';
import {
  users, regions, stations, events, waveformData, researchNetworks,
  systemStatus, alerts, maintenanceRecords,
  infrastructureObjects, soilProfiles, soilLayers, sensorInstallations,
  buildingNorms, seismogramRecords
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

  async createSoilProfile(profile: InsertSoilProfile): Promise<SoilProfile> {
    const [newProfile] = await db.insert(schema.soilProfiles).values(profile).returning();
    return newProfile;
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
}

// Initialize storage with sample data and export
const initializeDatabase = async () => {
  const dbStorage = new DatabaseStorage();
  
  // Check if there's already data in the database
  const existingUsers = await dbStorage.getUsers();
  const existingStations = await dbStorage.getStations();
  
  // Initialize users if none exist
  if (existingUsers.length === 0) {
    console.log('Initializing users...');
    
    // Sample users for different roles
    const sampleUsers: InsertUser[] = [
      {
        username: "admin",
        fullName: "System Administrator",
        email: "admin@seismic-network.org",
        password: "password", // In a real system, this would be hashed
        role: "administrator",
        active: true,
        organization: "Seismic Network Research Center",
        jobTitle: "Network Administrator",
        specialization: "System Administration"
      },
      {
        username: "fieldtech",
        fullName: "Field Technician",
        email: "fieldtech@seismic-network.org",
        password: "tech123", // In a real system, this would be hashed
        role: "user",
        active: true,
        organization: "Seismic Network Research Center",
        jobTitle: "Field Technician",
        specialization: "Station Maintenance"
      },
      {
        username: "researcher",
        fullName: "Seismic Researcher",
        email: "researcher@seismic-network.org",
        password: "password", // In a real system, this would be hashed
        role: "viewer",
        active: true,
        organization: "University Research Institute",
        jobTitle: "Researcher",
        specialization: "Seismic Analysis"
      }
    ];
    
    for (const user of sampleUsers) {
      await dbStorage.createUser(user);
    }
  }
  
  if (existingStations.length === 0) {
    console.log('Initializing database with sample data...');
    
    // Sample regions
    const sampleRegions: InsertRegion[] = [
      {
        name: "Pacific Northwest",
        description: "Cascadia Subduction Zone Region",
        centerLatitude: "47.6062",
        centerLongitude: "-122.3321",
        radiusKm: 500,
        createdAt: new Date()
      },
      {
        name: "Southern California",
        description: "San Andreas Fault Region",
        centerLatitude: "34.0522",
        centerLongitude: "-118.2437",
        radiusKm: 300,
        createdAt: new Date()
      },
      {
        name: "Alaska",
        description: "Aleutian Islands Region",
        centerLatitude: "61.2181",
        centerLongitude: "-149.9003",
        radiusKm: 800,
        createdAt: new Date()
      },
      {
        name: "South Pacific",
        description: "Fiji and Surrounding Islands",
        centerLatitude: "-18.1134",
        centerLongitude: "178.4253",
        radiusKm: 1000,
        createdAt: new Date()
      }
    ];
    
    // Create regions first
    const regionMap = new Map<string, number>();
    for (const region of sampleRegions) {
      const createdRegion = await dbStorage.createRegion(region);
      regionMap.set(region.name, createdRegion.id);
    }
    
    // Sample stations with field operations data
    const sampleStations: InsertStation[] = [
      {
        stationId: "PNWST-03",
        name: "Pacific Northwest Station 03",
        location: "Seattle, WA",
        latitude: "47.6062",
        longitude: "-122.3321",
        status: "online",
        lastUpdate: new Date(),
        dataRate: 1.2,
        regionId: regionMap.get("Pacific Northwest"),
        
        // Field operations data
        batteryLevel: 87,
        batteryVoltage: 12.8,
        powerConsumption: 3.2,
        solarCharging: 5.1,
        
        // Hardware details
        serialNumber: "PNW-2023-03458",
        firmwareVersion: "v2.1.5",
        hardwareModel: "Seismic-Pro X3",
        installationDate: new Date(2023, 3, 15), // April 15, 2023
        
        // Calibration data
        sensorsCalibrated: true,
        lastCalibrationDate: new Date(2023, 8, 10), // September 10, 2023
        nextCalibrationDue: new Date(2024, 2, 10), // March 10, 2024
        
        storageRemaining: 78,
        connectionStrength: 92,
        configuration: {
          samplingRate: 100,
          triggerThreshold: 0.02,
          filterSettings: {
            lowPass: 40,
            highPass: 0.1
          }
        }
      },
      {
        stationId: "SOCAL-12",
        name: "Southern California Station 12",
        location: "Los Angeles, CA",
        latitude: "34.0522",
        longitude: "-118.2437",
        status: "online",
        lastUpdate: new Date(),
        dataRate: 1.5,
        regionId: regionMap.get("Southern California"),
        
        // Field operations data
        batteryLevel: 65,
        batteryVoltage: 11.9,
        powerConsumption: 4.1,
        solarCharging: 4.2,
        
        // Hardware details
        serialNumber: "SOCAL-2022-12874",
        firmwareVersion: "v2.0.8",
        hardwareModel: "Seismic-Pro X2",
        installationDate: new Date(2022, 6, 22), // July 22, 2022
        
        // Calibration data
        sensorsCalibrated: true,
        lastCalibrationDate: new Date(2023, 5, 18), // June 18, 2023
        nextCalibrationDue: new Date(2023, 11, 18), // December 18, 2023
        
        storageRemaining: 52,
        connectionStrength: 88,
        configuration: {
          samplingRate: 120,
          triggerThreshold: 0.015,
          filterSettings: {
            lowPass: 45,
            highPass: 0.08
          }
        }
      },
      {
        stationId: "ALASKA-07",
        name: "Alaska Station 07",
        location: "Anchorage, AK",
        latitude: "61.2181",
        longitude: "-149.9003",
        status: "degraded",
        lastUpdate: new Date(),
        dataRate: 0.8,
        regionId: regionMap.get("Alaska"),
        
        // Field operations data (showing degraded performance)
        batteryLevel: 41,
        batteryVoltage: 10.8,
        powerConsumption: 3.9,
        solarCharging: 2.1,
        
        // Hardware details
        serialNumber: "AK-2023-00792",
        firmwareVersion: "v2.1.2",
        hardwareModel: "Seismic-Pro X3 Arctic",
        installationDate: new Date(2023, 1, 8), // February 8, 2023
        
        // Calibration data
        sensorsCalibrated: false,
        lastCalibrationDate: new Date(2023, 1, 5), // February 5, 2023
        
        storageRemaining: 34,
        connectionStrength: 51,
        configuration: {
          samplingRate: 100,
          triggerThreshold: 0.025,
          filterSettings: {
            lowPass: 40,
            highPass: 0.1
          },
          arcticMode: true,
          heatingElement: "enabled"
        }
      },
      {
        stationId: "FIJI-01",
        name: "Fiji Station 01",
        location: "Suva, Fiji",
        latitude: "-18.1134",
        longitude: "178.4253",
        status: "online",
        lastUpdate: new Date(),
        dataRate: 1.0,
        regionId: regionMap.get("South Pacific"),
        
        // Field operations data
        batteryLevel: 92,
        batteryVoltage: 13.2,
        powerConsumption: 2.8,
        solarCharging: 6.5,
        
        // Hardware details
        serialNumber: "SP-2023-05189",
        firmwareVersion: "v2.1.5",
        hardwareModel: "Seismic-Pro X3 Tropical",
        installationDate: new Date(2023, 0, 12), // January 12, 2023
        
        // Calibration data
        sensorsCalibrated: true,
        lastCalibrationDate: new Date(2023, 7, 28), // August 28, 2023
        nextCalibrationDue: new Date(2024, 1, 28), // February 28, 2024
        
        storageRemaining: 85,
        connectionStrength: 78,
        configuration: {
          samplingRate: 100,
          triggerThreshold: 0.018,
          filterSettings: {
            lowPass: 40,
            highPass: 0.1
          },
          humidityProtection: "enhanced",
          waterproofing: "IPX8"
        }
      }
    ];
    
    for (const station of sampleStations) {
      await dbStorage.createStation(station);
    }
    
    // Sample events
    const sampleEvents: InsertEvent[] = [
      {
        eventId: "EV-20230801-001",
        region: "South Pacific Region",
        location: "Fiji Islands",
        latitude: "-18.1134",
        longitude: "178.4253",
        depth: 45.3,
        magnitude: 5.7,
        type: "earthquake",
        status: "verified",
        timestamp: new Date(Date.now() - 12 * 60 * 1000), // 12 minutes ago
        calculationConfidence: 94,
        data: {}
      },
      {
        eventId: "EV-20230801-002",
        region: "Aleutian Islands",
        location: "Alaska, USA",
        latitude: "52.5200",
        longitude: "-171.9027",
        depth: 28.7,
        magnitude: 4.2,
        type: "earthquake",
        status: "verified",
        timestamp: new Date(Date.now() - 38 * 60 * 1000), // 38 minutes ago
        calculationConfidence: 92,
        data: {}
      },
      {
        eventId: "EV-20230801-003",
        region: "Baja California",
        location: "Mexico",
        latitude: "30.2672",
        longitude: "-115.7528",
        depth: 12.4,
        magnitude: 3.8,
        type: "earthquake",
        status: "verified",
        timestamp: new Date(Date.now() - 72 * 60 * 1000), // 1 hour 12 minutes ago
        calculationConfidence: 89,
        data: {}
      },
      {
        eventId: "EV-20230801-004",
        region: "Central Italy",
        location: "Perugia Province",
        latitude: "43.0962",
        longitude: "12.3861",
        depth: 5.8,
        magnitude: 2.6,
        type: "earthquake",
        status: "verified",
        timestamp: new Date(Date.now() - 155 * 60 * 1000), // 2 hours 35 minutes ago
        calculationConfidence: 87,
        data: {}
      }
    ];
    
    for (const event of sampleEvents) {
      await dbStorage.createEvent(event);
    }
    
    // Sample research networks
    const sampleNetworks: InsertResearchNetwork[] = [
      {
        networkId: "USGS",
        name: "USGS Network",
        region: "United States",
        connectionStatus: "connected",
        lastSyncTimestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        syncedDataVolume: 86.2,
        apiEndpoint: "https://earthquake.usgs.gov/fdsnws/event/1/"
      },
      {
        networkId: "EMSC",
        name: "EMSC",
        region: "European-Mediterranean",
        connectionStatus: "connected",
        lastSyncTimestamp: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
        syncedDataVolume: 74.5,
        apiEndpoint: "https://www.seismicportal.eu/fdsnws/event/1/"
      },
      {
        networkId: "NIED",
        name: "NIED Network",
        region: "Japan",
        connectionStatus: "connected",
        lastSyncTimestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
        syncedDataVolume: 58.1,
        apiEndpoint: "https://www.hinet.bosai.go.jp/"
      },
      {
        networkId: "GFZ",
        name: "GFZ Network",
        region: "Germany",
        connectionStatus: "syncing",
        lastSyncTimestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        syncedDataVolume: 28.0,
        apiEndpoint: "https://geofon.gfz-potsdam.de/eqinfo/list.php"
      }
    ];
    
    for (const network of sampleNetworks) {
      await dbStorage.createResearchNetwork(network);
    }
    
    // Sample system status
    const sampleStatuses: InsertSystemStatus[] = [
      {
        component: "Data Processing",
        status: "Excellent",
        value: 98,
        timestamp: new Date(),
        message: "Data processing system running optimally"
      },
      {
        component: "Network Connectivity",
        status: "Good",
        value: 94,
        timestamp: new Date(),
        message: "Network connectivity stable"
      },
      {
        component: "Storage Capacity",
        status: "Moderate",
        value: 72,
        timestamp: new Date(),
        message: "Storage capacity at 72%, consider cleanup"
      },
      {
        component: "API Performance",
        status: "Good",
        value: 89,
        timestamp: new Date(),
        message: "API performance within expected parameters"
      }
    ];
    
    for (const status of sampleStatuses) {
      await dbStorage.createSystemStatus(status);
    }
    
    // Sample alerts
    const sampleAlerts: InsertAlert[] = [
      {
        alertType: "connection_timeout",
        severity: "warning",
        message: "Connection timeout on SOCAL-15",
        timestamp: new Date(Date.now() - 24 * 60 * 1000), // 24 minutes ago
        relatedEntityId: "SOCAL-15",
        relatedEntityType: "station",
        isRead: false
      },
      {
        alertType: "station_offline",
        severity: "danger",
        message: "ALASKA-09 station offline",
        timestamp: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        relatedEntityId: "ALASKA-09",
        relatedEntityType: "station",
        isRead: false
      },
      {
        alertType: "scheduled_maintenance",
        severity: "info",
        message: "Scheduled maintenance for HAWAII cluster",
        timestamp: new Date(Date.now() - 120 * 60 * 1000), // 2 hours ago
        relatedEntityId: "HAWAII",
        relatedEntityType: "cluster",
        isRead: true
      },
      {
        alertType: "low_battery",
        severity: "warning",
        message: "Low battery on ALASKA-07 station (41%)",
        timestamp: new Date(Date.now() - 180 * 60 * 1000), // 3 hours ago
        relatedEntityId: "ALASKA-07",
        relatedEntityType: "station",
        isRead: false
      },
      {
        alertType: "calibration_due",
        severity: "info", 
        message: "Calibration due for SOCAL-12 station",
        timestamp: new Date(Date.now() - 200 * 60 * 1000), // 3 hours 20 minutes ago
        relatedEntityId: "SOCAL-12",
        relatedEntityType: "station",
        isRead: false
      }
    ];
    
    for (const alert of sampleAlerts) {
      await dbStorage.createAlert(alert);
    }
    
    // Sample maintenance records
    const sampleMaintenanceRecords: InsertMaintenanceRecord[] = [
      {
        stationId: "PNWST-03",
        maintenanceType: "calibration",
        performedBy: "John Smith",
        performedAt: new Date(2023, 8, 10), // September 10, 2023
        status: "completed",
        description: "Regular 6-month calibration",
        findings: "Sensors were within acceptable parameters, minor adjustment to vertical sensor",
        partsReplaced: JSON.stringify([]),
        batteryReplaced: false,
        calibrationPerformed: true,
        firmwareUpdated: true,
        nextMaintenanceDue: new Date(2024, 2, 10), // March 10, 2024
        notes: "Station is in excellent condition, no issues found"
      },
      {
        stationId: "SOCAL-12",
        maintenanceType: "calibration",
        performedBy: "Maria Garcia",
        performedAt: new Date(2023, 5, 18), // June 18, 2023
        status: "completed",
        description: "Regular 6-month calibration",
        findings: "Sensors required recalibration, horizontal sensor drift corrected",
        partsReplaced: JSON.stringify(["Weather shield", "Communication cable"]),
        batteryReplaced: false,
        calibrationPerformed: true,
        firmwareUpdated: true,
        nextMaintenanceDue: new Date(2023, 11, 18), // December 18, 2023
        notes: "Station needed cleaning due to dust accumulation"
      },
      {
        stationId: "SOCAL-12",
        maintenanceType: "battery",
        performedBy: "David Chen",
        performedAt: new Date(2023, 2, 8), // March 8, 2023
        status: "completed",
        description: "Scheduled battery replacement",
        findings: "Old battery was at 40% of original capacity",
        partsReplaced: JSON.stringify(["Main battery"]),
        batteryReplaced: true,
        calibrationPerformed: false,
        firmwareUpdated: false,
        notes: "Replaced with higher capacity battery model"
      },
      {
        stationId: "ALASKA-07",
        maintenanceType: "repair",
        performedBy: "Robert Johnson",
        performedAt: new Date(2023, 4, 22), // May 22, 2023
        status: "completed",
        description: "Emergency maintenance - communication failure",
        findings: "Communication module damaged by water ingress",
        partsReplaced: JSON.stringify(["Communication module", "Weather seals", "External antenna"]),
        batteryReplaced: false,
        calibrationPerformed: false,
        firmwareUpdated: true,
        notes: "Additional waterproofing measures implemented"
      },
      {
        stationId: "ALASKA-07",
        maintenanceType: "calibration",
        performedBy: "Sarah Williams",
        scheduledAt: new Date(2023, 11, 15), // December 15, 2023
        status: "scheduled",
        description: "Urgent calibration and system check",
        notes: "Priority maintenance due to degraded performance"
      },
      {
        stationId: "FIJI-01",
        maintenanceType: "upgrade",
        performedBy: "James Taylor",
        performedAt: new Date(2023, 7, 28), // August 28, 2023
        status: "completed",
        description: "Hardware and firmware upgrade",
        findings: "Successfully upgraded to latest specifications",
        partsReplaced: JSON.stringify(["Processing unit", "Data storage module"]),
        batteryReplaced: false,
        calibrationPerformed: true,
        firmwareUpdated: true,
        nextMaintenanceDue: new Date(2024, 1, 28), // February 28, 2024
        notes: "Full system upgrade completed, improved data processing capabilities"
      },
      {
        stationId: "PNWST-03", 
        maintenanceType: "inspection",
        performedBy: "Michelle Thompson",
        scheduledAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days in the future
        status: "scheduled",
        description: "Routine quarterly inspection",
        notes: "Check solar panel efficiency and network connectivity"
      }
    ];
    
    for (const record of sampleMaintenanceRecords) {
      await dbStorage.createMaintenanceRecord(record);
    }
    
    console.log('Database initialization complete.');
  }

  // ── Seed Irkutsk infrastructure objects ──────────────────────────────────────
  const existingObjects = await dbStorage.getInfrastructureObjects();
  if (existingObjects.length === 0) {
    console.log('Seeding Irkutsk infrastructure objects...');

    const irkutskObjects: InsertInfrastructureObject[] = [
      {
        objectId: "IRK-OBJ-001",
        name: "Администрация г. Иркутска",
        address: "ул. Ленина, 14, Иркутск",
        objectType: "admin",
        constructionYear: 1956,
        floors: 5,
        latitude: "52.2901",
        longitude: "104.2964",
        structuralSystem: "masonry",
        foundationType: "strip",
        seismicCategory: "II",
        designIntensity: 7,
        technicalCondition: "satisfactory",
        description: "Здание городской администрации, кирпичная кладка",
        responsibleOrganization: "Администрация г. Иркутска",
        isMonitored: true,
        metadata: {}
      },
      {
        objectId: "IRK-OBJ-002",
        name: "Мост через р. Ушаковка (ул. Байкальская)",
        address: "ул. Байкальская, Иркутск",
        objectType: "bridge",
        constructionYear: 1978,
        floors: null,
        latitude: "52.2756",
        longitude: "104.3312",
        structuralSystem: "reinforced_concrete",
        foundationType: "pile",
        seismicCategory: "I",
        designIntensity: 8,
        technicalCondition: "satisfactory",
        description: "Железобетонный мост, пролёт 45 м",
        responsibleOrganization: "ДСИО г. Иркутска",
        isMonitored: true,
        metadata: {}
      },
      {
        objectId: "IRK-OBJ-003",
        name: "Иркутская ГЭС",
        address: "г. Иркутск, Правый берег Ангары",
        objectType: "industrial",
        constructionYear: 1958,
        floors: null,
        latitude: "52.3127",
        longitude: "104.2218",
        structuralSystem: "reinforced_concrete",
        foundationType: "slab",
        seismicCategory: "I",
        designIntensity: 8,
        technicalCondition: "good",
        description: "Гидроэлектростанция на р. Ангара, стратегический объект",
        responsibleOrganization: "ПАО «ЕН+ Груп»",
        isMonitored: true,
        metadata: {}
      },
      {
        objectId: "IRK-OBJ-004",
        name: "БГМУ — Корпус А",
        address: "ул. Красного Восстания, 1, Иркутск",
        objectType: "hospital",
        constructionYear: 1965,
        floors: 6,
        latitude: "52.2813",
        longitude: "104.2782",
        structuralSystem: "reinforced_concrete",
        foundationType: "strip",
        seismicCategory: "II",
        designIntensity: 7,
        technicalCondition: "satisfactory",
        description: "Главный корпус Байкальского медицинского университета",
        responsibleOrganization: "ФГБОУ ВО ИГМУ Минздрава России",
        isMonitored: false,
        metadata: {}
      },
      {
        objectId: "IRK-OBJ-005",
        name: "Жилой дом — ул. Депутатская, 44",
        address: "ул. Депутатская, 44, Иркутск",
        objectType: "residential",
        constructionYear: 1982,
        floors: 9,
        latitude: "52.2685",
        longitude: "104.3148",
        structuralSystem: "reinforced_concrete",
        foundationType: "pile",
        seismicCategory: "III",
        designIntensity: 7,
        technicalCondition: "satisfactory",
        description: "9-этажный панельный жилой дом серии 97",
        responsibleOrganization: "УК «Уют»",
        isMonitored: false,
        metadata: {}
      }
    ];

    for (const obj of irkutskObjects) {
      await dbStorage.createInfrastructureObject(obj);
    }
  }

  // ── Seed building norms ───────────────────────────────────────────────────────
  const existingNorms = await dbStorage.getBuildingNorms();
  if (existingNorms.length === 0) {
    console.log('Seeding building norms...');

    const norms: InsertBuildingNorm[] = [
      {
        code: "SP14.13330.2018",
        shortCode: "СП 14.13330.2018",
        name: "Строительство в сейсмических районах",
        fullName: "СП 14.13330.2018 Строительство в сейсмических районах. Актуализированная редакция СНиП II-7-81*",
        category: "seismic",
        adoptionYear: 2018,
        status: "active",
        supersedes: "СНиП II-7-81*",
        description: "Основной нормативный документ для проектирования зданий и сооружений в сейсмических районах. Регламентирует требования к конструктивным решениям, материалам и расчётным методам.",
        scope: "Здания и сооружения, возводимые в районах с расчётной сейсмичностью 6, 7, 8 и 9 баллов по шкале MSK-64",
        keyParameters: {
          intensityZones: [6, 7, 8, 9],
          soilCategories: {
            "I": "Vs > 700 м/с (скальные грунты)",
            "II": "250 < Vs ≤ 700 м/с (плотные связные грунты)",
            "III": "150 < Vs ≤ 250 м/с (пески средние, суглинки)",
            "IV": "Vs ≤ 150 м/с (слабые грунты)"
          },
          amplificationCoefficients: {
            "I": 1.0,
            "II": 1.2,
            "III": 1.5,
            "IV": 2.0
          },
          irkutskIntensity: 7
        },
        sections: [
          "Область применения",
          "Нормативные ссылки",
          "Термины и определения",
          "Общие требования",
          "Грунты и основания",
          "Требования к конструктивным решениям",
          "Расчёт на сейсмические воздействия",
          "Инженерно-сейсмологические изыскания"
        ],
        url: "https://docs.cntd.ru/document/554402540"
      },
      {
        code: "SP20.13330.2017",
        shortCode: "СП 20.13330.2017",
        name: "Нагрузки и воздействия",
        fullName: "СП 20.13330.2017 Нагрузки и воздействия. Актуализированная редакция СНиП 2.01.07-85*",
        category: "loads",
        adoptionYear: 2017,
        status: "active",
        supersedes: "СНиП 2.01.07-85*",
        description: "Устанавливает нагрузки и воздействия, которые необходимо учитывать при проектировании строительных конструкций. Включает сейсмические, ветровые, снеговые и временные нагрузки.",
        scope: "Несущие и ограждающие конструкции зданий и сооружений",
        keyParameters: {
          loadTypes: ["постоянные", "временные длительные", "кратковременные", "особые"],
          seismicLoadFactor: 1.0,
          dynamicFactor: "по расчёту",
          combinationCoefficients: { "psi1": 0.95, "psi2": 0.9 }
        },
        sections: [
          "Классификация нагрузок",
          "Постоянные нагрузки",
          "Временные нагрузки",
          "Сейсмические воздействия",
          "Ветровые нагрузки",
          "Снеговые нагрузки",
          "Комбинации нагрузок"
        ],
        url: "https://docs.cntd.ru/document/456069568"
      },
      {
        code: "SP47.13330.2016",
        shortCode: "СП 47.13330.2016",
        name: "Инженерные изыскания для строительства",
        fullName: "СП 47.13330.2016 Инженерные изыскания для строительства. Основные положения. Актуализированная редакция СНиП 11-02-96",
        category: "survey",
        adoptionYear: 2016,
        status: "active",
        supersedes: "СНиП 11-02-96",
        description: "Определяет состав, порядок и методы инженерных изысканий для строительства, в том числе инженерно-сейсмологических изысканий в сейсмически активных районах.",
        scope: "Инженерные изыскания для проектирования, строительства и эксплуатации зданий и сооружений",
        keyParameters: {
          surveyTypes: ["инженерно-геодезические", "инженерно-геологические", "инженерно-гидрометеорологические", "инженерно-экологические", "инженерно-сейсмологические"],
          seismicSurveyDepth: "не менее 30 м",
          vs30Method: "сейсмическое зондирование или сдвиговые волны"
        },
        sections: [
          "Виды инженерных изысканий",
          "Инженерно-геологические изыскания",
          "Инженерно-сейсмологические изыскания",
          "Требования к отчётной документации"
        ],
        url: "https://docs.cntd.ru/document/456054212"
      },
      {
        code: "SP22.13330.2016",
        shortCode: "СП 22.13330.2016",
        name: "Основания зданий и сооружений",
        fullName: "СП 22.13330.2016 Основания зданий и сооружений. Актуализированная редакция СНиП 2.02.01-83*",
        category: "foundations",
        adoptionYear: 2016,
        status: "active",
        supersedes: "СНиП 2.02.01-83*",
        description: "Регламентирует проектирование оснований зданий и сооружений. Содержит требования к расчёту оснований при сейсмических воздействиях, учёту нелинейных свойств грунтов.",
        scope: "Проектирование оснований и фундаментов зданий и сооружений",
        keyParameters: {
          soilClassification: "по прочности и деформируемости",
          bearingCapacityFactors: "таблицы В.1–В.3",
          seismicSurcharge: "1,5 при I=8 баллов"
        },
        sections: [
          "Общие требования",
          "Классификация грунтов",
          "Расчёт оснований по несущей способности",
          "Расчёт оснований по деформациям",
          "Основания при сейсмических воздействиях"
        ],
        url: "https://docs.cntd.ru/document/456054016"
      },
      {
        code: "GOST17516-1-90",
        shortCode: "ГОСТ 17516.1-90",
        name: "Виброустойчивость. Классификация",
        fullName: "ГОСТ 17516.1-90 Изделия электротехнические. Условия эксплуатации в части воздействия механических факторов внешней среды",
        category: "monitoring",
        adoptionYear: 1990,
        status: "active",
        supersedes: null,
        description: "Классифицирует условия эксплуатации технических изделий по механическим воздействиям (вибрации, удары, сейсмика). Применяется для сертификации сейсмических датчиков.",
        scope: "Электротехнические изделия, приборы и аппаратура",
        keyParameters: {
          seismicGroups: ["М6", "М7", "М8"],
          accelerationLevels: { "М6": "1g", "М7": "2g", "М8": "5g" }
        },
        sections: [
          "Группы механических воздействий",
          "Параметры вибрации",
          "Параметры удара",
          "Сейсмические воздействия"
        ],
        url: "https://docs.cntd.ru/document/1200009012"
      },
      {
        code: "SP274.1325800.2016",
        shortCode: "СП 274.1325800.2016",
        name: "Сооружения промышленных предприятий в сейсмических районах",
        fullName: "СП 274.1325800.2016 Сооружения промышленных предприятий в сейсмических районах. Правила проектирования",
        category: "seismic",
        adoptionYear: 2016,
        status: "active",
        supersedes: null,
        description: "Устанавливает требования к проектированию производственных зданий и сооружений в сейсмических районах с учётом технологических нагрузок и особых условий эксплуатации.",
        scope: "Производственные здания, сооружения и технологические установки промышленных предприятий",
        keyParameters: {
          dynamicAmplificationFactor: "β = 2,5 при высокочастотных воздействиях",
          structuralImportanceFactor: { "I": 1.5, "II": 1.2, "III": 1.0 },
          equipmentAnchorage: "обязательно при I ≥ 7 баллов"
        },
        sections: [
          "Общие требования",
          "Конструктивные требования",
          "Расчёт на сейсмические воздействия",
          "Технологическое оборудование",
          "Трубопроводы и коммуникации"
        ],
        url: "https://docs.cntd.ru/document/456049362"
      },
      {
        code: "SP31-114-2004",
        shortCode: "СП 31-114-2004",
        name: "Здания жилые и общественные в сейсмических районах",
        fullName: "СП 31-114-2004 Правила проектирования жилых и общественных зданий для строительства в сейсмических районах",
        category: "seismic",
        adoptionYear: 2004,
        status: "active",
        supersedes: null,
        description: "Конкретизирует требования СП 14 применительно к жилым и общественным зданиям. Регламентирует планировочные, конструктивные и противосейсмические мероприятия.",
        scope: "Жилые дома, объекты образования, здравоохранения и культуры в сейсмических районах",
        keyParameters: {
          maxFloorsPerIntensity: { "7 баллов": 12, "8 баллов": 9, "9 баллов": 5 },
          seismicBelts: "обязательны при I ≥ 7 баллов",
          antiseismicJoints: "шаг не более 30 м"
        },
        sections: [
          "Требования к планировке",
          "Конструктивные системы",
          "Фундаменты",
          "Перекрытия и покрытия",
          "Лестничные клетки"
        ],
        url: "https://docs.cntd.ru/document/1200036487"
      }
    ];

    for (const norm of norms) {
      const existing = await dbStorage.getBuildingNormByCode(norm.code);
      if (!existing) {
        await dbStorage.createBuildingNorm(norm);
      }
    }
  }

  // ── Seed Irkutsk stations (replace US stations with Irkutsk ones) ─────────────
  const existingStationsAfter = await dbStorage.getStations();
  const hasIrkutskStation = existingStationsAfter.some(s => s.stationId.startsWith('IRK-'));
  if (!hasIrkutskStation) {
    console.log('Seeding Irkutsk monitoring stations...');

    const irkRegion = await dbStorage.getRegionByName("Иркутск");
    let irkRegionId: number | undefined;
    if (!irkRegion) {
      const r = await dbStorage.createRegion({
        name: "Иркутск",
        description: "Город Иркутск и прилегающие территории",
        centerLatitude: "52.2900",
        centerLongitude: "104.2964",
        radiusKm: 50,
        createdAt: new Date()
      });
      irkRegionId = r.id;
    } else {
      irkRegionId = irkRegion.id;
    }

    const irkStations: InsertStation[] = [
      {
        stationId: "IRK-ST-001",
        name: "Станция «Центр»",
        location: "ул. Ленина, Иркутск",
        latitude: "52.2897",
        longitude: "104.2963",
        status: "online",
        lastUpdate: new Date(),
        dataRate: 100,
        regionId: irkRegionId,
        batteryLevel: 89,
        batteryVoltage: 12.6,
        powerConsumption: 2.8,
        serialNumber: "IRK-2024-001",
        firmwareVersion: "v3.0.1",
        hardwareModel: "СМ-3КВ",
        installationDate: new Date(2024, 0, 15),
        sensorsCalibrated: true,
        lastCalibrationDate: new Date(2024, 2, 10),
        nextCalibrationDue: new Date(2024, 8, 10),
        storageRemaining: 75,
        connectionStrength: 95,
        configuration: { samplingRate: 100, triggerThreshold: 0.01, channels: ["Z", "NS", "EW"] }
      },
      {
        stationId: "IRK-ST-002",
        name: "Станция «ГЭС»",
        location: "Иркутская ГЭС",
        latitude: "52.3127",
        longitude: "104.2218",
        status: "online",
        lastUpdate: new Date(),
        dataRate: 100,
        regionId: irkRegionId,
        batteryLevel: 94,
        batteryVoltage: 12.9,
        powerConsumption: 3.1,
        serialNumber: "IRK-2024-002",
        firmwareVersion: "v3.0.1",
        hardwareModel: "СМ-3КВ",
        installationDate: new Date(2024, 1, 20),
        sensorsCalibrated: true,
        lastCalibrationDate: new Date(2024, 2, 15),
        nextCalibrationDue: new Date(2024, 8, 15),
        storageRemaining: 82,
        connectionStrength: 98,
        configuration: { samplingRate: 100, triggerThreshold: 0.005, channels: ["Z", "NS", "EW"] }
      },
      {
        stationId: "IRK-ST-003",
        name: "Станция «Мост»",
        location: "Мост через р. Ушаковка",
        latitude: "52.2756",
        longitude: "104.3312",
        status: "online",
        lastUpdate: new Date(),
        dataRate: 100,
        regionId: irkRegionId,
        batteryLevel: 77,
        batteryVoltage: 12.2,
        powerConsumption: 2.5,
        serialNumber: "IRK-2024-003",
        firmwareVersion: "v3.0.1",
        hardwareModel: "СМ-3КВ",
        installationDate: new Date(2024, 2, 5),
        sensorsCalibrated: true,
        lastCalibrationDate: new Date(2024, 2, 20),
        nextCalibrationDue: new Date(2024, 8, 20),
        storageRemaining: 68,
        connectionStrength: 87,
        configuration: { samplingRate: 100, triggerThreshold: 0.008, channels: ["Z", "NS", "EW"] }
      },
      {
        stationId: "IRK-ST-004",
        name: "Станция «Академгородок»",
        location: "мкр. Академгородок, Иркутск",
        latitude: "52.2604",
        longitude: "104.2481",
        status: "degraded",
        lastUpdate: new Date(),
        dataRate: 60,
        regionId: irkRegionId,
        batteryLevel: 45,
        batteryVoltage: 11.2,
        powerConsumption: 2.9,
        serialNumber: "IRK-2024-004",
        firmwareVersion: "v3.0.0",
        hardwareModel: "СМ-3КВ",
        installationDate: new Date(2024, 2, 10),
        sensorsCalibrated: false,
        storageRemaining: 41,
        connectionStrength: 62,
        configuration: { samplingRate: 100, triggerThreshold: 0.01, channels: ["Z", "NS", "EW"] }
      }
    ];

    for (const st of irkStations) {
      const exists = await dbStorage.getStationByStationId(st.stationId);
      if (!exists) {
        await dbStorage.createStation(st);
      }
    }
  }

  // ── Seed sensor installations ──────────────────────────────────────────────────
  const existingInstallations = await dbStorage.getSensorInstallations();
  if (existingInstallations.length === 0) {
    console.log('Seeding sensor installations...');

    // Get seeded objects by objectId
    const objAdmin  = await dbStorage.getInfrastructureObjectByObjectId('IRK-OBJ-001');
    const objBridge = await dbStorage.getInfrastructureObjectByObjectId('IRK-OBJ-002');
    const objGES    = await dbStorage.getInfrastructureObjectByObjectId('IRK-OBJ-003');
    const objBGMU   = await dbStorage.getInfrastructureObjectByObjectId('IRK-OBJ-004');

    if (objAdmin) {
      const installs: InsertSensorInstallation[] = [
        {
          stationId: 'IRK-ST-001',
          objectId: objAdmin.id,
          installationLocation: 'foundation',
          floor: null,
          measurementAxes: 'Z,NS,EW',
          installationDate: new Date(2024, 0, 15),
          isActive: true,
          calibrationDate: new Date(2024, 2, 10),
          sensorType: 'seismometer',
          sensitivity: 28.8,
          frequencyRange: '0.1-50 Hz',
          notes: 'Фундаментный датчик, установка в приямке под перекрытием 1-го этажа',
        },
        {
          stationId: 'IRK-ST-001',
          objectId: objAdmin.id,
          installationLocation: 'ground_floor',
          floor: 1,
          measurementAxes: 'Z,NS,EW',
          installationDate: new Date(2024, 0, 15),
          isActive: true,
          calibrationDate: new Date(2024, 2, 10),
          sensorType: 'accelerometer',
          sensitivity: 5.0,
          frequencyRange: '0-100 Hz',
          notes: 'Акселерометр на уровне 1-го этажа',
        },
        {
          stationId: 'IRK-ST-001',
          objectId: objAdmin.id,
          installationLocation: 'roof',
          floor: 5,
          measurementAxes: 'Z,NS,EW',
          installationDate: new Date(2024, 0, 15),
          isActive: true,
          calibrationDate: new Date(2024, 2, 10),
          sensorType: 'accelerometer',
          sensitivity: 5.0,
          frequencyRange: '0-100 Hz',
          notes: 'Кровельный датчик для оценки отклика верхнего этажа',
        },
      ];
      for (const inst of installs) {
        await dbStorage.createSensorInstallation(inst);
      }
    }

    if (objBridge) {
      const installs: InsertSensorInstallation[] = [
        {
          stationId: 'IRK-ST-003',
          objectId: objBridge.id,
          installationLocation: 'foundation',
          floor: null,
          measurementAxes: 'Z,NS,EW',
          installationDate: new Date(2024, 2, 5),
          isActive: true,
          calibrationDate: new Date(2024, 2, 20),
          sensorType: 'seismometer',
          sensitivity: 28.8,
          frequencyRange: '0.1-50 Hz',
          notes: 'Датчик у опоры моста, подводное крепление',
        },
        {
          stationId: 'IRK-ST-003',
          objectId: objBridge.id,
          installationLocation: 'mid_floor',
          floor: null,
          measurementAxes: 'Z,NS,EW',
          installationDate: new Date(2024, 2, 5),
          isActive: true,
          calibrationDate: new Date(2024, 2, 20),
          sensorType: 'accelerometer',
          sensitivity: 5.0,
          frequencyRange: '0-100 Hz',
          notes: 'Датчик в середине пролёта на пролётном строении',
        },
        {
          stationId: 'IRK-ST-003',
          objectId: objBridge.id,
          installationLocation: 'free_field',
          floor: null,
          measurementAxes: 'Z,NS,EW',
          installationDate: new Date(2024, 2, 5),
          isActive: true,
          calibrationDate: new Date(2024, 2, 20),
          sensorType: 'seismometer',
          sensitivity: 28.8,
          frequencyRange: '0.1-50 Hz',
          notes: 'Референсный датчик свободного поля в 30 м от моста',
        },
      ];
      for (const inst of installs) {
        await dbStorage.createSensorInstallation(inst);
      }
    }

    if (objGES) {
      const installs: InsertSensorInstallation[] = [
        {
          stationId: 'IRK-ST-002',
          objectId: objGES.id,
          installationLocation: 'foundation',
          floor: null,
          measurementAxes: 'Z,NS,EW',
          installationDate: new Date(2024, 1, 20),
          isActive: true,
          calibrationDate: new Date(2024, 2, 15),
          sensorType: 'seismometer',
          sensitivity: 28.8,
          frequencyRange: '0.1-50 Hz',
          notes: 'Установлен в основании плотины, кессон',
        },
        {
          stationId: 'IRK-ST-002',
          objectId: objGES.id,
          installationLocation: 'roof',
          floor: null,
          measurementAxes: 'Z,NS,EW',
          installationDate: new Date(2024, 1, 20),
          isActive: true,
          calibrationDate: new Date(2024, 2, 15),
          sensorType: 'accelerometer',
          sensitivity: 5.0,
          frequencyRange: '0-100 Hz',
          notes: 'Гребень плотины, верхняя отметка',
        },
        {
          stationId: 'IRK-ST-002',
          objectId: objGES.id,
          installationLocation: 'free_field',
          floor: null,
          measurementAxes: 'Z,NS,EW',
          installationDate: new Date(2024, 1, 20),
          isActive: true,
          calibrationDate: new Date(2024, 2, 15),
          sensorType: 'seismometer',
          sensitivity: 28.8,
          frequencyRange: '0.1-50 Hz',
          notes: 'Референсный датчик на берегу Ангары',
        },
      ];
      for (const inst of installs) {
        await dbStorage.createSensorInstallation(inst);
      }
    }

    if (objBGMU) {
      const installs: InsertSensorInstallation[] = [
        {
          stationId: 'IRK-ST-004',
          objectId: objBGMU.id,
          installationLocation: 'foundation',
          floor: null,
          measurementAxes: 'Z,NS,EW',
          installationDate: new Date(2024, 2, 10),
          isActive: false,
          sensorType: 'accelerometer',
          sensitivity: 5.0,
          frequencyRange: '0-100 Hz',
          notes: 'Плановое техническое обслуживание, датчик временно отключён',
        },
        {
          stationId: 'IRK-ST-004',
          objectId: objBGMU.id,
          installationLocation: 'mid_floor',
          floor: 3,
          measurementAxes: 'Z,NS,EW',
          installationDate: new Date(2024, 2, 10),
          isActive: true,
          sensorType: 'accelerometer',
          sensitivity: 5.0,
          frequencyRange: '0-100 Hz',
          notes: '3-й этаж, коридор у лифтовой шахты',
        },
      ];
      for (const inst of installs) {
        await dbStorage.createSensorInstallation(inst);
      }
    }
  }

  console.log('Database initialization complete.');
  
  return dbStorage;
};

// Export the database storage
export const storage = new DatabaseStorage();

// Initialize database (this will be called when the server starts)
initializeDatabase().catch(error => {
  console.error('Failed to initialize database:', error);
});
