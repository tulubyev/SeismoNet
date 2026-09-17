import { Router } from "express";
import { storage } from "../storage";
import { requirePermission } from "../auth";

const router = Router();


// ─── Sensor Installations API ──────────────────────────────────────────────────

router.get('/api/sensor-installations', requirePermission('sensors', 'read'), async (req, res) => {
  try {
    const objectId = req.query.objectId ? parseInt(req.query.objectId as string) : undefined;
    const installations = await storage.getSensorInstallations(objectId, req.objectScope);
    res.json(installations);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching sensor installations' });
  }
});

router.post('/api/sensor-installations', requirePermission('sensors', 'write'), async (req, res) => {
  try {
    const installation = await storage.createSensorInstallation(req.body);
    res.status(201).json(installation);
  } catch (error) {
    res.status(500).json({ message: 'Error creating sensor installation' });
  }
});

router.patch('/api/sensor-installations/:id', requirePermission('sensors', 'write'), async (req, res) => {
  try {
    const updated = await storage.updateSensorInstallation(parseInt(req.params.id), req.body);
    if (!updated) return res.status(404).json({ message: 'Installation not found' });
    res.json(updated);
  } catch (error) { res.status(500).json({ message: 'Error updating sensor installation' }); }
});

router.delete('/api/sensor-installations/:id', requirePermission('sensors', 'write'), async (req, res) => {
  try {
    const ok = await storage.deleteSensorInstallation(parseInt(req.params.id));
    if (!ok) return res.status(404).json({ message: 'Installation not found' });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ message: 'Error deleting sensor installation' }); }
});

// ─── Sensor Devices API ───────────────────────────────────────────────────────

router.get('/api/sensors', requirePermission('sensors', 'read'), async (req, res) => {
  try {
    const stationId = req.query.stationId as string | undefined;
    const objectId = req.query.objectId ? parseInt(req.query.objectId as string) : undefined;
    res.json(await storage.getSensors(stationId, objectId, req.objectScope));
  } catch { res.status(500).json({ message: 'Error fetching sensors' }); }
});

router.get('/api/sensors/:id', requirePermission('sensors', 'read'), async (req, res) => {
  try {
    const sensor = await storage.getSensor(parseInt(req.params.id));
    if (!sensor) return res.status(404).json({ message: 'Sensor not found' });
    res.json(sensor);
  } catch { res.status(500).json({ message: 'Error fetching sensor' }); }
});

router.post('/api/sensors', requirePermission('sensors', 'write'), async (req, res) => {
  try {
    res.status(201).json(await storage.createSensor(req.body));
  } catch { res.status(500).json({ message: 'Error creating sensor' }); }
});

router.patch('/api/sensors/:id', requirePermission('sensors', 'write'), async (req, res) => {
  try {
    const updated = await storage.updateSensor(parseInt(req.params.id), req.body);
    if (!updated) return res.status(404).json({ message: 'Sensor not found' });
    res.json(updated);
  } catch { res.status(500).json({ message: 'Error updating sensor' }); }
});

router.delete('/api/sensors/:id', requirePermission('sensors', 'write'), async (req, res) => {
  try {
    const ok = await storage.deleteSensor(parseInt(req.params.id));
    if (!ok) return res.status(404).json({ message: 'Sensor not found' });
    res.json({ success: true });
  } catch { res.status(500).json({ message: 'Error deleting sensor' }); }
});

// ─── Building Norms API ────────────────────────────────────────────────────────

export default router;
