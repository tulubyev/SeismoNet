import { db, schema } from "../db";
import { desc, eq } from "drizzle-orm";
import { Alert, InsertAlert, InsertResearchNetwork, InsertSystemStatus, ResearchNetwork, SystemStatus, alerts, researchNetworks, systemStatus } from "@shared/schema";

export const monitoringStorage = {
  // Research network operations
  async getResearchNetworks(): Promise<ResearchNetwork[]> {
    return db.query.researchNetworks.findMany();
  },
  
  async getResearchNetwork(id: number): Promise<ResearchNetwork | undefined> {
    return db.query.researchNetworks.findFirst({
      where: (networks, { eq }) => eq(networks.id, id)
    });
  },
  
  async getResearchNetworkByNetworkId(networkId: string): Promise<ResearchNetwork | undefined> {
    return db.query.researchNetworks.findFirst({
      where: (networks, { eq }) => eq(networks.networkId, networkId)
    });
  },
  
  async createResearchNetwork(network: InsertResearchNetwork): Promise<ResearchNetwork> {
    const [newNetwork] = await db.insert(schema.researchNetworks).values(network).returning();
    return newNetwork;
  },
  
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
  },
  
  // System status operations
  async getSystemStatus(): Promise<SystemStatus[]> {
    return db.query.systemStatus.findMany();
  },
  
  async createSystemStatus(status: InsertSystemStatus): Promise<SystemStatus> {
    const [newStatus] = await db.insert(schema.systemStatus).values(status).returning();
    return newStatus;
  },
  
  // Alert operations
  async getAlerts(limit: number): Promise<Alert[]> {
    return db.query.alerts.findMany({
      orderBy: (alerts, { desc }) => [desc(alerts.timestamp)],
      limit
    });
  },
  
  async createAlert(alert: InsertAlert): Promise<Alert> {
    const [newAlert] = await db.insert(schema.alerts).values(alert).returning();
    return newAlert;
  },
  
  async markAlertAsRead(id: number): Promise<Alert | undefined> {
    const [updatedAlert] = await db
      .update(schema.alerts)
      .set({ isRead: true })
      .where(eq(schema.alerts.id, id))
      .returning();
    return updatedAlert;
  },

  async markAllAlertsAsRead(): Promise<void> {
    await db.update(schema.alerts).set({ isRead: true }).where(eq(schema.alerts.isRead, false));
  },
};
