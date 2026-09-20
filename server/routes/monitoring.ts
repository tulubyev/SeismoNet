import { Router } from "express";
import { storage } from "../storage";
import { requirePermission, scopeOf } from "../auth";

const router = Router();


// Get recent events
router.get('/api/events/recent', requirePermission('events', 'read'), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const events = await storage.getRecentEvents(limit);
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching events' });
  }
});

// Get a specific event by ID
router.get('/api/events/:eventId', requirePermission('events', 'read'), async (req, res) => {
  try {
    const event = await storage.getEventByEventId(req.params.eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    res.json(event);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching event' });
  }
});

// Get research networks
router.get('/api/networks', requirePermission('monitoring', 'read'), async (req, res) => {
  try {
    const networks = await storage.getResearchNetworks();
    res.json(networks);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching research networks' });
  }
});

// Get system status
router.get('/api/system/status', requirePermission('monitoring', 'read'), async (req, res) => {
  try {
    const status = await storage.getSystemStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching system status' });
  }
});

// Get alerts
router.get('/api/alerts', requirePermission('monitoring', 'read'), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const alerts = await storage.getAlerts(limit, scopeOf(req));
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching alerts' });
  }
});

// Mark alert as read
router.post('/api/alerts/:id/read', requirePermission('monitoring', 'read'), async (req, res) => {
  try {
    const alertId = parseInt(req.params.id);
    const alert = await storage.markAlertAsRead(alertId);
    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }
    res.json(alert);
  } catch (error) {
    res.status(500).json({ message: 'Error updating alert' });
  }
});

// Mark all alerts as read
router.post('/api/alerts/read-all', requirePermission('monitoring', 'read'), async (req, res) => {
  try {
    await storage.markAllAlertsAsRead();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Error updating alerts' });
  }
});


// --- Field Operations API Routes ---

// Get all regions
router.get('/api/regions', requirePermission('monitoring', 'read'), async (req, res) => {
  try {
    const regions = await storage.getRegions();
    res.json(regions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching regions' });
  }
});

// Get region by ID
router.get('/api/regions/:id', requirePermission('monitoring', 'read'), async (req, res) => {
  try {
    const regionId = parseInt(req.params.id);
    const region = await storage.getRegion(regionId);
    if (!region) {
      return res.status(404).json({ message: 'Region not found' });
    }
    res.json(region);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching region' });
  }
});

// Get stations in a region
router.get('/api/regions/:id/stations', requirePermission('stations', 'read'), async (req, res) => {
  try {
    const regionId = parseInt(req.params.id);
    const stations = await storage.getStationsByRegionId(regionId, scopeOf(req));
    res.json(stations);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stations for region' });
  }
});

// Get all maintenance records for a station

export default router;
