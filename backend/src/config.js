import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  databasePath: process.env.DATABASE_PATH || './data/shuttle.db',
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:5174').split(','),
  nearbyRadiusKm: parseFloat(process.env.NEARBY_RADIUS_KM || '5'),
  locationUpdateIntervalMs: parseInt(process.env.LOCATION_UPDATE_INTERVAL_MS || '3000', 10),
};
