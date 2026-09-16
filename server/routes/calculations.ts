import { Router } from "express";
import { storage } from "../storage";
import { insertSeismicCalculationSchema } from "@shared/schema";
import { requireRole } from "../auth";

const router = Router();


// ─── Seismic Calculations API ─────────────────────────────────────────────────

router.get('/api/calculations', async (req, res) => {
  try {
    const { type, limit } = req.query;
    const rows = await storage.getSeismicCalculations(
      type as string | undefined,
      limit ? parseInt(limit as string) : 50
    );
    res.json(rows);
  } catch (e) {
    console.error('GET /api/calculations failed:', e);
    res.status(500).json({ message: 'Error fetching calculations' });
  }
});

router.get('/api/calculations/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const row = await storage.getSeismicCalculation(id);
    if (!row) return res.status(404).json({ message: 'Calculation not found' });
    res.json(row);
  } catch (e) {
    res.status(500).json({ message: 'Error fetching calculation' });
  }
});

router.post('/api/calculations', requireRole(['administrator', 'user']), async (req, res) => {
  try {
    const parsed = insertSeismicCalculationSchema.safeParse({
      ...req.body,
      createdBy: (req.user as { id?: number } | undefined)?.id ?? null,
    });
    if (!parsed.success) return res.status(400).json({ message: 'Invalid calculation data', errors: parsed.error.flatten() });
    const row = await storage.createSeismicCalculation(parsed.data);
    res.status(201).json(row);
  } catch (e) {
    res.status(500).json({ message: 'Error saving calculation' });
  }
});

router.patch('/api/calculations/:id', requireRole(['administrator', 'user']), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid id' });
    const patchSchema = insertSeismicCalculationSchema.pick({ notes: true }).partial();
    const parsed = patchSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Invalid patch data', errors: parsed.error.flatten() });
    const editor = (req.user as { username?: string } | undefined)?.username ?? null;
    const row = await storage.updateSeismicCalculation(id, { ...parsed.data, notesUpdatedBy: editor });
    if (!row) return res.status(404).json({ message: 'Calculation not found' });
    res.json(row);
  } catch (e) {
    console.error('PATCH /api/calculations/:id failed:', e);
    res.status(500).json({ message: 'Error updating calculation' });
  }
});

router.get('/api/calculations/:id/note-history', requireRole(['administrator', 'user', 'viewer']), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid id' });
    const history = await storage.getCalculationNoteHistory(id);
    res.json(history);
  } catch (e) {
    console.error('GET /api/calculations/:id/note-history failed:', e);
    res.status(500).json({ message: 'Error fetching note history' });
  }
});

router.post('/api/calculations/:id/note-history/revert', requireRole(['administrator', 'user']), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid id' });
    const { historyId } = req.body as { historyId?: number };
    if (typeof historyId !== 'number') return res.status(400).json({ message: 'historyId required' });
    const history = await storage.getCalculationNoteHistory(id);
    const entry = history.find(h => h.id === historyId);
    if (!entry) return res.status(404).json({ message: 'History entry not found' });
    const editor = (req.user as { username?: string } | undefined)?.username ?? null;
    const row = await storage.updateSeismicCalculation(id, { notes: entry.previousText, notesUpdatedBy: editor });
    if (!row) return res.status(404).json({ message: 'Calculation not found' });
    res.json(row);
  } catch (e) {
    console.error('POST /api/calculations/:id/note-history/revert failed:', e);
    res.status(500).json({ message: 'Error reverting note' });
  }
});

router.delete('/api/calculations/:id', requireRole(['administrator']), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const ok = await storage.deleteSeismicCalculation(id);
    if (!ok) return res.status(404).json({ message: 'Calculation not found' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: 'Error deleting calculation' });
  }
});

// ─── Saved comparison sets API ────────────────────────────────────────────────

router.get('/api/comparison-sets', async (_req, res) => {
  try {
    const sets = await storage.getComparisonSets();
    res.json(sets);
  } catch (e) {
    console.error('GET /api/comparison-sets failed:', e);
    res.status(500).json({ message: 'Error fetching comparison sets' });
  }
});

router.post('/api/comparison-sets', requireRole(['administrator', 'user']), async (req, res) => {
  try {
    const { name, calcType, calcIds } = req.body ?? {};
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ message: 'name is required' });
    }
    if (typeof calcType !== 'string' || !calcType.trim()) {
      return res.status(400).json({ message: 'calcType is required' });
    }
    if (!Array.isArray(calcIds) || calcIds.length < 2 ||
        !calcIds.every((n: unknown) => Number.isInteger(n))) {
      return res.status(400).json({ message: 'calcIds must be an integer array of length >= 2' });
    }
    const set = await storage.createComparisonSet({
      name: name.trim().slice(0, 120),
      calcType,
      calcIds: calcIds as number[],
      createdBy: (req.user as { username?: string } | undefined)?.username ?? null,
    });
    res.status(201).json(set);
  } catch (e) {
    console.error('POST /api/comparison-sets failed:', e);
    res.status(500).json({ message: 'Error creating comparison set' });
  }
});

router.delete('/api/comparison-sets/:id', requireRole(['administrator', 'user']), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const ok = await storage.deleteComparisonSet(id);
    if (!ok) return res.status(404).json({ message: 'Comparison set not found' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: 'Error deleting comparison set' });
  }
});

// ─── Object Categories API ────────────────────────────────────────────────────

export default router;
