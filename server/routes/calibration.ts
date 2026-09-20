import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { requirePermission, requireCustomer, scopeOf } from "../auth";

const router = Router();


// ─── Calibration sessions ─────────────────────────────────────────────────

router.get('/api/calibration-sessions', requirePermission('calibration', 'read'), async (req, res) => {
  try {
    let installationId: number | undefined;
    if (req.query.installationId !== undefined) {
      installationId = parseInt(req.query.installationId as string);
      if (isNaN(installationId) || installationId <= 0) return res.status(400).json({ message: 'installationId must be a positive integer' });
    }
    const sessions = await storage.getCalibrationSessions(installationId, scopeOf(req));
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching calibration sessions' });
  }
});

router.get('/api/calibration-sessions/:id', requirePermission('calibration', 'read'), async (req, res) => {
  try {
    const session = await storage.getCalibrationSession(parseInt(req.params.id), scopeOf(req));
    if (!session) return res.status(404).json({ message: 'Session not found' });
    res.json(session);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching calibration session' });
  }
});

const calibrationSessionSchema = z.object({
  installationId: z.number().int().positive(),
  sessionDate:    z.coerce.date().transform(d => d.toISOString()),
  operator:       z.string().min(1).max(200),
  sensitivityZ:   z.number().finite().optional(),
  sensitivityNS:  z.number().finite().optional(),
  sensitivityEW:  z.number().finite().optional(),
  dampingRatio:   z.number().finite().min(0).max(100).optional(),
  naturalFrequency: z.number().finite().positive().optional(),
  status:         z.enum(['complete', 'pending']).default('complete'),
  notes:          z.string().max(1000).optional()
});

router.post('/api/calibration-sessions', requirePermission('calibration', 'write'), async (req, res) => {
  const parsed = calibrationSessionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid session data', errors: parsed.error.flatten() });
  try {
    const customerId = requireCustomer(req, res); if (customerId === undefined) return;
    const session = await storage.createCalibrationSession(parsed.data, customerId);
    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ message: 'Error creating calibration session' });
  }
});

router.patch('/api/calibration-sessions/:id', requirePermission('calibration', 'write'), async (req, res) => {
  const parsed = calibrationSessionSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid session data', errors: parsed.error.flatten() });
  try {
    const id = parseInt(req.params.id);
    const existing = await storage.getCalibrationSession(id, scopeOf(req));
    if (!existing) return res.status(404).json({ message: 'Session not found' });
    const updated = await storage.updateCalibrationSession(id, parsed.data);
    if (!updated) return res.status(404).json({ message: 'Session not found' });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Error updating calibration session' });
  }
});

router.delete('/api/calibration-sessions/:id', requirePermission('calibration', 'write'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await storage.getCalibrationSession(id, scopeOf(req));
    if (!existing) return res.status(404).json({ message: 'Session not found' });
    const ok = await storage.deleteCalibrationSession(id);
    if (!ok) return res.status(404).json({ message: 'Session not found' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting calibration session' });
  }
});

// ─── AFC data ─────────────────────────────────────────────────────────────

router.get('/api/calibration-afc', requirePermission('calibration', 'read'), async (req, res) => {
  try {
    const sessionId = parseInt(req.query.sessionId as string);
    if (isNaN(sessionId) || sessionId <= 0) return res.status(400).json({ message: 'sessionId must be a positive integer' });
    const session = await storage.getCalibrationSession(sessionId, scopeOf(req));
    if (!session) return res.status(404).json({ message: `Calibration session ${sessionId} not found` });
    const points = await storage.getCalibrationAfc(sessionId);
    res.json(points);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching AFC data' });
  }
});

const afcPointSchema = z.object({
  frequency: z.number().finite().positive({ message: 'frequency must be > 0' }),
  amplitude: z.number().finite(),
  phase:     z.number().finite().optional()
});

const afcPayloadSchema = z.object({
  sessionId: z.number().int().positive(),
  points:    z.array(afcPointSchema).min(1).max(500)
});

router.put('/api/calibration-afc', requirePermission('calibration', 'write'), async (req, res) => {
  const parsed = afcPayloadSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid AFC data', errors: parsed.error.flatten() });
  try {
    const { sessionId, points } = parsed.data;
    const session = await storage.getCalibrationSession(sessionId, scopeOf(req));
    if (!session) return res.status(404).json({ message: `Calibration session ${sessionId} not found` });
    const result = await storage.replaceCalibrationAfc(sessionId, points.map(p => ({ ...p, sessionId })));
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error saving AFC data' });
  }
});

router.delete('/api/calibration-afc/:id', requirePermission('calibration', 'write'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await storage.getCalibrationAfcPoint(id, scopeOf(req));
    if (!existing) return res.status(404).json({ message: 'AFC point not found' });
    const ok = await storage.deleteCalibrationAfcPoint(id);
    if (!ok) return res.status(404).json({ message: 'AFC point not found' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting AFC point' });
  }
});

// Schedule regular earthquake data synchronization (every 30 minutes)

export default router;
