import { db, schema } from "../db";
import { and, desc, eq, isNull, ne, or, type SQL } from "drizzle-orm";
import { Alert, InsertAlert, InsertResearchNetwork, InsertSystemStatus, ResearchNetwork, SystemStatus, alerts, researchNetworks, systemStatus } from "@shared/schema";
import { stationInCustomer } from "./scope";
import type { Scope } from "./types";

/**
 * Alerts are polymorphic (relatedEntityType/relatedEntityId): only station-linked
 * alerts carry a customer through stationInCustomer. Non-station alerts (or alerts
 * with no related entity) are not customer-scoped and remain visible; in "all
 * customers" mode (scope.customerId === null) nothing is filtered.
 * Shared by getAlerts and both mutations so they can never drift apart.
 */
function alertScopeWhere(scope: Scope): SQL | undefined {
  if (scope.customerId === null) return undefined;
  return or(ne(alerts.relatedEntityType, 'station'), isNull(alerts.relatedEntityType), stationInCustomer(scope, alerts.relatedEntityId));
}

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
  // Plain select/update builder, not db.query.*: the relational query API wraps the
  // table in a camelCase-aliased subquery, which breaks the correlated EXISTS
  // inside stationInCustomer ("invalid reference to FROM-clause entry").
  async getAlerts(limit: number, scope: Scope): Promise<Alert[]> {
    return db.select().from(schema.alerts)
      .where(alertScopeWhere(scope))
      .orderBy(desc(alerts.timestamp))
      .limit(limit);
  },

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const [newAlert] = await db.insert(schema.alerts).values(alert).returning();
    return newAlert;
  },

  async markAlertAsRead(id: number, scope: Scope): Promise<Alert | undefined> {
    const [updatedAlert] = await db
      .update(schema.alerts)
      .set({ isRead: true })
      .where(and(eq(schema.alerts.id, id), alertScopeWhere(scope)))
      .returning();
    return updatedAlert;
  },

  async markAllAlertsAsRead(scope: Scope): Promise<void> {
    await db.update(schema.alerts)
      .set({ isRead: true })
      .where(and(eq(schema.alerts.isRead, false), alertScopeWhere(scope)));
  },
};
