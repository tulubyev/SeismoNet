import { db, schema } from "../db";
import { desc, eq } from "drizzle-orm";
import { Event, InsertEvent, InsertWaveformData, WaveformData, events, waveformData } from "@shared/schema";

export const eventsStorage = {
  // Event operations
  async getEvents(): Promise<Event[]> {
    return db.query.events.findMany();
  },
  
  async getRecentEvents(limit: number): Promise<Event[]> {
    return db.query.events.findMany({
      orderBy: (events, { desc }) => [desc(events.timestamp)],
      limit
    });
  },
  
  async getEvent(id: number): Promise<Event | undefined> {
    return db.query.events.findFirst({
      where: (events, { eq }) => eq(events.id, id)
    });
  },
  
  async getEventByEventId(eventId: string): Promise<Event | undefined> {
    return db.query.events.findFirst({
      where: (events, { eq }) => eq(events.eventId, eventId)
    });
  },
  
  async createEvent(event: InsertEvent): Promise<Event> {
    const [newEvent] = await db.insert(schema.events).values(event).returning();
    return newEvent;
  },
  
  async updateEventStatus(eventId: string, status: string): Promise<Event | undefined> {
    const [updatedEvent] = await db
      .update(schema.events)
      .set({ status })
      .where(eq(schema.events.eventId, eventId))
      .returning();
    return updatedEvent;
  },
  
  // Waveform data operations
  async getWaveformData(stationId: string, limit: number): Promise<WaveformData[]> {
    return db.query.waveformData.findMany({
      where: (waveformData, { eq }) => eq(waveformData.stationId, stationId),
      orderBy: (waveformData, { desc }) => [desc(waveformData.timestamp)],
      limit
    });
  },
  
  async createWaveformData(data: InsertWaveformData): Promise<WaveformData> {
    const [newData] = await db.insert(schema.waveformData).values(data).returning();
    return newData;
  },
};
