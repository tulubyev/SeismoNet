import { Router } from "express";
import { and } from "drizzle-orm";
import { storage } from "../storage";
import { requirePermission } from "../auth";

const router = Router();


// ─── Soil Profiles API ─────────────────────────────────────────────────────────

router.get('/api/soil-profiles', requirePermission('soil', 'read'), async (req, res) => {
  try {
    const objectId = req.query.objectId ? parseInt(req.query.objectId as string) : undefined;
    const profiles = await storage.getSoilProfiles(objectId);
    res.json(profiles);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching soil profiles' });
  }
});

router.get('/api/soil-profiles/nearest', requirePermission('soil', 'read'), async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    if (isNaN(lat) || isNaN(lng)) return res.status(400).json({ message: 'lat and lng query params required' });
    const profile = await storage.getSoilProfileNearCoords(lat, lng);
    if (!profile) return res.status(404).json({ message: 'No profile near given coordinates' });
    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: 'Error looking up nearest soil profile' });
  }
});

router.get('/api/soil-profiles/:id', requirePermission('soil', 'read'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const profile = await storage.getSoilProfile(id);
    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching soil profile' });
  }
});

router.get('/api/soil-profiles/:id/layers', requirePermission('soil', 'read'), async (req, res) => {
  try {
    const profileId = parseInt(req.params.id);
    const layers = await storage.getSoilLayers(profileId);
    res.json(layers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching soil layers' });
  }
});

router.post('/api/soil-profiles', requirePermission('soil', 'write'), async (req, res) => {
  try {
    const profile = await storage.createSoilProfile(req.body);
    res.status(201).json(profile);
  } catch (error) {
    res.status(500).json({ message: 'Error creating soil profile' });
  }
});

router.post('/api/soil-layers', requirePermission('soil', 'write'), async (req, res) => {
  try {
    const layer = await storage.createSoilLayer(req.body);
    res.status(201).json(layer);
  } catch (error) {
    res.status(500).json({ message: 'Error creating soil layer' });
  }
});

router.patch('/api/soil-profiles/:id', requirePermission('soil', 'write'), async (req, res) => {
  try {
    const updated = await storage.updateSoilProfile(parseInt(req.params.id), req.body);
    if (!updated) return res.status(404).json({ message: 'Profile not found' });
    res.json(updated);
  } catch (error) { res.status(500).json({ message: 'Error updating soil profile' }); }
});

router.delete('/api/soil-profiles/:id', requirePermission('soil', 'write'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const profile = await storage.getSoilProfile(id);
    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    const layers = await storage.getSoilLayers(id);
    for (const layer of layers) await storage.deleteSoilLayer(layer.id);
    const ok = await storage.deleteSoilProfile(id);
    if (!ok) return res.status(500).json({ message: 'Failed to delete profile' });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ message: 'Error deleting soil profile' }); }
});

router.patch('/api/soil-layers/:id', requirePermission('soil', 'write'), async (req, res) => {
  try {
    const updated = await storage.updateSoilLayer(parseInt(req.params.id), req.body);
    if (!updated) return res.status(404).json({ message: 'Layer not found' });
    res.json(updated);
  } catch (error) { res.status(500).json({ message: 'Error updating soil layer' }); }
});

router.delete('/api/soil-layers/:id', requirePermission('soil', 'write'), async (req, res) => {
  try {
    const ok = await storage.deleteSoilLayer(parseInt(req.params.id));
    if (!ok) return res.status(404).json({ message: 'Layer not found' });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ message: 'Error deleting soil layer' }); }
});

// ─── Sensor Installations API ──────────────────────────────────────────────────

export default router;
