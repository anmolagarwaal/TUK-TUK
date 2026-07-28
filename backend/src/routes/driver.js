import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { db } from '../db/index.js';
import { locationCache } from '../services/locationCache.js';

const router = Router();

router.use(authMiddleware, requireRole('driver'));

router.get('/shuttles', (req, res) => {
  const shuttles = db
    .prepare(
      `SELECT s.id, s.shuttle_number, s.route_id, r.name as route_name
       FROM shuttles s
       JOIN routes r ON r.id = s.route_id
       WHERE s.driver_id = ? OR s.driver_id IS NULL`
    )
    .all(req.user.id);
  res.json({ shuttles });
});

router.post('/trip/start', (req, res) => {
  const { shuttleId } = req.body;
  if (!shuttleId) {
    return res.status(400).json({ error: 'shuttleId required' });
  }

  const shuttle = db.prepare('SELECT * FROM shuttles WHERE id = ?').get(shuttleId);
  if (!shuttle) {
    return res.status(404).json({ error: 'Shuttle not found' });
  }

  const existing = db
    .prepare(
      `SELECT id FROM trips WHERE driver_id = ? AND status = 'active'`
    )
    .get(req.user.id);

  if (existing) {
    return res.status(409).json({ error: 'Active trip already in progress', tripId: existing.id });
  }

  const tripId = uuid();
  db.prepare(
    `INSERT INTO trips (id, shuttle_id, driver_id, route_id, status)
     VALUES (?, ?, ?, ?, 'active')`
  ).run(tripId, shuttleId, req.user.id, shuttle.route_id);

  db.prepare('UPDATE shuttles SET driver_id = ? WHERE id = ?').run(req.user.id, shuttleId);

  res.status(201).json({
    tripId,
    shuttleId,
    routeId: shuttle.route_id,
    message: 'Trip started. GPS tracking active.',
  });
});

router.post('/trip/end', (req, res) => {
  const trip = db
    .prepare(
      `SELECT * FROM trips WHERE driver_id = ? AND status = 'active' ORDER BY started_at DESC LIMIT 1`
    )
    .get(req.user.id);

  if (!trip) {
    return res.status(404).json({ error: 'No active trip found' });
  }

  db.prepare(
    `UPDATE trips SET status = 'completed', ended_at = datetime('now') WHERE id = ?`
  ).run(trip.id);

  locationCache.remove(trip.shuttle_id);

  res.json({ message: 'Trip ended', tripId: trip.id });
});

router.get('/trip/active', (req, res) => {
  const trip = db
    .prepare(
      `SELECT t.*, s.shuttle_number, r.name as route_name
       FROM trips t
       JOIN shuttles s ON s.id = t.shuttle_id
       JOIN routes r ON r.id = t.route_id
       WHERE t.driver_id = ? AND t.status = 'active'
       ORDER BY t.started_at DESC LIMIT 1`
    )
    .get(req.user.id);

  res.json({ trip: trip || null });
});

export default router;
