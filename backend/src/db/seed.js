import { db, runSchema } from './index.js';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';

runSchema();

const campusCenter = { lat: 20.3484, lng: 85.8177 }; // KIIT Bhubaneswar area (demo)

const routes = [
  {
    id: uuid(),
    name: 'Campus Loop A',
    description: 'Main campus circular route via academic blocks',
    color: '#2563eb',
    stops: [
      { name: 'Main Gate', lat: 20.3512, lng: 85.8145, order: 1 },
      { name: 'Campus 6', lat: 20.3498, lng: 85.8162, order: 2 },
      { name: 'Library', lat: 20.3475, lng: 85.8180, order: 3 },
      { name: 'Campus 3', lat: 20.3458, lng: 85.8201, order: 4 },
      { name: 'Hostel Block', lat: 20.3440, lng: 85.8220, order: 5 },
    ],
  },
  {
    id: uuid(),
    name: 'Campus Loop B',
    description: 'North campus route via sports complex',
    color: '#16a34a',
    stops: [
      { name: 'Sports Complex', lat: 20.3525, lng: 85.8210, order: 1 },
      { name: 'Admin Block', lat: 20.3505, lng: 85.8195, order: 2 },
      { name: 'Campus 15', lat: 20.3480, lng: 85.8175, order: 3 },
      { name: 'Medical Center', lat: 20.3460, lng: 85.8155, order: 4 },
      { name: 'Main Gate', lat: 20.3512, lng: 85.8145, order: 5 },
    ],
  },
  {
    id: uuid(),
    name: 'Express Shuttle',
    description: 'Direct route between gate and central library',
    color: '#dc2626',
    stops: [
      { name: 'Main Gate', lat: 20.3512, lng: 85.8145, order: 1 },
      { name: 'Central Plaza', lat: 20.3490, lng: 85.8170, order: 2 },
      { name: 'Library', lat: 20.3475, lng: 85.8180, order: 3 },
    ],
  },
];

const insertUser = db.prepare(
  'INSERT OR IGNORE INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)'
);
const insertRoute = db.prepare(
  'INSERT OR IGNORE INTO routes (id, name, description, color) VALUES (?, ?, ?, ?)'
);
const insertStop = db.prepare(
  'INSERT OR IGNORE INTO stops (id, route_id, name, latitude, longitude, sequence_order) VALUES (?, ?, ?, ?, ?, ?)'
);
const insertShuttle = db.prepare(
  'INSERT OR IGNORE INTO shuttles (id, shuttle_number, route_id, driver_id) VALUES (?, ?, ?, ?)'
);

const password = bcrypt.hashSync('password123', 10);

const driverIds = [];
for (let i = 1; i <= 3; i++) {
  const id = uuid();
  driverIds.push(id);
  insertUser.run(id, `driver${i}@campus.edu`, password, `Driver ${i}`, 'driver');
}

insertUser.run(uuid(), 'student@campus.edu', password, 'Demo Student', 'student');
insertUser.run(uuid(), 'admin@campus.edu', password, 'Admin User', 'admin');

for (const route of routes) {
  insertRoute.run(route.id, route.name, route.description, route.color);
  for (const stop of route.stops) {
    insertStop.run(uuid(), route.id, stop.name, stop.lat, stop.lng, stop.order);
  }
}

routes.forEach((route, i) => {
  insertShuttle.run(uuid(), `SH-${String(i + 1).padStart(2, '0')}`, route.id, driverIds[i]);
});

console.log('Database seeded successfully.');
console.log('Demo credentials: student@campus.edu / password123');
console.log('Driver credentials: driver1@campus.edu / password123');
console.log(`Campus center: ${campusCenter.lat}, ${campusCenter.lng}`);
