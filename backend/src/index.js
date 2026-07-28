import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { createApp } from './app.js';
import { config } from './config.js';
import { runSchema } from './db/index.js';
import { locationCache } from './services/locationCache.js';
import { enrichShuttleLocation } from './services/eta.js';

runSchema();

const app = createApp();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: config.corsOrigin, methods: ['GET', 'POST'] },
});

app.set('io', io);

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error('Authentication required'));
  }
  try {
    socket.user = jwt.verify(token, config.jwtSecret);
    next();
  } catch {
    next(new Error('Invalid or expired token'));
  }
});

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('subscribe:nearby', ({ lat, lng, radiusKm }) => {
    if (lat == null || lng == null) return;
    const nearby = locationCache.getNearby(lat, lng, radiusKm || config.nearbyRadiusKm);
    const shuttles = nearby.map((loc) => enrichShuttleLocation(loc)).filter(Boolean);
    socket.emit('shuttles:snapshot', { shuttles });
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

httpServer.listen(config.port, () => {
  console.log(`Campus Shuttle API running on http://localhost:${config.port}`);
  console.log(`WebSocket server ready`);
});
