const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function getToken() {
  return localStorage.getItem('driver_token');
}

export function setToken(token) {
  localStorage.setItem('driver_token', token);
}

export function clearToken() {
  localStorage.removeItem('driver_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  login: (email, password) =>
    request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  getShuttles: () => request('/api/driver/shuttles'),
  getActiveTrip: () => request('/api/driver/trip/active'),
  startTrip: (shuttleId) =>
    request('/api/driver/trip/start', { method: 'POST', body: JSON.stringify({ shuttleId }) }),
  endTrip: () => request('/api/driver/trip/end', { method: 'POST', body: JSON.stringify({}) }),
  updateLocation: (payload) =>
    request('/api/location/update', { method: 'POST', body: JSON.stringify(payload) }),
};
