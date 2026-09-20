import { Router } from "express";
import { storage } from "../storage";
import { insertDeveloperSchema } from "@shared/schema";
import { requirePermission, requireCustomer, scopeOf } from "../auth";

const router = Router();


// ─── Developers API ───────────────────────────────────────────────────────────

router.get('/api/developers', requirePermission('objects', 'read'), async (req, res) => {
  try {
    const list = await storage.getDevelopers(scopeOf(req));
    res.json(list);
  } catch (e) {
    console.error('GET /api/developers error:', e);
    res.status(500).json({ message: 'Error fetching developers' });
  }
});

router.get('/api/developers/:id', requirePermission('objects', 'read'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const dev = await storage.getDeveloper(id, scopeOf(req));
    if (!dev) return res.status(404).json({ message: 'Developer not found' });
    res.json(dev);
  } catch (e) {
    res.status(500).json({ message: 'Error fetching developer' });
  }
});

router.post('/api/developers', requirePermission('objects', 'write'), async (req, res) => {
  try {
    const customerId = requireCustomer(req, res); if (customerId === undefined) return;
    const parsed = insertDeveloperSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid developer payload', errors: parsed.error.flatten() });
    }
    const created = await storage.createDeveloper(parsed.data, customerId);
    res.status(201).json(created);
  } catch (e) {
    console.error('POST /api/developers error:', e);
    res.status(500).json({ message: 'Error creating developer' });
  }
});

router.patch('/api/developers/:id', requirePermission('objects', 'write'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid id' });
    const existing = await storage.getDeveloper(id, scopeOf(req));
    if (!existing) return res.status(404).json({ message: 'Developer not found' });
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

router.delete('/api/developers/:id', requirePermission('objects', 'write'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid id' });
    const existing = await storage.getDeveloper(id, scopeOf(req));
    if (!existing) return res.status(404).json({ message: 'Developer not found' });
    const ok = await storage.deleteDeveloper(id);
    if (!ok) return res.status(404).json({ message: 'Developer not found' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: 'Error deleting developer' });
  }
});

// ─── Seismic Calculations API ─────────────────────────────────────────────────

export default router;
