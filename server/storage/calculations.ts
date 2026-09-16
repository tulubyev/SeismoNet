import { db, schema } from "../db";
import { desc, eq, inArray } from "drizzle-orm";
import { CalculationNoteHistory, ComparisonSet, InsertCalculationNoteHistory, InsertComparisonSet, InsertSeismicCalculation, SeismicCalculation } from "@shared/schema";
import { NOTE_HISTORY_LIMIT } from "./types";

export const calculationsStorage = {
  // ─── Seismic calculation operations ──────────────────────────────────────────
  async getSeismicCalculations(calcType?: string, limit = 50): Promise<SeismicCalculation[]> {
    return db.query.seismicCalculations.findMany({
      where: calcType ? (t, { eq }) => eq(t.calcType, calcType) : undefined,
      orderBy: (t, { desc }) => [desc(t.createdAt)],
      limit,
    });
  },
  async getSeismicCalculation(id: number): Promise<SeismicCalculation | undefined> {
    return db.query.seismicCalculations.findFirst({ where: (t, { eq }) => eq(t.id, id) });
  },
  async createSeismicCalculation(calc: InsertSeismicCalculation): Promise<SeismicCalculation> {
    const [row] = await db.insert(schema.seismicCalculations).values(calc).returning();
    return row;
  },
  async updateSeismicCalculation(id: number, data: Partial<Pick<InsertSeismicCalculation, 'notes'>> & { notesUpdatedBy?: string | null }): Promise<SeismicCalculation | undefined> {
    const patch: Record<string, unknown> = {};
    if (data.notes !== undefined) {
      const existing = await db.query.seismicCalculations.findFirst({ where: (t, { eq }) => eq(t.id, id) });
      if (!existing) return undefined;
      await calculationsStorage.createCalculationNoteHistory({
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
  },
  async deleteSeismicCalculation(id: number): Promise<boolean> {
    const res = await db.delete(schema.seismicCalculations)
      .where(eq(schema.seismicCalculations.id, id))
      .returning({ id: schema.seismicCalculations.id });
    return res.length > 0;
  },

  // ─── Calculation note history ────────────────────────────────────────────────
  async getCalculationNoteHistory(calculationId: number): Promise<CalculationNoteHistory[]> {
    return db.query.calculationNoteHistory.findMany({
      where: (t, { eq }) => eq(t.calculationId, calculationId),
      orderBy: (t, { asc }) => [asc(t.editedAt)],
    });
  },
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
  },

  // ─── Comparison set operations ───────────────────────────────────────────────
  async getComparisonSets(): Promise<ComparisonSet[]> {
    return db.query.comparisonSets.findMany({
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    });
  },
  async getComparisonSet(id: number): Promise<ComparisonSet | undefined> {
    return db.query.comparisonSets.findFirst({ where: (t, { eq }) => eq(t.id, id) });
  },
  async createComparisonSet(set: InsertComparisonSet): Promise<ComparisonSet> {
    const [row] = await db.insert(schema.comparisonSets).values(set).returning();
    return row;
  },
  async deleteComparisonSet(id: number): Promise<boolean> {
    const res = await db.delete(schema.comparisonSets)
      .where(eq(schema.comparisonSets.id, id))
      .returning({ id: schema.comparisonSets.id });
    return res.length > 0;
  },
};
