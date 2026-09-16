import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, schema as dbSchema } from "../db";
import { storage } from "../storage";
import { requireRole } from "../auth";
import { encodeMiniSEED, type MseedChannel } from "../lib/miniseed";

const router = Router();


// ─── Seismogram Records API ────────────────────────────────────────────────────

router.get('/api/seismograms', async (req, res) => {
  try {
    const stationId = req.query.stationId as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const records = await storage.getSeismogramRecords(stationId, limit);
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching seismogram records' });
  }
});

router.get('/api/seismograms/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const record = await storage.getSeismogramRecord(id);
    if (!record) return res.status(404).json({ message: 'Seismogram not found' });
    res.json(record);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching seismogram' });
  }
});

router.post('/api/seismograms', requireRole(['administrator', 'user']), async (req, res) => {
  try {
    const body = { ...req.body };
    if (typeof body.startTime === 'string') body.startTime = new Date(body.startTime);
    if (typeof body.endTime === 'string') body.endTime = new Date(body.endTime);
    const record = await storage.createSeismogramRecord(body);
    res.status(201).json(record);
  } catch (error) {
    console.error('createSeismogramRecord error:', error);
    const payload: { message: string; detail?: string } = { message: 'Error creating seismogram record' };
    if (process.env.NODE_ENV !== 'production') payload.detail = String(error);
    res.status(500).json(payload);
  }
});

router.patch('/api/seismograms/:id/use-for-modeling', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const record = await storage.getSeismogramRecord(id);
    if (!record) return res.status(404).json({ message: 'Seismogram not found' });
    const [updated] = await db
      .update(dbSchema.seismogramRecords)
      .set({ usedForModelingCount: (record.usedForModelingCount ?? 0) + 1 })
      .where(eq(dbSchema.seismogramRecords.id, id))
      .returning();
    res.json(updated ?? record);
  } catch (error) {
    res.status(500).json({ message: 'Error updating modeling count' });
  }
});

router.patch('/api/seismograms/:id/status', requireRole(['administrator', 'user']), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    const updated = await storage.updateSeismogramProcessingStatus(id, status);
    if (!updated) return res.status(404).json({ message: 'Seismogram not found' });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Error updating seismogram status' });
  }
});

// ─── miniSEED export ──────────────────────────────────────────────────────

router.get('/api/seismograms/:id/mseed', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: 'Invalid id' });
    const rec = await storage.getSeismogramRecord(id);
    if (!rec) return res.status(404).json({ message: 'Seismogram not found' });

    const sampleRate = rec.sampleRate ?? 100;
    const durationSec = rec.durationSec ?? Math.max(1, Math.round(((rec.endTime as Date).getTime() - (rec.startTime as Date).getTime()) / 1000));
    const totalSamples = Math.max(1, Math.round(durationSec * sampleRate));

    // Convert to Int32 counts. If we have stored arrays use them, otherwise
    // synthesize a damped sine consistent with PGA + dominant frequency.
    const pga = rec.peakGroundAcceleration ?? 0.005; // g
    const freq = rec.dominantFrequency ?? 2;          // Hz
    const seed = id * 1337;
    const SCALE = 1_000_000;

    const stored: Record<string, number[] | null> = {
      Z: (rec.dataZ as number[] | null) ?? null,
      NS: (rec.dataNS as number[] | null) ?? null,
      EW: (rec.dataEW as number[] | null) ?? null,
    };

    function synth(amp: number, salt: number): Int32Array {
      const arr = new Int32Array(totalSamples);
      let s = seed + salt;
      const rng = () => {
        s = (s * 9301 + 49297) % 233280;
        return s / 233280;
      };
      const dt = 1 / sampleRate;
      for (let i = 0; i < totalSamples; i++) {
        const t = i * dt;
        const decay = Math.exp(-0.05 * t);
        const v = amp * decay * Math.sin(2 * Math.PI * freq * t) + amp * 0.15 * (rng() - 0.5);
        arr[i] = Math.round(v * SCALE);
      }
      return arr;
    }

    function toInt32(arr: number[] | null, fallbackAmp: number, salt: number): Int32Array {
      if (arr && arr.length > 0) {
        const out = new Int32Array(arr.length);
        for (let i = 0; i < arr.length; i++) out[i] = Math.round(arr[i] * SCALE) | 0;
        return out;
      }
      return synth(fallbackAmp, salt);
    }

    const channels: MseedChannel[] = [
      { code: 'BHZ', amp: pga,        salt: 0, raw: stored.Z },
      { code: 'BHN', amp: pga * 0.82, salt: 1, raw: stored.NS },
      { code: 'BHE', amp: pga * 0.71, salt: 2, raw: stored.EW },
    ].map(c => ({
      network: 'IR',
      station: (rec.stationId ?? 'IRK01').toString(),
      location: '00',
      channel: c.code,
      sampleRate,
      startTime: rec.startTime as Date,
      samples: toInt32(c.raw, c.amp, c.salt),
    }));

    const buf = encodeMiniSEED(channels);
    const filename = `${rec.recordId ?? `seismogram_${id}`}.mseed`.replace(/[^A-Za-z0-9._-]/g, '_');
    res.setHeader('Content-Type', 'application/vnd.fdsn.mseed');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', String(buf.length));
    res.end(buf);
  } catch (error) {
    console.error('mseed export error:', error);
    res.status(500).json({ message: 'Error generating miniSEED' });
  }
});

// ─── Calibration sessions ─────────────────────────────────────────────────

export default router;
