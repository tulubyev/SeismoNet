import { Router } from "express";
import { storage } from "../storage";
import { requirePermission, requireCustomer, scopeOf } from "../auth";

const router = Router();


// ─── Soil Profiles API ─────────────────────────────────────────────────────────

router.get('/api/soil-profiles', requirePermission('soil', 'read'), async (req, res) => {
  try {
    const objectId = req.query.objectId ? parseInt(req.query.objectId as string) : undefined;
    const profiles = await storage.getSoilProfiles(objectId, scopeOf(req));
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
    const profile = await storage.getSoilProfileNearCoords(lat, lng, scopeOf(req));
    if (!profile) return res.status(404).json({ message: 'No profile near given coordinates' });
    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: 'Error looking up nearest soil profile' });
  }
});

router.get('/api/soil-profiles/:id', requirePermission('soil', 'read'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const profile = await storage.getSoilProfile(id, scopeOf(req));
    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching soil profile' });
  }
});

router.get('/api/soil-profiles/:id/layers', requirePermission('soil', 'read'), async (req, res) => {
  try {
    const profileId = parseInt(req.params.id);
    const profile = await storage.getSoilProfile(profileId, scopeOf(req));
    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    const layers = await storage.getSoilLayers(profileId);
    res.json(layers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching soil layers' });
  }
});

router.post('/api/soil-profiles', requirePermission('soil', 'write'), async (req, res) => {
  try {
    const customerId = requireCustomer(req, res); if (customerId === undefined) return;
    const { customerId: _ignored, ...body } = req.body ?? {};
    const profile = await storage.createSoilProfile(body, customerId);
    res.status(201).json(profile);
  } catch (error) {
    res.status(500).json({ message: 'Error creating soil profile' });
  }
});

router.post('/api/soil-layers', requirePermission('soil', 'write'), async (req, res) => {
  try {
    const profileId = req.body?.profileId;
    const profile = await storage.getSoilProfile(profileId, scopeOf(req));
    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    const layer = await storage.createSoilLayer(req.body);
    res.status(201).json(layer);
  } catch (error) {
    res.status(500).json({ message: 'Error creating soil layer' });
  }
});

router.patch('/api/soil-profiles/:id', requirePermission('soil', 'write'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await storage.getSoilProfile(id, scopeOf(req));
    if (!existing) return res.status(404).json({ message: 'Profile not found' });
    const { customerId: _c, id: _i, ...data } = req.body ?? {};
    const updated = await storage.updateSoilProfile(id, data);
    if (!updated) return res.status(404).json({ message: 'Profile not found' });
    res.json(updated);
  } catch (error) { res.status(500).json({ message: 'Error updating soil profile' }); }
});

router.delete('/api/soil-profiles/:id', requirePermission('soil', 'write'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const profile = await storage.getSoilProfile(id, scopeOf(req));
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
    const id = parseInt(req.params.id);
    const scope = scopeOf(req);
    const existing = await storage.getSoilLayer(id, scope);
    if (!existing) return res.status(404).json({ message: 'Layer not found' });
    const { customerId: _c, id: _i, ...data } = req.body ?? {};
    if (data.profileId != null) {
      const profile = await storage.getSoilProfile(data.profileId, scope);
      if (!profile) return res.status(400).json({ error: 'unknown profile' });
    }
    const updated = await storage.updateSoilLayer(id, data);
    if (!updated) return res.status(404).json({ message: 'Layer not found' });
    res.json(updated);
  } catch (error) { res.status(500).json({ message: 'Error updating soil layer' }); }
});

router.delete('/api/soil-layers/:id', requirePermission('soil', 'write'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await storage.getSoilLayer(id, scopeOf(req));
    if (!existing) return res.status(404).json({ message: 'Layer not found' });
    const ok = await storage.deleteSoilLayer(id);
    if (!ok) return res.status(404).json({ message: 'Layer not found' });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ message: 'Error deleting soil layer' }); }
});

// ─── Sensor Installations API ──────────────────────────────────────────────────

export default router;
