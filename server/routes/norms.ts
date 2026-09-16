import { Router } from "express";
import { storage } from "../storage";
import { requireRole } from "../auth";

const router = Router();


// ─── Building Norms API ────────────────────────────────────────────────────────

router.get('/api/building-norms', async (req, res) => {
  try {
    const category = req.query.category as string | undefined;
    const norms = await storage.getBuildingNorms(category);
    res.json(norms);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching building norms' });
  }
});

router.get('/api/building-norms/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const norm = await storage.getBuildingNorm(id);
    if (!norm) return res.status(404).json({ message: 'Norm not found' });
    res.json(norm);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching building norm' });
  }
});

router.post('/api/building-norms', requireRole('administrator'), async (req, res) => {
  try {
    const norm = await storage.createBuildingNorm(req.body);
    res.status(201).json(norm);
  } catch (error) {
    res.status(500).json({ message: 'Error creating building norm' });
  }
});

// ─── Seismogram Records API ────────────────────────────────────────────────────

export default router;
