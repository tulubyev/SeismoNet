import { Router } from "express";
import { storage } from "../storage";
import { requirePermission } from "../auth";

const router = Router();


// ─── Infrastructure Objects API ────────────────────────────────────────────────

router.get('/api/infrastructure-objects', requirePermission('objects', 'read'), async (req, res) => {
  try {
    const objects = await storage.getInfrastructureObjects(req.objectScope);
    res.json(objects);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching infrastructure objects' });
  }
});

router.get('/api/infrastructure-objects/:id', requirePermission('objects', 'read'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const obj = await storage.getInfrastructureObject(id, req.objectScope);
    if (!obj) return res.status(404).json({ message: 'Object not found' });
    res.json(obj);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching infrastructure object' });
  }
});

router.post('/api/infrastructure-objects', requirePermission('objects', 'write'), async (req, res) => {
  try {
    const newObj = await storage.createInfrastructureObject(req.body);
    res.status(201).json(newObj);
  } catch (error) {
    res.status(500).json({ message: 'Error creating infrastructure object' });
  }
});

router.patch('/api/infrastructure-objects/:id', requirePermission('objects', 'write'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updated = await storage.updateInfrastructureObject(id, req.body);
    if (!updated) return res.status(404).json({ message: 'Object not found' });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Error updating infrastructure object' });
  }
});

router.delete('/api/infrastructure-objects/:id', requirePermission('objects', 'write'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const ok = await storage.deleteInfrastructureObject(id);
    if (!ok) return res.status(404).json({ message: 'Object not found' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting infrastructure object' });
  }
});

// ─── Developers API ───────────────────────────────────────────────────────────



// ─── Object Categories API ────────────────────────────────────────────────────

router.get('/api/object-categories', requirePermission('objects', 'read'), async (_req, res) => {
  try {
    const cats = await storage.getObjectCategories();
    res.json(cats);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching object categories' });
  }
});

router.post('/api/object-categories', requirePermission('objects', 'write'), async (req, res) => {
  try {
    const cat = await storage.createObjectCategory(req.body);
    res.status(201).json(cat);
  } catch (error) {
    res.status(500).json({ message: 'Error creating object category' });
  }
});

router.patch('/api/object-categories/:id', requirePermission('objects', 'write'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updated = await storage.updateObjectCategory(id, req.body);
    if (!updated) return res.status(404).json({ message: 'Category not found' });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Error updating object category' });
  }
});

router.delete('/api/object-categories/:id', requirePermission('objects', 'write'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const ok = await storage.deleteObjectCategory(id);
    if (!ok) return res.status(404).json({ message: 'Category not found' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting object category' });
  }
});

// ─── Soil Profiles API ─────────────────────────────────────────────────────────

export default router;
