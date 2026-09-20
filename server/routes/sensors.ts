import { Router } from "express";
import { storage } from "../storage";
import { requirePermission, requireCustomer, scopeOf } from "../auth";

const router = Router();


// ─── Sensor Installations API ──────────────────────────────────────────────────

router.get('/api/sensor-installations', requirePermission('sensors', 'read'), async (req, res) => {
  try {
    const objectId = req.query.objectId ? parseInt(req.query.objectId as string) : undefined;
    const installations = await storage.getSensorInstallations(objectId, scopeOf(req));
    res.json(installations);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching sensor installations' });
  }
});

router.post('/api/sensor-installations', requirePermission('sensors', 'write'), async (req, res) => {
  try {
    const scope = scopeOf(req);
    const station = await storage.getStationByStationId(req.body?.stationId, scope);
    if (!station) return res.status(400).json({ error: 'unknown station/object' });
    if (req.body?.objectId != null) {
      const obj = await storage.getInfrastructureObject(req.body.objectId, scope);
      if (!obj) return res.status(400).json({ error: 'unknown station/object' });
    }
    const installation = await storage.createSensorInstallation(req.body);
    res.status(201).json(installation);
  } catch (error) {
    res.status(500).json({ message: 'Error creating sensor installation' });
  }
});

router.patch('/api/sensor-installations/:id', requirePermission('sensors', 'write'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const scope = scopeOf(req);
    const existing = await storage.getSensorInstallation(id, scope);
    if (!existing) return res.status(404).json({ message: 'Installation not found' });
    const { customerId: _c, id: _i, ...data } = req.body ?? {};
    if (data.stationId != null) {
      const station = await storage.getStationByStationId(data.stationId, scope);
      if (!station) return res.status(400).json({ error: 'unknown station/object' });
    }
    if (data.objectId != null) {
      const obj = await storage.getInfrastructureObject(data.objectId, scope);
      if (!obj) return res.status(400).json({ error: 'unknown station/object' });
    }
    const updated = await storage.updateSensorInstallation(id, data);
    if (!updated) return res.status(404).json({ message: 'Installation not found' });
    res.json(updated);
  } catch (error) { res.status(500).json({ message: 'Error updating sensor installation' }); }
});

router.delete('/api/sensor-installations/:id', requirePermission('sensors', 'write'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await storage.getSensorInstallation(id, scopeOf(req));
    if (!existing) return res.status(404).json({ message: 'Installation not found' });
    const ok = await storage.deleteSensorInstallation(id);
    if (!ok) return res.status(404).json({ message: 'Installation not found' });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ message: 'Error deleting sensor installation' }); }
});

// ─── Sensor Devices API ───────────────────────────────────────────────────────

router.get('/api/sensors', requirePermission('sensors', 'read'), async (req, res) => {
  try {
    const stationId = req.query.stationId as string | undefined;
    const objectId = req.query.objectId ? parseInt(req.query.objectId as string) : undefined;
    res.json(await storage.getSensors(stationId, objectId, scopeOf(req)));
  } catch { res.status(500).json({ message: 'Error fetching sensors' }); }
});

router.get('/api/sensors/:id', requirePermission('sensors', 'read'), async (req, res) => {
  try {
    const sensor = await storage.getSensor(parseInt(req.params.id), scopeOf(req));
    if (!sensor) return res.status(404).json({ message: 'Sensor not found' });
    res.json(sensor);
  } catch { res.status(500).json({ message: 'Error fetching sensor' }); }
});

router.post('/api/sensors', requirePermission('sensors', 'write'), async (req, res) => {
  try {
    const scope = scopeOf(req);
    if (req.body?.stationId != null) {
      const station = await storage.getStationByStationId(req.body.stationId, scope);
      if (!station) return res.status(400).json({ error: 'unknown station/object' });
    }
    if (req.body?.objectId != null) {
      const obj = await storage.getInfrastructureObject(req.body.objectId, scope);
      if (!obj) return res.status(400).json({ error: 'unknown station/object' });
    }
    const customerId = requireCustomer(req, res); if (customerId === undefined) return;
    const { customerId: _ignored, ...body } = req.body ?? {};
    res.status(201).json(await storage.createSensor(body, customerId));
  } catch { res.status(500).json({ message: 'Error creating sensor' }); }
});

router.patch('/api/sensors/:id', requirePermission('sensors', 'write'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const scope = scopeOf(req);
    const existing = await storage.getSensor(id, scope);
    if (!existing) return res.status(404).json({ message: 'Sensor not found' });
    const { customerId: _c, id: _i, ...data } = req.body ?? {};
    if (data.stationId != null) {
      const station = await storage.getStationByStationId(data.stationId, scope);
      if (!station) return res.status(400).json({ error: 'unknown station/object' });
    }
    if (data.objectId != null) {
      const obj = await storage.getInfrastructureObject(data.objectId, scope);
      if (!obj) return res.status(400).json({ error: 'unknown station/object' });
    }
    const updated = await storage.updateSensor(id, data);
    if (!updated) return res.status(404).json({ message: 'Sensor not found' });
    res.json(updated);
  } catch { res.status(500).json({ message: 'Error updating sensor' }); }
});

router.delete('/api/sensors/:id', requirePermission('sensors', 'write'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await storage.getSensor(id, scopeOf(req));
    if (!existing) return res.status(404).json({ message: 'Sensor not found' });
    const ok = await storage.deleteSensor(id);
    if (!ok) return res.status(404).json({ message: 'Sensor not found' });
    res.json({ success: true });
  } catch { res.status(500).json({ message: 'Error deleting sensor' }); }
});

// ─── Building Norms API ────────────────────────────────────────────────────────

export default router;
