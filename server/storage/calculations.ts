import { db, schema } from "../db";
import { eq, inArray } from "drizzle-orm";
import { CalculationNoteHistory, ComparisonSet, InsertCalculationNoteHistory, InsertComparisonSet, InsertSeismicCalculation, SeismicCalculation } from "@shared/schema";
import { customerWhere, objectIdsWhere, andAll } from "./scope";
import { NOTE_HISTORY_LIMIT, type Scope } from "./types";

const calcScope = (scope: Scope) =>
  andAll(customerWhere(scope, schema.seismicCalculations.customerId), objectIdsWhere(scope, schema.seismicCalculations.objectId));

export const calculationsStorage = {
  // ─── Seismic calculation operations ──────────────────────────────────────────
  async getSeismicCalculations(calcType: string | undefined, limit = 50, scope: Scope): Promise<SeismicCalculation[]> {
    return db.query.seismicCalculations.findMany({
      where: andAll(
        calcType ? eq(schema.seismicCalculations.calcType, calcType) : undefined,
        calcScope(scope),
      ),
      orderBy: (t, { desc }) => [desc(t.createdAt)],
      limit,
    });
  },
  async getSeismicCalculation(id: number, scope: Scope): Promise<SeismicCalculation | undefined> {
    return db.query.seismicCalculations.findFirst({ where: andAll(eq(schema.seismicCalculations.id, id), calcScope(scope)) });
  },
  async createSeismicCalculation(calc: InsertSeismicCalculation, customerId: number): Promise<SeismicCalculation> {
    const [row] = await db.insert(schema.seismicCalculations).values({ ...calc, customerId }).returning();
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
  async getComparisonSets(scope: Scope): Promise<ComparisonSet[]> {
    return db.query.comparisonSets.findMany({
      where: customerWhere(scope, schema.comparisonSets.customerId),
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    });
  },
  async getComparisonSet(id: number, scope: Scope): Promise<ComparisonSet | undefined> {
    return db.query.comparisonSets.findFirst({
      where: andAll(eq(schema.comparisonSets.id, id), customerWhere(scope, schema.comparisonSets.customerId)),
    });
  },
  async createComparisonSet(set: InsertComparisonSet, customerId: number): Promise<ComparisonSet> {
    const [row] = await db.insert(schema.comparisonSets).values({ ...set, customerId }).returning();
    return row;
  },
  async deleteComparisonSet(id: number): Promise<boolean> {
    const res = await db.delete(schema.comparisonSets)
      .where(eq(schema.comparisonSets.id, id))
      .returning({ id: schema.comparisonSets.id });
    return res.length > 0;
  },
};
