import { Router } from "express";
import { storage } from "../storage";
import { insertDeveloperSchema } from "@shared/schema";
import { requireRole } from "../auth";

const router = Router();


// ─── Developers API ───────────────────────────────────────────────────────────

router.get('/api/developers', async (_req, res) => {
  try {
    const list = await storage.getDevelopers();
    res.json(list);
  } catch (e) {
    console.error('GET /api/developers error:', e);
    res.status(500).json({ message: 'Error fetching developers' });
  }
});

router.get('/api/developers/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const dev = await storage.getDeveloper(id);
    if (!dev) return res.status(404).json({ message: 'Developer not found' });
    res.json(dev);
  } catch (e) {
    res.status(500).json({ message: 'Error fetching developer' });
  }
});

router.post('/api/developers', requireRole(['administrator', 'user']), async (req, res) => {
  try {
    const parsed = insertDeveloperSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid developer payload', errors: parsed.error.flatten() });
    }
    const created = await storage.createDeveloper(parsed.data);
    res.status(201).json(created);
  } catch (e) {
    console.error('POST /api/developers error:', e);
    res.status(500).json({ message: 'Error creating developer' });
  }
});

router.patch('/api/developers/:id', requireRole(['administrator', 'user']), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid id' });
    const parsed = insertDeveloperSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid developer payload', errors: parsed.error.flatten() });
    }
    const updated = await storage.updateDeveloper(id, parsed.data);
    if (!updated) return res.status(404).json({ message: 'Developer not found' });
    res.json(updated);
  } catch (e) {
    console.error('PATCH /api/developers error:', e);
    res.status(500).json({ message: 'Error updating developer' });
  }
});

router.delete('/api/developers/:id', requireRole(['administrator']), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid id' });
    const ok = await storage.deleteDeveloper(id);
    if (!ok) return res.status(404).json({ message: 'Developer not found' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: 'Error deleting developer' });
  }
});

// ─── Seismic Calculations API ─────────────────────────────────────────────────

export default router;
