import { Router } from "express";
import { storage, type Scope } from "../storage";
import { requirePermission, requireCustomer, scopeOf } from "../auth";
import { insertStationSchema } from "@shared/schema";

const router = Router();
// stationId is globally unique, so a duplicate-code lookup must search across every
// customer, not just the caller's own — this scope removes the customer filter
// entirely rather than narrowing it, which already covers the caller's own rows too.
const scope: Scope = { customerId: null };


// API routes

// Get all stations
router.get('/api/stations', requirePermission('stations', 'read'), async (req, res) => {
  try {
    const stations = await storage.getStations(scopeOf(req));
    res.json(stations);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stations' });
  }
});

// Get a specific station by ID
router.get('/api/stations/:stationId', requirePermission('stations', 'read'), async (req, res) => {
  try {
    const station = await storage.getStationByStationId(req.params.stationId, scopeOf(req));
    if (!station) {
      return res.status(404).json({ message: 'Station not found' });
    }
    res.json(station);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching station' });
  }
});

// Create a new station
router.post('/api/stations', requirePermission('stations', 'write'), async (req, res) => {
  try {
    const customerId = requireCustomer(req, res); if (customerId === undefined) return;
    const { customerId: _c, id: _i, ...body } = req.body ?? {};
    const parsed = insertStationSchema.safeParse(body);
    if (!parsed.success) return res.status(400).json({ error: "validation", issues: parsed.error.issues });
    if (parsed.data.regionId != null && !(await storage.getRegion(parsed.data.regionId))) {
      return res.status(400).json({ error: "Регион не найден" });
    }
    if (await storage.getStationByStationId(parsed.data.stationId, scope)) {
      return res.status(409).json({ error: "Код станции уже занят" });
    }
    const newStation = await storage.createStation(parsed.data, customerId);
    res.status(201).json(newStation);
  } catch (error) {
    res.status(500).json({ message: 'Error creating station' });
  }
});

// Get recent events


// Get all maintenance records for a station
router.get('/api/stations/:stationId/maintenance', requirePermission('stations', 'read'), async (req, res) => {
  try {
    const records = await storage.getMaintenanceRecords(req.params.stationId, scopeOf(req));
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching maintenance records' });
  }
});

// Get a specific maintenance record
router.get('/api/maintenance/:id', requirePermission('stations', 'read'), async (req, res) => {
  try {
    const recordId = parseInt(req.params.id);
    const record = await storage.getMaintenanceRecord(recordId, scopeOf(req));
    if (!record) {
      return res.status(404).json({ message: 'Maintenance record not found' });
    }
    res.json(record);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching maintenance record' });
  }
});

// Create a new maintenance record
router.post('/api/stations/:stationId/maintenance', requirePermission('stations', 'write'), async (req, res) => {
  try {
    const stationId = req.params.stationId;
    const station = await storage.getStationByStationId(stationId, scopeOf(req));

    if (!station) {
      return res.status(404).json({ message: 'Station not found' });
    }

    const record = {
      ...req.body,
      stationId
    };

    const newRecord = await storage.createMaintenanceRecord(record);
    res.status(201).json(newRecord);
  } catch (error) {
    res.status(500).json({ message: 'Error creating maintenance record' });
  }
});

// Update maintenance record status
router.patch('/api/maintenance/:id/status', requirePermission('stations', 'write'), async (req, res) => {
  try {
    const recordId = parseInt(req.params.id);
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const existing = await storage.getMaintenanceRecord(recordId, scopeOf(req));
    if (!existing) {
      return res.status(404).json({ message: 'Maintenance record not found' });
    }

    const updatedRecord = await storage.updateMaintenanceStatus(recordId, status);
    
    if (!updatedRecord) {
      return res.status(404).json({ message: 'Maintenance record not found' });
    }
    
    res.json(updatedRecord);
  } catch (error) {
    res.status(500).json({ message: 'Error updating maintenance status' });
  }
});

// Get upcoming maintenance records
router.get('/api/maintenance/upcoming', requirePermission('stations', 'read'), async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const records = await storage.getUpcomingMaintenanceRecords(days, scopeOf(req));
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching upcoming maintenance records' });
  }
});

// General station update (calibration, communication, location, etc.)
router.patch('/api/stations/:stationId', requirePermission('stations', 'write'), async (req, res) => {
  try {
    const stationId = req.params.stationId;
    const existing = await storage.getStationByStationId(stationId, scopeOf(req));
    if (!existing) {
      return res.status(404).json({ message: 'Station not found' });
    }
    const { customerId: _c, id: _i, stationId: _s, ...updates } = req.body ?? {};
    const updatedStation = await storage.updateStation(stationId, updates);
    if (!updatedStation) {
      return res.status(404).json({ message: 'Station not found' });
    }
    res.json(updatedStation);
  } catch (error) {
    res.status(500).json({ message: 'Error updating station' });
  }
});

// Update station battery info
router.patch('/api/stations/:stationId/battery', requirePermission('stations', 'write'), async (req, res) => {
  try {
    const stationId = req.params.stationId;
    const { batteryLevel, batteryVoltage, powerConsumption } = req.body;

    if (batteryLevel === undefined || batteryVoltage === undefined || powerConsumption === undefined) {
      return res.status(400).json({ message: 'Battery level, voltage, and power consumption are required' });
    }

    const existing = await storage.getStationByStationId(stationId, scopeOf(req));
    if (!existing) {
      return res.status(404).json({ message: 'Station not found' });
    }

    const updatedStation = await storage.updateStationBatteryInfo(
      stationId, 
      batteryLevel, 
      batteryVoltage, 
      powerConsumption
    );
    
    if (!updatedStation) {
      return res.status(404).json({ message: 'Station not found' });
    }
    
    res.json(updatedStation);
  } catch (error) {
    res.status(500).json({ message: 'Error updating battery information' });
  }
});

// Update station storage info
router.patch('/api/stations/:stationId/storage', requirePermission('stations', 'write'), async (req, res) => {
  try {
    const stationId = req.params.stationId;
    const { storageRemaining } = req.body;

    if (storageRemaining === undefined) {
      return res.status(400).json({ message: 'Storage remaining percentage is required' });
    }

    const existing = await storage.getStationByStationId(stationId, scopeOf(req));
    if (!existing) {
      return res.status(404).json({ message: 'Station not found' });
    }

    const updatedStation = await storage.updateStationStorageInfo(stationId, storageRemaining);
    
    if (!updatedStation) {
      return res.status(404).json({ message: 'Station not found' });
    }
    
    res.json(updatedStation);
  } catch (error) {
    res.status(500).json({ message: 'Error updating storage information' });
  }
});

// --- Notification API Routes ---

// Send seismic event notification via Unisender

export default router;
