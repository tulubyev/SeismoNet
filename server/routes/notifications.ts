import { Router } from "express";
import { and } from "drizzle-orm";
import { storage } from "../storage";
import { sendSeismicEventNotification } from "../services/unisender";
import { sendSeismicEventAlert } from "../services/telegram";
import { requirePermission } from "../auth";

const router = Router();


// --- Notification API Routes ---

// Send seismic event notification via Unisender
router.post('/api/notifications/email/event', requirePermission('settings', 'write'), async (req, res) => {
  try {
    const { eventId, recipients } = req.body;
    
    if (!process.env.UNISENDER_API_KEY) {
      return res.status(400).json({ message: 'Unisender API key not configured' });
    }
    
    if (!eventId || !recipients || !Array.isArray(recipients)) {
      return res.status(400).json({ message: 'Event ID and recipients array are required' });
    }
    
    const event = await storage.getEventByEventId(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    const result = await sendSeismicEventNotification(
      process.env.UNISENDER_API_KEY,
      recipients,
      {
        eventId: event.eventId,
        region: event.region,
        location: event.location || 'Unknown',
        magnitude: event.magnitude,
        depth: event.depth,
        timestamp: event.timestamp.getTime()
      }
    );
    
    if (result) {
      res.json({ success: true, message: 'Notification sent successfully' });
    } else {
      res.status(500).json({ success: false, message: 'Failed to send notification' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error sending email notification' });
  }
});

// Send seismic event notification via Telegram
router.post('/api/notifications/telegram/event', requirePermission('settings', 'write'), async (req, res) => {
  try {
    const { eventId, chatId } = req.body;
    
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      return res.status(400).json({ message: 'Telegram bot token not configured' });
    }
    
    if (!eventId || !chatId) {
      return res.status(400).json({ message: 'Event ID and chat ID are required' });
    }
    
    const event = await storage.getEventByEventId(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    const result = await sendSeismicEventAlert(
      process.env.TELEGRAM_BOT_TOKEN,
      chatId,
      {
        eventId: event.eventId,
        region: event.region,
        location: event.location || 'Unknown',
        magnitude: event.magnitude,
        depth: event.depth,
        timestamp: event.timestamp.getTime()
      }
    );
    
    if (result) {
      res.json({ success: true, message: 'Telegram notification sent successfully' });
    } else {
      res.status(500).json({ success: false, message: 'Failed to send Telegram notification' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error sending Telegram notification' });
  }
});

// Endpoints for earthquake data from external sources

// Manually trigger USGS earthquake data sync

export default router;
