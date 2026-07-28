import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { db } from '../db/index.js';
import { config } from '../config.js';
import { locationCache, haversineKm } from '../services/locationCache.js';
import { enrichShuttleLocation, getEtaForUser, calculateEtaMinutes } from '../services/eta.js';

const router = Router();

router.use(authMiddleware);

router.get('/nearby-shuttles', (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const radius = parseFloat(req.query.radius) || config.nearbyRadiusKm;

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return res.status(400).json({ error: 'lat and lng query params required' });
  }

  const nearby = locationCache.getNearby(lat, lng, radius);
  const shuttles = nearby
    .map((loc) => enrichShuttleLocation(loc))
    .filter(Boolean)
    .map((shuttle) => ({
      ...shuttle,
      distanceKm: Math.round(haversineKm(lat, lng, shuttle.latitude, shuttle.longitude) * 100) / 100,
      etaMinutes: calculateEtaMinutes(shuttle.latitude, shuttle.longitude, lat, lng, shuttle.speed * 3.6),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);

  res.json({ shuttles, userLocation: { lat, lng }, radiusKm: radius });
});

router.get('/shuttle/:id', (req, res) => {
  const cached = locationCache.get(req.params.id);
  const shuttle = db
    .prepare(
      `SELECT s.id, s.shuttle_number, s.route_id, r.name as route_name, r.color as route_color
       FROM shuttles s JOIN routes r ON r.id = s.route_id WHERE s.id = ?`
    )
    .get(req.params.id);

  if (!shuttle) {
    return res.status(404).json({ error: 'Shuttle not found' });
  }

  const location = cached
    ? enrichShuttleLocation(cached)
    : null;

  res.json({ shuttle, location });
});

router.get('/routes', (_req, res) => {
  const routes = db.prepare('SELECT id, name, description, color FROM routes').all();
  const routesWithStops = routes.map((route) => {
    const stops = db
      .prepare(
        `SELECT id, name, latitude, longitude, sequence_order
         FROM stops WHERE route_id = ? ORDER BY sequence_order`
      )
      .all(route.id);
    return { ...route, stops };
  });
  res.json({ routes: routesWithStops });
});

router.get('/eta', (req, res) => {
  const { shuttleId, lat, lng } = req.query;
  if (!shuttleId || !lat || !lng) {
    return res.status(400).json({ error: 'shuttleId, lat, lng required' });
  }

  const cached = locationCache.get(shuttleId);
  if (cached) {
    const etaMinutes = calculateEtaMinutes(
      cached.latitude,
      cached.longitude,
      parseFloat(lat),
      parseFloat(lng),
      (cached.speed || 0) * 3.6
    );
    const distanceKm = haversineKm(cached.latitude, cached.longitude, parseFloat(lat), parseFloat(lng));
    return res.json({
      shuttleId,
      etaMinutes,
      distanceKm: Math.round(distanceKm * 100) / 100,
      distanceMeters: Math.round(distanceKm * 1000),
    });
  }

  const eta = getEtaForUser(shuttleId, parseFloat(lat), parseFloat(lng));
  if (!eta) {
    return res.status(404).json({ error: 'Shuttle not currently active' });
  }
  res.json(eta);
});

router.get('/search', (req, res) => {
  const q = (req.query.q || '').trim().toLowerCase();
  if (!q) {
    return res.json({ routes: [], stops: [] });
  }

  const routes = db
    .prepare(
      `SELECT id, name, description, color FROM routes
       WHERE lower(name) LIKE ? OR lower(description) LIKE ?`
    )
    .all(`%${q}%`, `%${q}%`);

  const stops = db
    .prepare(
      `SELECT s.id, s.name, s.latitude, s.longitude, s.route_id, r.name as route_name
       FROM stops s JOIN routes r ON r.id = s.route_id
       WHERE lower(s.name) LIKE ?`
    )
    .all(`%${q}%`);

  res.json({ routes, stops });
});

router.get('/active-shuttles', (_req, res) => {
  const all = locationCache.getAll();
  const shuttles = all.map((loc) => enrichShuttleLocation(loc)).filter(Boolean);
  res.json({ shuttles });
});

export default router;
