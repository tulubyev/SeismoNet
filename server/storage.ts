import { 
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
  InsertAlert
} from "@shared/schema";

// Interface for storage operations
export interface IStorage {
  // Station operations
  getStations(): Promise<Station[]>;
  getStation(id: number): Promise<Station | undefined>;
  getStationByStationId(stationId: string): Promise<Station | undefined>;
  createStation(station: InsertStation): Promise<Station>;
  updateStationStatus(stationId: string, status: string): Promise<Station | undefined>;
  
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
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private stations: Map<number, Station>;
  private events: Map<number, Event>;
  private waveformData: Map<number, WaveformData>;
  private researchNetworks: Map<number, ResearchNetwork>;
  private systemStatuses: Map<number, SystemStatus>;
  private alerts: Map<number, Alert>;
  
  private currentStationId: number;
  private currentEventId: number;
  private currentWaveformDataId: number;
  private currentNetworkId: number;
  private currentStatusId: number;
  private currentAlertId: number;
  
  constructor() {
    this.stations = new Map();
    this.events = new Map();
    this.waveformData = new Map();
    this.researchNetworks = new Map();
    this.systemStatuses = new Map();
    this.alerts = new Map();
    
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
      const updatedAlert: Alert = {
        ...alert,
        isRead: true
      };
      this.alerts.set(id, updatedAlert);
      return updatedAlert;
    }
    return undefined;
  }
}

export const storage = new MemStorage();
