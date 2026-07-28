import { db } from '../db/index.js';
import { haversineKm, metersBetween } from './locationCache.js';

const AVG_SHUTTLE_SPEED_KMH = 25;

export function calculateEtaMinutes(shuttleLat, shuttleLng, userLat, userLng, speedKmh = AVG_SHUTTLE_SPEED_KMH) {
  const distanceKm = haversineKm(shuttleLat, shuttleLng, userLat, userLng);
  const effectiveSpeed = Math.max(speedKmh || AVG_SHUTTLE_SPEED_KMH, 5);
  const minutes = (distanceKm / effectiveSpeed) * 60;
  return Math.max(1, Math.round(minutes));
}

export function getNextStop(routeId, shuttleLat, shuttleLng) {
  const stops = db
    .prepare(
      `SELECT id, name, latitude, longitude, sequence_order
       FROM stops WHERE route_id = ? ORDER BY sequence_order ASC`
    )
    .all(routeId);

  if (stops.length === 0) return null;

  let nearest = stops[0];
  let minDist = metersBetween(shuttleLat, shuttleLng, nearest.latitude, nearest.longitude);

  for (const stop of stops) {
    const dist = metersBetween(shuttleLat, shuttleLng, stop.latitude, stop.longitude);
    if (dist < minDist) {
      minDist = dist;
      nearest = stop;
    }
  }

  const currentIndex = stops.findIndex((s) => s.id === nearest.id);
  const nextIndex = (currentIndex + 1) % stops.length;
  const nextStop = stops[nextIndex];

  return {
    currentStop: nearest,
    nextStop,
    distanceToNextMeters: Math.round(
      metersBetween(shuttleLat, shuttleLng, nextStop.latitude, nextStop.longitude)
    ),
  };
}

export function enrichShuttleLocation(location) {
  const shuttle = db
    .prepare(
      `SELECT s.id, s.shuttle_number, s.route_id, r.name as route_name, r.color as route_color
       FROM shuttles s JOIN routes r ON r.id = s.route_id WHERE s.id = ?`
    )
    .get(location.shuttleId);

  if (!shuttle) return null;

  const stopInfo = getNextStop(shuttle.route_id, location.latitude, location.longitude);

  return {
    id: shuttle.id,
    shuttleNumber: shuttle.shuttle_number,
    routeId: shuttle.route_id,
    routeName: shuttle.route_name,
    routeColor: shuttle.route_color,
    latitude: location.latitude,
    longitude: location.longitude,
    speed: location.speed || 0,
    heading: location.heading || 0,
    tripId: location.tripId,
    lastUpdated: location.updatedAt,
    nextStop: stopInfo?.nextStop?.name || null,
    currentStop: stopInfo?.currentStop?.name || null,
  };
}

export function getEtaForUser(shuttleId, userLat, userLng) {
  const location = db
    .prepare(
      `SELECT lh.latitude, lh.longitude, lh.speed
       FROM location_history lh
       JOIN trips t ON t.id = lh.trip_id
       WHERE lh.shuttle_id = ? AND t.status = 'active'
       ORDER BY lh.recorded_at DESC LIMIT 1`
    )
    .get(shuttleId);

  if (!location) return null;

  const speedKmh = (location.speed || 0) * 3.6;
  const etaMinutes = calculateEtaMinutes(
    location.latitude,
    location.longitude,
    userLat,
    userLng,
    speedKmh
  );
  const distanceKm = haversineKm(location.latitude, location.longitude, userLat, userLng);

  return {
    shuttleId,
    etaMinutes,
    distanceKm: Math.round(distanceKm * 100) / 100,
    distanceMeters: Math.round(distanceKm * 1000),
  };
}
