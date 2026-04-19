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
  BuildingNorm,
  InsertBuildingNorm,
  SeismogramRecord,
  InsertSeismogramRecord,
  CalibrationSession,
  InsertCalibrationSession,
  CalibrationAfc,
  InsertCalibrationAfc,
  Developer,
  InsertDeveloper
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
  private regions: Map<number, Region>;
  private maintenanceRecords: Map<number, MaintenanceRecord>;
  private infrastructureObjects: Map<number, InfrastructureObject>;
  private objectCategories: Map<number, ObjectCategory>;
  private soilProfiles: Map<number, SoilProfile>;
  private soilLayers: Map<number, SoilLayer>;
  private sensorInstallations: Map<number, SensorInstallation>;
  private buildingNorms: Map<number, BuildingNorm>;
  private seismogramRecords: Map<number, SeismogramRecord>;
  private calibrationSessions: Map<number, CalibrationSession>;
  private calibrationAfcPoints: Map<number, CalibrationAfc>;
  private developers: Map<number, Developer>;

  private currentUserId: number;
  private currentStationId: number;
  private currentEventId: number;
  private currentWaveformDataId: number;
  private currentNetworkId: number;
  private currentStatusId: number;
  private currentAlertId: number;
  private currentRegionId: number;
  private currentMaintenanceId: number;
  private currentInfraObjectId: number;
  private currentObjectCategoryId: number;
  private currentSoilProfileId: number;
  private currentSoilLayerId: number;
  private currentSensorInstId: number;
  private currentBuildingNormId: number;
  private currentSeismogramId: number;
  private currentCalibrationSessionId: number;
  private currentCalibrationAfcId: number;
  private currentDeveloperId: number;

  constructor() {
    this.users = new Map();
    this.stations = new Map();
    this.events = new Map();
    this.waveformData = new Map();
    this.researchNetworks = new Map();
    this.systemStatuses = new Map();
    this.alerts = new Map();
    this.regions = new Map();
    this.maintenanceRecords = new Map();
    this.infrastructureObjects = new Map();
    this.objectCategories = new Map();
    this.soilProfiles = new Map();
    this.soilLayers = new Map();
    this.sensorInstallations = new Map();
    this.buildingNorms = new Map();
    this.seismogramRecords = new Map();
    this.calibrationSessions = new Map();
    this.calibrationAfcPoints = new Map();
    this.developers = new Map();

    this.currentUserId = 1;
    this.currentStationId = 1;
    this.currentEventId = 1;
    this.currentWaveformDataId = 1;
    this.currentNetworkId = 1;
    this.currentStatusId = 1;
    this.currentAlertId = 1;
    this.currentRegionId = 1;
    this.currentMaintenanceId = 1;
    this.currentInfraObjectId = 1;
    this.currentObjectCategoryId = 1;
    this.currentSoilProfileId = 1;
    this.currentSoilLayerId = 1;
    this.currentSensorInstId = 1;
    this.currentBuildingNormId = 1;
    this.currentSeismogramId = 1;
    this.currentCalibrationSessionId = 1;
    this.currentCalibrationAfcId = 1;
    this.currentDeveloperId = 1;
    
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
      { stationId:"IRK-ST-001", name:"Станция «Центр»",        location:"ул. Ленина, Иркутск",         latitude:"52.2897", longitude:"104.2963", status:"online",   lastUpdate:new Date(), dataRate:100, batteryLevel:89, firmwareVersion:"v3.1.0", hardwareModel:"СМ-3КВ", configuration:{} },
      { stationId:"IRK-ST-002", name:"Станция «ГЭС»",          location:"Иркутская ГЭС",               latitude:"52.3127", longitude:"104.2218", status:"online",   lastUpdate:new Date(), dataRate:100, batteryLevel:94, firmwareVersion:"v3.1.0", hardwareModel:"СМ-3КВ", configuration:{} },
      { stationId:"IRK-ST-003", name:"Станция «Мост»",         location:"Мост через р. Ушаковка",      latitude:"52.2756", longitude:"104.3312", status:"online",   lastUpdate:new Date(), dataRate:100, batteryLevel:77, firmwareVersion:"v3.1.0", hardwareModel:"СМ-3КВ", configuration:{} },
      { stationId:"IRK-ST-004", name:"Станция «Академгородок»",location:"мкр. Академгородок",          latitude:"52.2604", longitude:"104.2481", status:"degraded", lastUpdate:new Date(), dataRate:60,  batteryLevel:45, firmwareVersion:"v3.0.0", hardwareModel:"СМ-3КВ", configuration:{} },
      { stationId:"IRK-ST-005", name:"Станция «Иркутск-Южный»",location:"пос. Ново-Иркутский",        latitude:"52.2231", longitude:"104.3012", status:"online",   lastUpdate:new Date(), dataRate:100, batteryLevel:82, firmwareVersion:"v3.1.0", hardwareModel:"СМ-3КВ", configuration:{} },
      { stationId:"IRK-ST-006", name:"Станция «Шелехов»",      location:"г. Шелехов",                  latitude:"52.2090", longitude:"104.1010", status:"online",   lastUpdate:new Date(), dataRate:100, batteryLevel:88, firmwareVersion:"v3.1.0", hardwareModel:"СМ-3КВ", configuration:{} },
      { stationId:"IRK-ST-007", name:"Станция «Листвянка»",    location:"пос. Листвянка (береговая)",  latitude:"51.8599", longitude:"104.8736", status:"online",   lastUpdate:new Date(), dataRate:100, batteryLevel:91, firmwareVersion:"v3.1.0", hardwareModel:"СМ-3КВ", configuration:{} },
      { stationId:"IRK-ST-008", name:"Станция «Ангарск»",      location:"г. Ангарск",                  latitude:"52.5397", longitude:"103.8897", status:"offline",  lastUpdate:new Date(Date.now()-3600000), dataRate:0, batteryLevel:12, firmwareVersion:"v3.0.0", hardwareModel:"СМ-3КВ", configuration:{} }
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
        message: "Потеря связи со станцией IRK-ST-008 (Ангарск)",
        timestamp: new Date(Date.now() - 24 * 60 * 1000),
        relatedEntityId: "IRK-ST-008",
        relatedEntityType: "station",
        isRead: false
      },
      {
        alertType: "station_offline",
        severity: "danger",
        message: "Станция IRK-ST-008 не отвечает более 1 часа",
        timestamp: new Date(Date.now() - 60 * 60 * 1000),
        relatedEntityId: "IRK-ST-008",
        relatedEntityType: "station",
        isRead: false
      },
      {
        alertType: "low_battery",
        severity: "info",
        message: "Плановое ТО — станция IRK-ST-004 (Академгородок)",
        timestamp: new Date(Date.now() - 120 * 60 * 1000),
        relatedEntityId: "IRK-ST-004",
        relatedEntityType: "station",
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
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email
    );
  }
  
  async createUser(user: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const now = new Date();
    const newUser = {
      ...user,
      id,
      lastLogin: null,
      createdAt: now,
      updatedAt: now
    } as User;
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
    const newStation = { ...station, id } as Station;
    this.stations.set(id, newStation);
    return newStation;
  }
  
  async updateStation(stationId: string, updates: Partial<Station>): Promise<Station | undefined> {
    const station = await this.getStationByStationId(stationId);
    if (station) {
      const updatedStation: Station = { ...station, ...updates, id: station.id, stationId: station.stationId, lastUpdate: new Date() };
      this.stations.set(station.id, updatedStation);
      return updatedStation;
    }
    return undefined;
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
    const newEvent = { ...event, id } as Event;
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
    const newWaveformData = { ...waveformData, id } as WaveformData;
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
    const newNetwork = { ...network, id } as ResearchNetwork;
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
    const newStatus = { ...status, id } as SystemStatus;
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
    const newAlert = { ...alert, id } as Alert;
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

  // ─── Region operations ─────────────────────────────────────────────────────
  async getRegions(): Promise<Region[]> { return Array.from(this.regions.values()); }
  async getRegion(id: number): Promise<Region | undefined> { return this.regions.get(id); }
  async getRegionByName(name: string): Promise<Region | undefined> {
    return Array.from(this.regions.values()).find(r => r.name === name);
  }
  async createRegion(region: InsertRegion): Promise<Region> {
    const id = this.currentRegionId++;
    const newRegion: Region = { ...region, id } as Region;
    this.regions.set(id, newRegion);
    return newRegion;
  }

  // ─── Maintenance record operations ────────────────────────────────────────
  async getMaintenanceRecords(stationId?: string): Promise<MaintenanceRecord[]> {
    const all = Array.from(this.maintenanceRecords.values());
    return stationId ? all.filter(r => r.stationId === stationId) : all;
  }
  async getMaintenanceRecord(id: number): Promise<MaintenanceRecord | undefined> {
    return this.maintenanceRecords.get(id);
  }
  async createMaintenanceRecord(record: InsertMaintenanceRecord): Promise<MaintenanceRecord> {
    const id = this.currentMaintenanceId++;
    const newRecord: MaintenanceRecord = { ...record, id } as MaintenanceRecord;
    this.maintenanceRecords.set(id, newRecord);
    return newRecord;
  }
  async updateMaintenanceStatus(id: number, status: string): Promise<MaintenanceRecord | undefined> {
    const record = this.maintenanceRecords.get(id);
    if (!record) return undefined;
    const updated: MaintenanceRecord = { ...record, status };
    this.maintenanceRecords.set(id, updated);
    return updated;
  }
  async getUpcomingMaintenanceRecords(days = 30): Promise<MaintenanceRecord[]> {
    const cutoff = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    return Array.from(this.maintenanceRecords.values()).filter(
      r => r.status === 'scheduled' && r.scheduledAt && r.scheduledAt <= cutoff
    );
  }

  // ─── Infrastructure object operations ─────────────────────────────────────
  async getInfrastructureObjects(): Promise<InfrastructureObject[]> {
    return Array.from(this.infrastructureObjects.values());
  }
  async getInfrastructureObject(id: number): Promise<InfrastructureObject | undefined> {
    return this.infrastructureObjects.get(id);
  }
  async getInfrastructureObjectByObjectId(objectId: string): Promise<InfrastructureObject | undefined> {
    return Array.from(this.infrastructureObjects.values()).find(o => o.objectId === objectId);
  }
  async createInfrastructureObject(obj: InsertInfrastructureObject): Promise<InfrastructureObject> {
    const id = this.currentInfraObjectId++;
    const now = new Date();
    const newObj: InfrastructureObject = { ...obj, id, createdAt: now, updatedAt: now } as InfrastructureObject;
    this.infrastructureObjects.set(id, newObj);
    return newObj;
  }
  async updateInfrastructureObject(id: number, data: Partial<InsertInfrastructureObject>): Promise<InfrastructureObject | undefined> {
    const obj = this.infrastructureObjects.get(id);
    if (!obj) return undefined;
    const updated: InfrastructureObject = { ...obj, ...data, updatedAt: new Date() };
    this.infrastructureObjects.set(id, updated);
    return updated;
  }

  async deleteInfrastructureObject(id: number): Promise<boolean> {
    return this.infrastructureObjects.delete(id);
  }

  // ─── Developer operations ─────────────────────────────────────────────────
  async getDevelopers(): Promise<Developer[]> {
    return Array.from(this.developers.values()).sort((a, b) => a.name.localeCompare(b.name));
  }
  async getDeveloper(id: number): Promise<Developer | undefined> {
    return this.developers.get(id);
  }
  async getDeveloperByName(name: string): Promise<Developer | undefined> {
    return Array.from(this.developers.values()).find(d => d.name === name);
  }
  async createDeveloper(dev: InsertDeveloper): Promise<Developer> {
    const id = this.currentDeveloperId++;
    const now = new Date();
    const newDev: Developer = { ...dev, id, createdAt: now, updatedAt: now } as Developer;
    this.developers.set(id, newDev);
    return newDev;
  }
  async updateDeveloper(id: number, data: Partial<InsertDeveloper>): Promise<Developer | undefined> {
    const dev = this.developers.get(id);
    if (!dev) return undefined;
    const updated: Developer = { ...dev, ...data, updatedAt: new Date() };
    this.developers.set(id, updated);
    return updated;
  }
  async deleteDeveloper(id: number): Promise<boolean> {
    return this.developers.delete(id);
  }

  // ─── Object category operations ────────────────────────────────────────────
  async getObjectCategories(): Promise<ObjectCategory[]> {
    return Array.from(this.objectCategories.values())
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }
  async getObjectCategory(id: number): Promise<ObjectCategory | undefined> {
    return this.objectCategories.get(id);
  }
  async getObjectCategoryBySlug(slug: string): Promise<ObjectCategory | undefined> {
    return Array.from(this.objectCategories.values()).find(c => c.slug === slug);
  }
  async createObjectCategory(cat: InsertObjectCategory): Promise<ObjectCategory> {
    const id = this.currentObjectCategoryId++;
    const newCat: ObjectCategory = {
      id,
      slug: cat.slug,
      name: cat.name,
      color: cat.color ?? '#64748b',
      icon: cat.icon ?? null,
      description: cat.description ?? null,
      sortOrder: cat.sortOrder ?? 0,
    };
    this.objectCategories.set(id, newCat);
    return newCat;
  }
  async updateObjectCategory(id: number, data: Partial<InsertObjectCategory>): Promise<ObjectCategory | undefined> {
    const c = this.objectCategories.get(id);
    if (!c) return undefined;
    const updated: ObjectCategory = { ...c, ...data };
    this.objectCategories.set(id, updated);
    return updated;
  }
  async deleteObjectCategory(id: number): Promise<boolean> {
    return this.objectCategories.delete(id);
  }

  // ─── Soil profile operations ───────────────────────────────────────────────
  async getSoilProfiles(objectId?: number): Promise<SoilProfile[]> {
    const all = Array.from(this.soilProfiles.values());
    return objectId !== undefined ? all.filter(p => p.objectId === objectId) : all;
  }
  async getSoilProfile(id: number): Promise<SoilProfile | undefined> {
    return this.soilProfiles.get(id);
  }
  async createSoilProfile(profile: InsertSoilProfile): Promise<SoilProfile> {
    const id = this.currentSoilProfileId++;
    const newProfile: SoilProfile = { ...profile, id, createdAt: new Date() } as SoilProfile;
    this.soilProfiles.set(id, newProfile);
    return newProfile;
  }
  async updateSoilProfile(id: number, data: Partial<InsertSoilProfile>): Promise<SoilProfile | undefined> {
    const p = this.soilProfiles.get(id);
    if (!p) return undefined;
    const updated: SoilProfile = { ...p, ...data };
    this.soilProfiles.set(id, updated);
    return updated;
  }
  async deleteSoilProfile(id: number): Promise<boolean> {
    return this.soilProfiles.delete(id);
  }

  // ─── Soil layer operations ─────────────────────────────────────────────────
  async getSoilLayers(profileId: number): Promise<SoilLayer[]> {
    return Array.from(this.soilLayers.values()).filter(l => l.profileId === profileId);
  }
  async createSoilLayer(layer: InsertSoilLayer): Promise<SoilLayer> {
    const id = this.currentSoilLayerId++;
    const newLayer: SoilLayer = { ...layer, id } as SoilLayer;
    this.soilLayers.set(id, newLayer);
    return newLayer;
  }
  async updateSoilLayer(id: number, data: Partial<InsertSoilLayer>): Promise<SoilLayer | undefined> {
    const l = this.soilLayers.get(id);
    if (!l) return undefined;
    const updated: SoilLayer = { ...l, ...data };
    this.soilLayers.set(id, updated);
    return updated;
  }
  async deleteSoilLayer(id: number): Promise<boolean> {
    return this.soilLayers.delete(id);
  }

  // ─── Sensor installation operations ───────────────────────────────────────
  async getSensorInstallations(objectId?: number): Promise<SensorInstallation[]> {
    const all = Array.from(this.sensorInstallations.values());
    return objectId !== undefined ? all.filter(i => i.objectId === objectId) : all;
  }
  async getSensorInstallation(id: number): Promise<SensorInstallation | undefined> {
    return this.sensorInstallations.get(id);
  }
  async createSensorInstallation(inst: InsertSensorInstallation): Promise<SensorInstallation> {
    const id = this.currentSensorInstId++;
    const newInst: SensorInstallation = { ...inst, id } as SensorInstallation;
    this.sensorInstallations.set(id, newInst);
    return newInst;
  }
  async updateSensorInstallation(id: number, data: Partial<InsertSensorInstallation>): Promise<SensorInstallation | undefined> {
    const inst = this.sensorInstallations.get(id);
    if (!inst) return undefined;
    const updated: SensorInstallation = { ...inst, ...data };
    this.sensorInstallations.set(id, updated);
    return updated;
  }
  async deleteSensorInstallation(id: number): Promise<boolean> {
    return this.sensorInstallations.delete(id);
  }

  // ─── Building norm operations ──────────────────────────────────────────────
  async getBuildingNorms(category?: string): Promise<BuildingNorm[]> {
    const all = Array.from(this.buildingNorms.values());
    return category ? all.filter(n => n.category === category) : all;
  }
  async getBuildingNorm(id: number): Promise<BuildingNorm | undefined> {
    return this.buildingNorms.get(id);
  }
  async getBuildingNormByCode(code: string): Promise<BuildingNorm | undefined> {
    return Array.from(this.buildingNorms.values()).find(n => n.code === code);
  }
  async createBuildingNorm(norm: InsertBuildingNorm): Promise<BuildingNorm> {
    const id = this.currentBuildingNormId++;
    const newNorm: BuildingNorm = { ...norm, id, createdAt: new Date() } as BuildingNorm;
    this.buildingNorms.set(id, newNorm);
    return newNorm;
  }

  // ─── Seismogram record operations ─────────────────────────────────────────
  async getSeismogramRecords(stationId?: string, limit?: number): Promise<SeismogramRecord[]> {
    let all = Array.from(this.seismogramRecords.values());
    if (stationId) all = all.filter(r => r.stationId === stationId);
    if (limit) all = all.slice(0, limit);
    return all;
  }
  async getSeismogramRecord(id: number): Promise<SeismogramRecord | undefined> {
    return this.seismogramRecords.get(id);
  }
  async createSeismogramRecord(record: InsertSeismogramRecord): Promise<SeismogramRecord> {
    const id = this.currentSeismogramId++;
    const newRecord: SeismogramRecord = { ...record, id, createdAt: new Date() } as SeismogramRecord;
    this.seismogramRecords.set(id, newRecord);
    return newRecord;
  }
  async updateSeismogramProcessingStatus(id: number, status: string): Promise<SeismogramRecord | undefined> {
    const record = this.seismogramRecords.get(id);
    if (!record) return undefined;
    const updated: SeismogramRecord = { ...record, processingStatus: status };
    this.seismogramRecords.set(id, updated);
    return updated;
  }

  // ─── Calibration operations ───────────────────────────────────────────────
  async getCalibrationSessions(installationId?: number): Promise<CalibrationSession[]> {
    const all = Array.from(this.calibrationSessions.values());
    if (installationId !== undefined) return all.filter(s => s.installationId === installationId);
    return all;
  }
  async getCalibrationSession(id: number): Promise<CalibrationSession | undefined> {
    return this.calibrationSessions.get(id);
  }
  async createCalibrationSession(session: InsertCalibrationSession): Promise<CalibrationSession> {
    const id = this.currentCalibrationSessionId++;
    const newSession: CalibrationSession = { ...session, id, createdAt: new Date() } as CalibrationSession;
    this.calibrationSessions.set(id, newSession);
    return newSession;
  }
  async updateCalibrationSession(id: number, data: Partial<InsertCalibrationSession>): Promise<CalibrationSession | undefined> {
    const session = this.calibrationSessions.get(id);
    if (!session) return undefined;
    const updated: CalibrationSession = { ...session, ...data };
    this.calibrationSessions.set(id, updated);
    return updated;
  }
  async deleteCalibrationSession(id: number): Promise<boolean> {
    return this.calibrationSessions.delete(id);
  }
  async getCalibrationAfc(sessionId: number): Promise<CalibrationAfc[]> {
    return Array.from(this.calibrationAfcPoints.values()).filter(p => p.sessionId === sessionId);
  }
  async createCalibrationAfcPoint(point: InsertCalibrationAfc): Promise<CalibrationAfc> {
    const id = this.currentCalibrationAfcId++;
    const newPoint: CalibrationAfc = { ...point, id, phase: point.phase ?? null };
    this.calibrationAfcPoints.set(id, newPoint);
    return newPoint;
  }
  async deleteCalibrationAfcPoint(id: number): Promise<boolean> {
    return this.calibrationAfcPoints.delete(id);
  }
  async replaceCalibrationAfc(sessionId: number, points: InsertCalibrationAfc[]): Promise<CalibrationAfc[]> {
    for (const [id, p] of this.calibrationAfcPoints.entries()) {
      if (p.sessionId === sessionId) this.calibrationAfcPoints.delete(id);
    }
    const created: CalibrationAfc[] = [];
    for (const pt of points) {
      created.push(await this.createCalibrationAfcPoint({ ...pt, sessionId }));
    }
    return created;
  }

  // ─── Extra station operations ──────────────────────────────────────────────
  async getStationsByRegionId(regionId: number): Promise<Station[]> {
    return Array.from(this.stations.values()).filter(s => s.regionId === regionId);
  }
  async updateStationBatteryInfo(stationId: string, batteryLevel: number, batteryVoltage: number, powerConsumption: number): Promise<Station | undefined> {
    const station = Array.from(this.stations.values()).find(s => s.stationId === stationId);
    if (!station) return undefined;
    const updated: Station = { ...station, batteryLevel, batteryVoltage, powerConsumption };
    this.stations.set(station.id, updated);
    return updated;
  }
  async updateStationStorageInfo(stationId: string, storageRemaining: number): Promise<Station | undefined> {
    const station = Array.from(this.stations.values()).find(s => s.stationId === stationId);
    if (!station) return undefined;
    const updated: Station = { ...station, storageRemaining };
    this.stations.set(station.id, updated);
    return updated;
  }
}

import { db } from './db';
import { eq, desc, and, gt, lte } from 'drizzle-orm';
import { schema } from './db';
import {
  users, regions, stations, events, waveformData, researchNetworks,
  systemStatus, alerts, maintenanceRecords,
  infrastructureObjects, objectCategories, soilProfiles, soilLayers, sensorInstallations,
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

// Initialize storage with sample data and export
const initializeDatabase = async () => {
  const dbStorage = new DatabaseStorage();

  // Remove legacy international stations that don't belong to the Irkutsk network
  const LEGACY_STATION_IDS = ["PNWST-03", "SOCAL-12", "ALASKA-07", "FIJI-01"];
  for (const legacyId of LEGACY_STATION_IDS) {
    const legacy = await dbStorage.getStationByStationId(legacyId);
    if (legacy) {
      await db.delete(schema.stations).where(eq(schema.stations.id, legacy.id));
      console.log(`Removed legacy station: ${legacyId}`);
    }
  }

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
        name: "Иркутск",
        description: "Город Иркутск и прилегающие территории",
        centerLatitude: "52.2900",
        centerLongitude: "104.2964",
        radiusKm: 50,
        createdAt: new Date()
      },
      {
        name: "Байкальская зона",
        description: "Прибайкалье и Западное Забайкалье",
        centerLatitude: "52.5000",
        centerLongitude: "104.8000",
        radiusKm: 250,
        createdAt: new Date()
      }
    ];

    // Create regions first
    const regionMap = new Map<string, number>();
    for (const region of sampleRegions) {
      const existing = await dbStorage.getRegionByName(region.name);
      if (existing) {
        regionMap.set(region.name, existing.id);
      } else {
        const created = await dbStorage.createRegion(region);
        regionMap.set(region.name, created.id);
      }
    }
    const irkId = regionMap.get("Иркутск");

    // Irkutsk monitoring stations
    const sampleStations: InsertStation[] = [
      {
        stationId: "IRK-ST-001",
        name: "Станция «Центр»",
        location: "ул. Ленина, Иркутск",
        latitude: "52.2897",
        longitude: "104.2963",
        status: "online",
        lastUpdate: new Date(),
        dataRate: 100,
        regionId: irkId,
        batteryLevel: 89,
        batteryVoltage: 12.6,
        powerConsumption: 2.8,
        serialNumber: "IRK-2024-001",
        firmwareVersion: "v3.1.0",
        hardwareModel: "СМ-3КВ",
        installationDate: new Date(2024, 0, 15),
        sensorsCalibrated: true,
        lastCalibrationDate: new Date(2024, 2, 10),
        nextCalibrationDue: new Date(2024, 8, 10),
        storageRemaining: 75,
        connectionStrength: 95,
        configuration: { samplingRate: 100, triggerThreshold: 0.01, channels: ["Z","NS","EW"] }
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
        regionId: irkId,
        batteryLevel: 94,
        batteryVoltage: 12.9,
        powerConsumption: 3.1,
        serialNumber: "IRK-2024-002",
        firmwareVersion: "v3.1.0",
        hardwareModel: "СМ-3КВ",
        installationDate: new Date(2024, 1, 20),
        sensorsCalibrated: true,
        lastCalibrationDate: new Date(2024, 2, 15),
        nextCalibrationDue: new Date(2024, 8, 15),
        storageRemaining: 82,
        connectionStrength: 98,
        configuration: { samplingRate: 100, triggerThreshold: 0.005, channels: ["Z","NS","EW"] }
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
        regionId: irkId,
        batteryLevel: 77,
        batteryVoltage: 12.2,
        powerConsumption: 2.5,
        serialNumber: "IRK-2024-003",
        firmwareVersion: "v3.1.0",
        hardwareModel: "СМ-3КВ",
        installationDate: new Date(2024, 2, 5),
        sensorsCalibrated: true,
        lastCalibrationDate: new Date(2024, 2, 20),
        nextCalibrationDue: new Date(2024, 8, 20),
        storageRemaining: 68,
        connectionStrength: 87,
        configuration: { samplingRate: 100, triggerThreshold: 0.008, channels: ["Z","NS","EW"] }
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
        regionId: irkId,
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
        configuration: { samplingRate: 100, triggerThreshold: 0.01, channels: ["Z","NS","EW"] }
      },
      {
        stationId: "IRK-ST-005",
        name: "Станция «Иркутск-Южный»",
        location: "пос. Ново-Иркутский",
        latitude: "52.2231",
        longitude: "104.3012",
        status: "online",
        lastUpdate: new Date(),
        dataRate: 100,
        regionId: irkId,
        batteryLevel: 82,
        batteryVoltage: 12.5,
        powerConsumption: 2.7,
        serialNumber: "IRK-2024-005",
        firmwareVersion: "v3.1.0",
        hardwareModel: "СМ-3КВ",
        installationDate: new Date(2024, 3, 1),
        sensorsCalibrated: true,
        lastCalibrationDate: new Date(2024, 3, 10),
        nextCalibrationDue: new Date(2024, 9, 10),
        storageRemaining: 90,
        connectionStrength: 91,
        configuration: { samplingRate: 100, triggerThreshold: 0.01, channels: ["Z","NS","EW"] }
      },
      {
        stationId: "IRK-ST-006",
        name: "Станция «Шелехов»",
        location: "г. Шелехов",
        latitude: "52.2090",
        longitude: "104.1010",
        status: "online",
        lastUpdate: new Date(),
        dataRate: 100,
        regionId: irkId,
        batteryLevel: 88,
        batteryVoltage: 12.7,
        powerConsumption: 2.6,
        serialNumber: "IRK-2024-006",
        firmwareVersion: "v3.1.0",
        hardwareModel: "СМ-3КВ",
        installationDate: new Date(2024, 3, 15),
        sensorsCalibrated: true,
        lastCalibrationDate: new Date(2024, 3, 20),
        nextCalibrationDue: new Date(2024, 9, 20),
        storageRemaining: 86,
        connectionStrength: 89,
        configuration: { samplingRate: 100, triggerThreshold: 0.01, channels: ["Z","NS","EW"] }
      },
      {
        stationId: "IRK-ST-007",
        name: "Станция «Листвянка»",
        location: "пос. Листвянка (береговая)",
        latitude: "51.8599",
        longitude: "104.8736",
        status: "online",
        lastUpdate: new Date(),
        dataRate: 100,
        regionId: regionMap.get("Байкальская зона"),
        batteryLevel: 91,
        batteryVoltage: 12.8,
        powerConsumption: 2.8,
        serialNumber: "IRK-2024-007",
        firmwareVersion: "v3.1.0",
        hardwareModel: "СМ-3КВ",
        installationDate: new Date(2024, 4, 1),
        sensorsCalibrated: true,
        lastCalibrationDate: new Date(2024, 4, 5),
        nextCalibrationDue: new Date(2024, 10, 5),
        storageRemaining: 93,
        connectionStrength: 84,
        configuration: { samplingRate: 100, triggerThreshold: 0.005, channels: ["Z","NS","EW"] }
      },
      {
        stationId: "IRK-ST-008",
        name: "Станция «Ангарск»",
        location: "г. Ангарск",
        latitude: "52.5397",
        longitude: "103.8897",
        status: "offline",
        lastUpdate: new Date(Date.now() - 3600000),
        dataRate: 0,
        regionId: irkId,
        batteryLevel: 12,
        batteryVoltage: 10.1,
        powerConsumption: 0,
        serialNumber: "IRK-2024-008",
        firmwareVersion: "v3.0.0",
        hardwareModel: "СМ-3КВ",
        installationDate: new Date(2024, 4, 10),
        sensorsCalibrated: false,
        storageRemaining: 55,
        connectionStrength: 0,
        configuration: { samplingRate: 100, triggerThreshold: 0.01, channels: ["Z","NS","EW"] }
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
        message: "Потеря связи со станцией IRK-ST-008 (Ангарск)",
        timestamp: new Date(Date.now() - 24 * 60 * 1000),
        relatedEntityId: "IRK-ST-008",
        relatedEntityType: "station",
        isRead: false
      },
      {
        alertType: "station_offline",
        severity: "danger",
        message: "Станция IRK-ST-008 не отвечает более 1 часа",
        timestamp: new Date(Date.now() - 60 * 60 * 1000),
        relatedEntityId: "IRK-ST-008",
        relatedEntityType: "station",
        isRead: false
      },
      {
        alertType: "scheduled_maintenance",
        severity: "info",
        message: "Плановое ТО — IRK-ST-004 (Академгородок)",
        timestamp: new Date(Date.now() - 120 * 60 * 1000),
        relatedEntityId: "IRK-ST-004",
        relatedEntityType: "station",
        isRead: true
      },
      {
        alertType: "low_battery",
        severity: "warning",
        message: "Низкий заряд батареи на станции IRK-ST-004 (45%)",
        timestamp: new Date(Date.now() - 180 * 60 * 1000),
        relatedEntityId: "IRK-ST-004",
        relatedEntityType: "station",
        isRead: false
      },
      {
        alertType: "calibration_due",
        severity: "info",
        message: "Требуется калибровка датчиков — станция IRK-ST-008",
        timestamp: new Date(Date.now() - 200 * 60 * 1000),
        relatedEntityId: "IRK-ST-008",
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
        stationId: "IRK-ST-001",
        maintenanceType: "calibration",
        performedBy: "Иванов А.В.",
        performedAt: new Date(2024, 2, 10),
        status: "completed",
        description: "Плановая калибровка датчиков (6-месячная)",
        findings: "Все датчики в норме, незначительная коррекция вертикального компонента",
        partsReplaced: JSON.stringify([]),
        batteryReplaced: false,
        calibrationPerformed: true,
        firmwareUpdated: true,
        nextMaintenanceDue: new Date(2024, 8, 10),
        notes: "Станция в отличном состоянии"
      },
      {
        stationId: "IRK-ST-002",
        maintenanceType: "calibration",
        performedBy: "Петров Д.С.",
        performedAt: new Date(2024, 2, 15),
        status: "completed",
        description: "Плановая калибровка (ГЭС)",
        findings: "Требовалась рекалибровка горизонтального компонента",
        partsReplaced: JSON.stringify(["Кабель питания"]),
        batteryReplaced: false,
        calibrationPerformed: true,
        firmwareUpdated: true,
        nextMaintenanceDue: new Date(2024, 8, 15),
        notes: "Очистка от пыли и влаги"
      },
      {
        stationId: "IRK-ST-004",
        maintenanceType: "battery",
        performedBy: "Сидорова Е.Н.",
        performedAt: new Date(2024, 1, 8),
        status: "completed",
        description: "Плановая замена аккумулятора",
        findings: "Старый АКБ деградировал до 35% ёмкости",
        partsReplaced: JSON.stringify(["Аккумулятор 12В 100Ач"]),
        batteryReplaced: true,
        calibrationPerformed: false,
        firmwareUpdated: false,
        notes: "Заменён на новый аккумулятор повышенной ёмкости"
      },
      {
        stationId: "IRK-ST-008",
        maintenanceType: "repair",
        performedBy: "Козлов В.М.",
        performedAt: new Date(2024, 3, 5),
        status: "completed",
        description: "Аварийный ремонт — потеря связи",
        findings: "Антенный модуль повреждён в результате грозового разряда",
        partsReplaced: JSON.stringify(["Антенный модуль", "Коммуникационный кабель"]),
        batteryReplaced: false,
        calibrationPerformed: false,
        firmwareUpdated: true,
        notes: "Установлена дополнительная грозозащита"
      },
      {
        stationId: "IRK-ST-004",
        maintenanceType: "calibration",
        performedBy: "Иванов А.В.",
        performedAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        scheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        status: "scheduled",
        description: "Внеплановая калибровка после замены АКБ",
        notes: "Приоритетное ТО — деградация сигнала"
      },
      {
        stationId: "IRK-ST-007",
        maintenanceType: "upgrade",
        performedBy: "Новиков П.Р.",
        performedAt: new Date(2024, 4, 5),
        status: "completed",
        description: "Обновление прошивки и замена модуля хранения",
        findings: "Успешно обновлён до v3.1.0",
        partsReplaced: JSON.stringify(["Flash-накопитель 256 ГБ"]),
        batteryReplaced: false,
        calibrationPerformed: true,
        firmwareUpdated: true,
        nextMaintenanceDue: new Date(2024, 10, 5),
        notes: "Увеличен объём хранилища данных"
      },
      {
        stationId: "IRK-ST-001",
        maintenanceType: "inspection",
        performedBy: "Смирнов Г.Л.",
        performedAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        scheduledAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        status: "scheduled",
        description: "Плановый квартальный осмотр",
        notes: "Проверка герметичности корпуса и связи"
      }
    ];
    
    for (const record of sampleMaintenanceRecords) {
      await dbStorage.createMaintenanceRecord(record);
    }
    
    console.log('Database initialization complete.');
  }

  // ── Seed object categories ──────────────────────────────────────────────────
  const existingCategories = await dbStorage.getObjectCategories();
  if (existingCategories.length === 0) {
    console.log('Seeding object categories...');
    const seedCategories: InsertObjectCategory[] = [
      { slug: 'residential', name: 'Жилое',           color: '#3b82f6', icon: 'Home',         sortOrder: 1 },
      { slug: 'admin',       name: 'Административное',color: '#8b5cf6', icon: 'Building2',    sortOrder: 2 },
      { slug: 'hospital',    name: 'Больница',        color: '#ef4444', icon: 'Activity',     sortOrder: 3 },
      { slug: 'school',      name: 'Школа / ВУЗ',     color: '#14b8a6', icon: 'GraduationCap',sortOrder: 4 },
      { slug: 'industrial',  name: 'Промышленное',    color: '#f97316', icon: 'Factory',      sortOrder: 5 },
      { slug: 'bridge',      name: 'Мост / Путепровод', color: '#0ea5e9', icon: 'Milestone',  sortOrder: 6 },
      { slug: 'pipeline',    name: 'Трубопровод',     color: '#06b6d4', icon: 'GitBranch',    sortOrder: 7 },
      { slug: 'dam',         name: 'Плотина / ГТС',   color: '#6366f1', icon: 'Waves',        sortOrder: 8 },
      { slug: 'other',       name: 'Прочее',          color: '#64748b', icon: 'HelpCircle',   sortOrder: 99 },
    ];
    for (const c of seedCategories) {
      await dbStorage.createObjectCategory(c);
    }
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
        district: "Октябрьский",
        developer: "Иркутское горстройтрест",
        structuralSystem: "brick",
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
        district: "Октябрьский",
        developer: "ГлавДорСтрой СССР",
        structuralSystem: "frame",
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
        district: "Правобережный",
        developer: "Министерство электростанций СССР",
        structuralSystem: "monolithic",
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
        district: "Свердловский",
        developer: "Иркутское строительное управление №3",
        structuralSystem: "frame",
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
        district: "Свердловский",
        developer: "Иркутскжилстрой",
        structuralSystem: "panel",
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

  // ── Seed major Irkutsk developer high-rise buildings ─────────────────────────
  const developerBuildings: InsertInfrastructureObject[] = [
    {
      objectId: "IRK-DEV-001",
      name: "ЖК «Авиатор» (ГК «Новый город»)",
      address: "Октябрьский район, Иркутск",
      objectType: "residential",
      constructionYear: 2018,
      floors: 25,
      latitude: "52.2940",
      longitude: "104.2850",
      district: "Октябрьский",
      developer: "ГК «Новый город»",
      structuralSystem: "monolithic",
      foundationType: "pile",
      seismicCategory: "II",
      designIntensity: 7,
      technicalCondition: "good",
      description: "16–25 эт. монолитный ЖК. Суммарная площадь застройщика 99.3 тыс. м². Сайт: gknovygorod.ru, тел.: +7 (3952) 20-00-00",
      responsibleOrganization: "ГК «Новый город»",
      contactPhone: "+7 (3952) 20-00-00",
      isMonitored: false,
      metadata: { developerSite: "gknovygorod.ru", totalAreaThousandSqm: 99.3, keyProjects: ["ЖК «Авиатор»", "ЖК «Северное сияние»"] }
    },
    {
      objectId: "IRK-DEV-002",
      name: "ЖК «Бродский» (ГК «Грандстрой»)",
      address: "Октябрьский район, Иркутск",
      objectType: "residential",
      constructionYear: 2020,
      floors: 25,
      latitude: "52.2960",
      longitude: "104.2820",
      district: "Октябрьский",
      developer: "ГК «Грандстрой»",
      structuralSystem: "monolithic",
      foundationType: "pile",
      seismicCategory: "II",
      designIntensity: 7,
      technicalCondition: "good",
      description: "18–25 эт. монолитный ЖК. Суммарная площадь застройщика 54.7 тыс. м². Сайт: grandstroy38.ru, тел.: +7 (3952) 50-50-50",
      responsibleOrganization: "ГК «Грандстрой»",
      contactPhone: "+7 (3952) 50-50-50",
      isMonitored: false,
      metadata: { developerSite: "grandstroy38.ru", totalAreaThousandSqm: 54.7, keyProjects: ["ЖК «Бродский»", "ЖК «Союз Priority MAX»"] }
    },
    {
      objectId: "IRK-DEV-003",
      name: "ЖК «Парапет» (ПарапетСтрой)",
      address: "Свердловский район, Иркутск",
      objectType: "residential",
      constructionYear: 2016,
      floors: 20,
      latitude: "52.2720",
      longitude: "104.2980",
      district: "Свердловский",
      developer: "ПарапетСтрой",
      structuralSystem: "monolithic",
      foundationType: "pile",
      seismicCategory: "III",
      designIntensity: 7,
      technicalCondition: "good",
      description: "16–20 эт. монолитный ЖК. Суммарная площадь застройщика 49.1 тыс. м². Сайт: parapet38.ru, тел.: +7 (3952) 25-25-25",
      responsibleOrganization: "ПарапетСтрой",
      contactPhone: "+7 (3952) 25-25-25",
      isMonitored: false,
      metadata: { developerSite: "parapet38.ru", totalAreaThousandSqm: 49.1, keyProjects: ["ЖК «Парапет»", "ЖК «Сказка»"] }
    },
    {
      objectId: "IRK-DEV-004",
      name: "ЖК «Домашний» (ГК «ДомСтрой»)",
      address: "Октябрьский район, Иркутск",
      objectType: "residential",
      constructionYear: 2019,
      floors: 16,
      latitude: "52.2910",
      longitude: "104.2900",
      district: "Октябрьский",
      developer: "ГК «ДомСтрой»",
      structuralSystem: "monolithic",
      foundationType: "pile",
      seismicCategory: "II",
      designIntensity: 7,
      technicalCondition: "good",
      description: "16 эт. монолитный ЖК. Суммарная площадь застройщика 43.1 тыс. м². Сайт: domstroy38.ru, тел.: +7 (3952) 39-00-39",
      responsibleOrganization: "ГК «ДомСтрой»",
      contactPhone: "+7 (3952) 39-00-39",
      isMonitored: false,
      metadata: { developerSite: "domstroy38.ru", totalAreaThousandSqm: 43.1, keyProjects: ["ЖК «Домашний»", "ЖК «ДомСтрой-2»"] }
    },
    {
      objectId: "IRK-DEV-005",
      name: "ЖК «Клубный дом РиверАнг» (ГорСтрой)",
      address: "Иркутск",
      objectType: "residential",
      constructionYear: 2017,
      floors: 16,
      latitude: "52.2850",
      longitude: "104.3050",
      district: "Свердловский",
      developer: "ГорСтрой",
      structuralSystem: "monolithic",
      foundationType: "pile",
      seismicCategory: "II",
      designIntensity: 7,
      technicalCondition: "good",
      description: "16 эт. монолитный ЖК. Суммарная площадь застройщика 35.7 тыс. м². Сайт: gorstroyrf.ru, тел.: +7 (3952) 20-20-20",
      responsibleOrganization: "ГорСтрой",
      contactPhone: "+7 (3952) 20-20-20",
      isMonitored: false,
      metadata: { developerSite: "gorstroyrf.ru", totalAreaThousandSqm: 35.7, keyProjects: ["ЖК «Клубный дом РиверАнг»", "ЖК «Сибиряков»"] }
    },
    {
      objectId: "IRK-DEV-006",
      name: "ЖК «Родные берега» (Родные берега)",
      address: "Свердловский район, Иркутск",
      objectType: "residential",
      constructionYear: 2019,
      floors: 18,
      latitude: "52.2700",
      longitude: "104.3100",
      district: "Свердловский",
      developer: "Родные берега",
      structuralSystem: "monolithic",
      foundationType: "pile",
      seismicCategory: "III",
      designIntensity: 7,
      technicalCondition: "good",
      description: "14–18 эт. монолитный ЖК. Суммарная площадь застройщика 34.6 тыс. м². Сайт: rodnye-berega.ru, тел.: +7 (3952) 66-00-66",
      responsibleOrganization: "Родные берега",
      contactPhone: "+7 (3952) 66-00-66",
      isMonitored: false,
      metadata: { developerSite: "rodnye-berega.ru", totalAreaThousandSqm: 34.6, keyProjects: ["ЖК «Родные берега»"] }
    },
    {
      objectId: "IRK-DEV-007",
      name: "ЖК «Профит» (Профит)",
      address: "Ленинский район, Иркутск",
      objectType: "residential",
      constructionYear: 2016,
      floors: 16,
      latitude: "52.2520",
      longitude: "104.3350",
      district: "Ленинский",
      developer: "Профит",
      structuralSystem: "monolithic",
      foundationType: "pile",
      seismicCategory: "III",
      designIntensity: 7,
      technicalCondition: "good",
      description: "16 эт. монолитный ЖК. Суммарная площадь застройщика 33.4 тыс. м². Сайт: profit38.ru, тел.: +7 (3952) 77-77-77",
      responsibleOrganization: "Профит",
      contactPhone: "+7 (3952) 77-77-77",
      isMonitored: false,
      metadata: { developerSite: "profit38.ru", totalAreaThousandSqm: 33.4, keyProjects: ["ЖК «Профит»", "ЖК «Элитный»"] }
    },
    {
      objectId: "IRK-DEV-008",
      name: "ЖК «Якоби-парк» (СЗ «Регион Сибири»)",
      address: "Свердловский район, Иркутск",
      objectType: "residential",
      constructionYear: 2023,
      floors: 16,
      latitude: "52.2750",
      longitude: "104.2900",
      district: "Свердловский",
      developer: "СЗ «Регион Сибири»",
      structuralSystem: "monolithic",
      foundationType: "pile",
      seismicCategory: "II",
      designIntensity: 7,
      technicalCondition: "good",
      description: "14–16 эт. ЖК в рамках КРТ. Суммарная площадь застройщика ~25 тыс. м² (КРТ, план 197 тыс. м² к 2031 г.). Сайт: region-sibiri.ru, тел.: +7 (3952) 98-00-98, email: info@region-sibiri.ru",
      responsibleOrganization: "СЗ «Регион Сибири»",
      contactPhone: "+7 (3952) 98-00-98",
      isMonitored: false,
      metadata: { developerSite: "region-sibiri.ru", email: "info@region-sibiri.ru", totalAreaThousandSqm: 25.0, keyProjects: ["ЖК «Якоби-парк»", "КРТ Академгородок"] }
    },
    {
      objectId: "IRK-DEV-009",
      name: "ЖК «Альфа» (Альфа)",
      address: "Правобережный район, Иркутск",
      objectType: "residential",
      constructionYear: 2018,
      floors: 16,
      latitude: "52.3050",
      longitude: "104.3150",
      district: "Правобережный",
      developer: "Альфа",
      structuralSystem: "monolithic",
      foundationType: "pile",
      seismicCategory: "II",
      designIntensity: 7,
      technicalCondition: "good",
      description: "14–16 эт. монолитный ЖК. Суммарная площадь застройщика 28.6 тыс. м². Сайт: alfa-irk.ru, тел.: +7 (3952) 90-90-90",
      responsibleOrganization: "Альфа",
      contactPhone: "+7 (3952) 90-90-90",
      isMonitored: false,
      metadata: { developerSite: "alfa-irk.ru", totalAreaThousandSqm: 28.6, keyProjects: ["ЖК «Альфа»"] }
    },
    {
      objectId: "IRK-DEV-010",
      name: "ЖК «Топкинский» (Монолитстрой-Иркутск)",
      address: "Куйбышевский район, Иркутск",
      objectType: "residential",
      constructionYear: 2012,
      floors: 16,
      latitude: "52.3200",
      longitude: "104.2650",
      district: "Правобережный",
      developer: "Монолитстрой-Иркутск",
      structuralSystem: "monolithic",
      foundationType: "pile",
      seismicCategory: "II",
      designIntensity: 7,
      technicalCondition: "satisfactory",
      description: "12–16 эт. монолитный ЖК (архив 2007–2015). Суммарная площадь ~15 тыс. м². Сайт: mstroyirk.ru, тел.: +7 (3952) 42-64-58",
      responsibleOrganization: "Монолитстрой-Иркутск",
      contactPhone: "+7 (3952) 42-64-58",
      isMonitored: false,
      metadata: { developerSite: "mstroyirk.ru", totalAreaThousandSqm: 15.0, keyProjects: ["ЖК «Топкинский»"] }
    },
  ];

  for (const devObj of developerBuildings) {
    const existing = await dbStorage.getInfrastructureObjectByObjectId(devObj.objectId);
    if (!existing) {
      await dbStorage.createInfrastructureObject(devObj);
    }
  }
  console.log('Developer high-rise buildings seeded (skipped if already present).');

  // ── Seed major Irkutsk developer companies (carded profiles) ─────────────────
  const devSeeds: InsertDeveloper[] = [
    {
      name: "ГК «Новый город»",
      legalForm: "ГК",
      website: "https://gknovygorod.ru",
      phone: "+7 (3952) 20-00-00",
      legalAddress: "г. Иркутск",
      totalAreaThousandSqm: "99.3",
      licenses: [
        { number: "СРО-С-022-22082009", type: "СРО строителей", issuer: "АСРО «Содружество строителей»" },
      ],
      completedObjects: [
        { name: "ЖК «Авиатор»",          year: 2018, floors: 25, district: "Октябрьский" },
        { name: "ЖК «Северное сияние»",  year: 2017, floors: 16, district: "Октябрьский" },
      ],
      plannedObjects: [],
      monitoringStatus: "connected",
      monitoringConnectedDate: new Date("2024-03-01"),
      notes: "Лидер по площади высотного жилья (99.3 тыс. м²)",
    },
    {
      name: "ГК «Грандстрой»",
      legalForm: "ГК",
      website: "https://grandstroy38.ru",
      phone: "+7 (3952) 50-50-50",
      legalAddress: "г. Иркутск",
      totalAreaThousandSqm: "54.7",
      licenses: [{ number: "СРО-С-073-08122009", type: "СРО строителей" }],
      completedObjects: [
        { name: "ЖК «Бродский»",            year: 2020, floors: 25, district: "Октябрьский" },
        { name: "ЖК «Союз Priority MAX»",   year: 2021, floors: 16, district: "Октябрьский" },
      ],
      plannedObjects: [],
      monitoringStatus: "pending",
      notes: "Согласование подключения к программе мониторинга",
    },
    {
      name: "ПарапетСтрой",
      legalForm: "ООО",
      website: "https://parapet38.ru",
      phone: "+7 (3952) 25-25-25",
      legalAddress: "г. Иркутск",
      totalAreaThousandSqm: "49.1",
      licenses: [{ number: "СРО-С-101-12012010", type: "СРО строителей" }],
      completedObjects: [
        { name: "ЖК «Парапет»", year: 2016, floors: 20, district: "Свердловский" },
        { name: "ЖК «Сказка»",  year: 2018, floors: 16, district: "Свердловский" },
      ],
      plannedObjects: [],
      monitoringStatus: "invited",
      notes: "Приглашение направлено, ожидается ответ",
    },
    {
      name: "ГК «ДомСтрой»",
      legalForm: "ГК",
      website: "https://domstroy38.ru",
      phone: "+7 (3952) 39-00-39",
      legalAddress: "г. Иркутск",
      totalAreaThousandSqm: "43.1",
      licenses: [{ number: "СРО-С-200-15052012", type: "СРО строителей" }],
      completedObjects: [
        { name: "ЖК «Домашний»",  year: 2019, floors: 16, district: "Октябрьский" },
        { name: "ЖК «ДомСтрой-2»", year: 2021, floors: 18, district: "Октябрьский" },
      ],
      plannedObjects: [],
      monitoringStatus: "not_connected",
    },
    {
      name: "ГорСтрой",
      legalForm: "ООО",
      website: "https://gorstroyrf.ru",
      phone: "+7 (3952) 20-20-20",
      legalAddress: "г. Иркутск",
      totalAreaThousandSqm: "35.7",
      licenses: [{ number: "СРО-С-150-10072011", type: "СРО строителей" }],
      completedObjects: [
        { name: "ЖК «Клубный дом РиверАнг»", year: 2017, floors: 16, district: "Свердловский" },
        { name: "ЖК «Сибиряков»",            year: 2019, floors: 20, district: "Свердловский" },
      ],
      plannedObjects: [],
      monitoringStatus: "connected",
      monitoringConnectedDate: new Date("2024-06-15"),
    },
    {
      name: "Родные берега",
      legalForm: "ООО",
      website: "https://rodnye-berega.ru",
      phone: "+7 (3952) 66-00-66",
      legalAddress: "г. Иркутск",
      totalAreaThousandSqm: "34.6",
      licenses: [{ number: "СРО-С-250-20082014", type: "СРО строителей" }],
      completedObjects: [
        { name: "ЖК «Родные берега»", year: 2019, floors: 18, district: "Свердловский" },
      ],
      plannedObjects: [],
      monitoringStatus: "not_connected",
    },
    {
      name: "Профит",
      legalForm: "ООО",
      website: "https://profit38.ru",
      phone: "+7 (3952) 77-77-77",
      legalAddress: "г. Иркутск",
      totalAreaThousandSqm: "33.4",
      licenses: [{ number: "СРО-С-280-15102015", type: "СРО строителей" }],
      completedObjects: [
        { name: "ЖК «Профит»",  year: 2016, floors: 16, district: "Ленинский" },
        { name: "ЖК «Элитный»", year: 2018, floors: 18, district: "Ленинский" },
      ],
      plannedObjects: [],
      monitoringStatus: "declined",
      notes: "Отказ от участия в первой очереди программы",
    },
    {
      name: "СЗ «Регион Сибири»",
      legalForm: "ООО СЗ",
      website: "https://region-sibiri.ru",
      phone: "+7 (3952) 98-00-98",
      email: "info@region-sibiri.ru",
      legalAddress: "г. Иркутск",
      totalAreaThousandSqm: "25.0",
      licenses: [
        { number: "СРО-С-310-25032018", type: "СРО строителей" },
        { number: "КРТ-2023-001",       type: "Договор КРТ", issuer: "Администрация г. Иркутска", scope: "Комплексное развитие территорий" },
      ],
      completedObjects: [
        { name: "ЖК «Якоби-парк»", year: 2023, floors: 16, district: "Свердловский" },
      ],
      plannedObjects: [
        { name: "КРТ Академгородок", plannedYear: 2031, floors: 18, district: "Свердловский", area: 197, status: "design" },
      ],
      monitoringStatus: "connected",
      monitoringConnectedDate: new Date("2025-01-10"),
      notes: "Активный участник КРТ. План: 197 тыс. м² к 2031 г.",
    },
    {
      name: "Альфа",
      legalForm: "ООО",
      website: "https://alfa-irk.ru",
      phone: "+7 (3952) 90-90-90",
      legalAddress: "г. Иркутск",
      totalAreaThousandSqm: "28.6",
      licenses: [{ number: "СРО-С-260-12092014", type: "СРО строителей" }],
      completedObjects: [
        { name: "ЖК «Альфа»", year: 2018, floors: 16, district: "Правобережный" },
      ],
      plannedObjects: [],
      monitoringStatus: "pending",
    },
    {
      name: "Монолитстрой-Иркутск",
      legalForm: "ООО",
      website: "https://mstroyirk.ru",
      phone: "+7 (3952) 42-64-58",
      legalAddress: "г. Иркутск",
      totalAreaThousandSqm: "15.0",
      licenses: [{ number: "СРО-С-090-05062009", type: "СРО строителей" }],
      completedObjects: [
        { name: "ЖК «Топкинский»", year: 2012, floors: 16, district: "Правобережный" },
      ],
      plannedObjects: [],
      monitoringStatus: "suspended",
      notes: "Пионер монолитных высоток (декларации 2007 г.), сейчас менее активен",
    },
  ];
  for (const dev of devSeeds) {
    const existing = await dbStorage.getDeveloperByName(dev.name);
    if (!existing) {
      await dbStorage.createDeveloper(dev);
    }
  }
  console.log('Developers seeded (skipped if already present).');

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

  // ── Seed Irkutsk stations (add any missing ones) ──────────────────────────────
  {
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
      },
      {
        stationId: "IRK-ST-005",
        name: "Станция «Иркутск-Южный»",
        location: "пос. Ново-Иркутский",
        latitude: "52.2231",
        longitude: "104.3012",
        status: "online",
        lastUpdate: new Date(),
        dataRate: 100,
        regionId: irkRegionId,
        batteryLevel: 82,
        batteryVoltage: 12.5,
        powerConsumption: 2.7,
        serialNumber: "IRK-2024-005",
        firmwareVersion: "v3.1.0",
        hardwareModel: "СМ-3КВ",
        installationDate: new Date(2024, 3, 1),
        sensorsCalibrated: true,
        lastCalibrationDate: new Date(2024, 3, 15),
        nextCalibrationDue: new Date(2024, 9, 15),
        storageRemaining: 70,
        connectionStrength: 90,
        configuration: { samplingRate: 100, triggerThreshold: 0.01, channels: ["Z", "NS", "EW"] }
      },
      {
        stationId: "IRK-ST-006",
        name: "Станция «Шелехов»",
        location: "г. Шелехов",
        latitude: "52.2090",
        longitude: "104.1010",
        status: "online",
        lastUpdate: new Date(),
        dataRate: 100,
        regionId: irkRegionId,
        batteryLevel: 88,
        batteryVoltage: 12.7,
        powerConsumption: 2.6,
        serialNumber: "IRK-2024-006",
        firmwareVersion: "v3.1.0",
        hardwareModel: "СМ-3КВ",
        installationDate: new Date(2024, 3, 10),
        sensorsCalibrated: true,
        lastCalibrationDate: new Date(2024, 3, 20),
        nextCalibrationDue: new Date(2024, 9, 20),
        storageRemaining: 78,
        connectionStrength: 93,
        configuration: { samplingRate: 100, triggerThreshold: 0.01, channels: ["Z", "NS", "EW"] }
      },
      {
        stationId: "IRK-ST-007",
        name: "Станция «Листвянка»",
        location: "пос. Листвянка (береговая)",
        latitude: "51.8599",
        longitude: "104.8736",
        status: "online",
        lastUpdate: new Date(),
        dataRate: 100,
        regionId: irkRegionId,
        batteryLevel: 91,
        batteryVoltage: 12.8,
        powerConsumption: 3.0,
        serialNumber: "IRK-2024-007",
        firmwareVersion: "v3.1.0",
        hardwareModel: "СМ-3КВ",
        installationDate: new Date(2024, 4, 5),
        sensorsCalibrated: true,
        lastCalibrationDate: new Date(2024, 4, 15),
        nextCalibrationDue: new Date(2024, 10, 15),
        storageRemaining: 85,
        connectionStrength: 96,
        configuration: { samplingRate: 100, triggerThreshold: 0.005, channels: ["Z", "NS", "EW"] }
      },
      {
        stationId: "IRK-ST-008",
        name: "Станция «Ангарск»",
        location: "г. Ангарск",
        latitude: "52.5397",
        longitude: "103.8897",
        status: "offline",
        lastUpdate: new Date(Date.now() - 3600000),
        dataRate: 0,
        regionId: irkRegionId,
        batteryLevel: 12,
        batteryVoltage: 10.1,
        powerConsumption: 0,
        serialNumber: "IRK-2024-008",
        firmwareVersion: "v3.0.0",
        hardwareModel: "СМ-3КВ",
        installationDate: new Date(2024, 4, 20),
        sensorsCalibrated: false,
        storageRemaining: 15,
        connectionStrength: 0,
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

  // ── Seed historical seismogram catalog ──────────────────────────────────────
  const existingSeismograms = await dbStorage.getSeismogramRecords(undefined, 1);
  if (existingSeismograms.length === 0) {
    console.log('Seeding historical seismogram catalog...');

    const historicalRecords: InsertSeismogramRecord[] = [
      // ─── Major historical Baikal events ────────────────────────────────────
      {
        recordId: 'HIST-BAI-1999-001',
        stationId: 'IRK-ST-001',
        startTime: new Date('1999-02-25T10:12:00Z'),
        endTime:   new Date('1999-02-25T10:14:30Z'),
        durationSec: 150, sampleRate: 100, channels: 'Z,NS,EW',
        peakAmplitudeZ: 12.4, peakAmplitudeNS: 9.8, peakAmplitudeEW: 8.2,
        peakGroundAcceleration: 0.082,
        dominantFrequency: 1.8, recordingType: 'triggered',
        processingStatus: 'processed',
        magnitude: 6.0, magnitudeType: 'Ms',
        focalDepthKm: 20, epicentralDistanceKm: 85,
        soilCategory: 'II', locationName: 'Байкал, оз. (Зап. берег)',
        dataSource: 'historical', isHistorical: true,
        notes: 'Значительное землетрясение Прибайкалья 1999 г., M6.0. Ощущалось в Иркутске как интенсивность VI балл.'
      },
      {
        recordId: 'HIST-BAI-2008-001',
        stationId: 'IRK-ST-002',
        startTime: new Date('2008-08-27T15:35:22Z'),
        endTime:   new Date('2008-08-27T15:38:00Z'),
        durationSec: 158, sampleRate: 100, channels: 'Z,NS,EW',
        peakAmplitudeZ: 18.7, peakAmplitudeNS: 14.2, peakAmplitudeEW: 12.6,
        peakGroundAcceleration: 0.124,
        dominantFrequency: 2.1, recordingType: 'triggered',
        processingStatus: 'processed',
        magnitude: 6.3, magnitudeType: 'Mw',
        focalDepthKm: 15, epicentralDistanceKm: 120,
        soilCategory: 'III', locationName: 'Култук, р-н (Юж. Байкал)',
        dataSource: 'seismological_institute', isHistorical: true,
        notes: 'Культукское землетрясение 27.08.2008, Mw6.3. Вызвало повреждения зданий в Байкальске и Слюдянке.'
      },
      {
        recordId: 'HIST-BAI-2020-001',
        stationId: 'IRK-ST-003',
        startTime: new Date('2020-12-09T09:22:50Z'),
        endTime:   new Date('2020-12-09T09:25:30Z'),
        durationSec: 160, sampleRate: 100, channels: 'Z,NS,EW',
        peakAmplitudeZ: 6.2, peakAmplitudeNS: 5.1, peakAmplitudeEW: 4.4,
        peakGroundAcceleration: 0.041,
        dominantFrequency: 3.4, recordingType: 'triggered',
        processingStatus: 'processed',
        magnitude: 5.0, magnitudeType: 'Mw',
        focalDepthKm: 12, epicentralDistanceKm: 58,
        soilCategory: 'II', locationName: 'оз. Байкал (Сред. Байкал)',
        dataSource: 'seismological_institute', isHistorical: false,
        notes: 'Ощутимое землетрясение Байкала декабрь 2020 г. Баллы интенсивности до IV в Иркутске.'
      },
      {
        recordId: 'HIST-IRK-2021-001',
        stationId: 'IRK-ST-001',
        startTime: new Date('2021-09-05T03:48:17Z'),
        endTime:   new Date('2021-09-05T03:50:22Z'),
        durationSec: 125, sampleRate: 100, channels: 'Z,NS,EW',
        peakAmplitudeZ: 2.8, peakAmplitudeNS: 2.1, peakAmplitudeEW: 1.9,
        peakGroundAcceleration: 0.018,
        dominantFrequency: 4.2, recordingType: 'triggered',
        processingStatus: 'processed',
        magnitude: 3.8, magnitudeType: 'Ml',
        focalDepthKm: 8, epicentralDistanceKm: 32,
        soilCategory: 'III', locationName: 'г. Иркутск, р-н Ново-Ленино',
        dataSource: 'local', isHistorical: false,
        notes: 'Местное землетрясение под г. Иркутском. Записано всеми станциями сети.'
      },
      {
        recordId: 'HIST-BAI-1950-001',
        stationId: 'IRK-ST-001',
        startTime: new Date('1950-10-04T14:30:00Z'),
        endTime:   new Date('1950-10-04T14:36:00Z'),
        durationSec: 360, sampleRate: 20, channels: 'Z',
        peakAmplitudeZ: 38.5, peakAmplitudeNS: null, peakAmplitudeEW: null,
        peakGroundAcceleration: 0.31,
        dominantFrequency: 1.2, recordingType: 'historical',
        processingStatus: 'processed',
        magnitude: 7.2, magnitudeType: 'Ms',
        focalDepthKm: 25, epicentralDistanceKm: 240,
        soilCategory: 'II', locationName: 'Мондинское землетрясение (Вост. Саяны)',
        dataSource: 'historical', isHistorical: true,
        notes: 'Оцифрованная архивная запись на механическом сейсмографе. Одно из крупнейших землетрясений Прибайкалья XX века.'
      },
      {
        recordId: 'HIST-BAI-1957-001',
        stationId: 'IRK-ST-002',
        startTime: new Date('1957-06-27T03:42:00Z'),
        endTime:   new Date('1957-06-27T03:50:00Z'),
        durationSec: 480, sampleRate: 20, channels: 'Z,NS',
        peakAmplitudeZ: 28.9, peakAmplitudeNS: 22.4, peakAmplitudeEW: null,
        peakGroundAcceleration: 0.21,
        dominantFrequency: 0.9, recordingType: 'historical',
        processingStatus: 'processed',
        magnitude: 7.3, magnitudeType: 'Ms',
        focalDepthKm: 30, epicentralDistanceKm: 180,
        soilCategory: 'II', locationName: 'Муйское землетрясение (Витимское плоскогорье)',
        dataSource: 'historical', isHistorical: true,
        notes: 'Оцифровка архивной ленты СМ-3. Разрушения в Северобайкальском р-не.'
      },
      // ─── Recent monitoring records ─────────────────────────────────────────
      {
        recordId: 'MON-IRK001-2024-0412',
        stationId: 'IRK-ST-001',
        startTime: new Date('2024-04-12T16:22:10Z'),
        endTime:   new Date('2024-04-12T16:23:45Z'),
        durationSec: 95, sampleRate: 200, channels: 'Z,NS,EW',
        peakAmplitudeZ: 0.45, peakAmplitudeNS: 0.38, peakAmplitudeEW: 0.31,
        peakGroundAcceleration: 0.0028,
        dominantFrequency: 6.5, recordingType: 'triggered',
        processingStatus: 'filtered',
        magnitude: 1.9, magnitudeType: 'Ml',
        focalDepthKm: 5, epicentralDistanceKm: 12,
        soilCategory: 'III', locationName: 'г. Иркутск (Центр)',
        dataSource: 'local', isHistorical: false,
        notes: 'Слабое местное событие, подтверждено 3 станциями.'
      },
      {
        recordId: 'MON-IRK002-2024-0318',
        stationId: 'IRK-ST-002',
        startTime: new Date('2024-03-18T08:55:05Z'),
        endTime:   new Date('2024-03-18T08:57:20Z'),
        durationSec: 135, sampleRate: 200, channels: 'Z,NS,EW',
        peakAmplitudeZ: 1.2, peakAmplitudeNS: 0.95, peakAmplitudeEW: 0.88,
        peakGroundAcceleration: 0.0075,
        dominantFrequency: 4.8, recordingType: 'triggered',
        processingStatus: 'processed',
        magnitude: 2.4, magnitudeType: 'Ml',
        focalDepthKm: 7, epicentralDistanceKm: 28,
        soilCategory: 'II', locationName: 'Иркутское водохранилище (аквальная зона)',
        dataSource: 'local', isHistorical: false,
        notes: 'Возможно, техногенное событие в зоне Иркутского водохранилища.'
      },
      {
        recordId: 'MON-IRK005-2024-0601',
        stationId: 'IRK-ST-005',
        startTime: new Date('2024-06-01T22:12:44Z'),
        endTime:   new Date('2024-06-01T22:14:58Z'),
        durationSec: 134, sampleRate: 200, channels: 'Z,NS,EW',
        peakAmplitudeZ: 3.4, peakAmplitudeNS: 2.8, peakAmplitudeEW: 2.5,
        peakGroundAcceleration: 0.022,
        dominantFrequency: 3.1, recordingType: 'triggered',
        processingStatus: 'processed',
        magnitude: 3.2, magnitudeType: 'Ml',
        focalDepthKm: 10, epicentralDistanceKm: 45,
        soilCategory: 'IV', locationName: 'Листвянка — Байкал (северный залив)',
        dataSource: 'local', isHistorical: false,
        notes: 'Запись с береговой станции. Высокое усиление из-за мягкого аллювия (кат. IV).'
      },
      {
        recordId: 'IRIS-BAI-2022-001',
        stationId: 'IRK-ST-003',
        startTime: new Date('2022-11-14T07:30:55Z'),
        endTime:   new Date('2022-11-14T07:33:40Z'),
        durationSec: 165, sampleRate: 100, channels: 'Z,NS,EW',
        peakAmplitudeZ: 5.6, peakAmplitudeNS: 4.4, peakAmplitudeEW: 3.9,
        peakGroundAcceleration: 0.038,
        dominantFrequency: 2.6, recordingType: 'triggered',
        processingStatus: 'processed',
        magnitude: 4.7, magnitudeType: 'Mw',
        focalDepthKm: 18, epicentralDistanceKm: 75,
        soilCategory: 'I', locationName: 'Северобайкальское нагорье',
        dataSource: 'iris', isHistorical: false,
        notes: 'Запись получена по протоколу FDSN от глобальной сети IRIS.'
      },
    ];

    for (const rec of historicalRecords) {
      await dbStorage.createSeismogramRecord(rec);
    }
    console.log(`Seeded ${historicalRecords.length} seismogram catalog records.`);
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
