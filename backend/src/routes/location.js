import { Router } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { db } from '../db/index.js';
import { locationCache } from '../services/locationCache.js';
import { enrichShuttleLocation } from '../services/eta.js';

const router = Router();

router.use(authMiddleware, requireRole('driver'));

router.post('/update', (req, res) => {
  const { latitude, longitude, speed, heading } = req.body;

  if (latitude == null || longitude == null) {
    return res.status(400).json({ error: 'latitude and longitude required' });
  }

  const trip = db
    .prepare(
      `SELECT * FROM trips WHERE driver_id = ? AND status = 'active' ORDER BY started_at DESC LIMIT 1`
    )
    .get(req.user.id);

  if (!trip) {
    return res.status(404).json({ error: 'No active trip. Start a trip first.' });
  }

  db.prepare(
    `INSERT INTO location_history (trip_id, shuttle_id, latitude, longitude, speed, heading)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(trip.id, trip.shuttle_id, latitude, longitude, speed || 0, heading || 0);

  const locationData = {
    shuttleId: trip.shuttle_id,
    tripId: trip.id,
    latitude,
    longitude,
    speed: speed || 0,
    heading: heading || 0,
    driverId: req.user.id,
  };

  locationCache.set(trip.shuttle_id, locationData);

  const enriched = enrichShuttleLocation(locationData);
  if (enriched) {
    req.app.get('io')?.emit('shuttle:update', enriched);
  }

  res.json({ ok: true, timestamp: new Date().toISOString() });
});

export default router;
