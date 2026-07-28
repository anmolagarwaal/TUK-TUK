/** In-memory real-time location cache (Redis substitute for MVP) */
class LocationCache {
  constructor() {
    this.locations = new Map();
  }

  set(shuttleId, data) {
    this.locations.set(shuttleId, {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  }

  get(shuttleId) {
    return this.locations.get(shuttleId) || null;
  }

  getAll() {
    return Array.from(this.locations.entries()).map(([shuttleId, data]) => ({
      shuttleId,
      ...data,
    }));
  }

  remove(shuttleId) {
    this.locations.delete(shuttleId);
  }

  getNearby(lat, lng, radiusKm) {
    return this.getAll().filter((loc) => {
      const dist = haversineKm(lat, lng, loc.latitude, loc.longitude);
      return dist <= radiusKm;
    });
  }
}

export function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

export const locationCache = new LocationCache();

export function metersBetween(lat1, lon1, lat2, lon2) {
  return haversineKm(lat1, lon1, lat2, lon2) * 1000;
}
