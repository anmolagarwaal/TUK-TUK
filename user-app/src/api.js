const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const WS_BASE = import.meta.env.VITE_WS_URL || 'http://localhost:3001';

export function getToken() {
  return localStorage.getItem('user_token');
}

export function setToken(token) {
  localStorage.setItem('user_token', token);
}

export function clearToken() {
  localStorage.removeItem('user_token');
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
  guestLogin: () => request('/api/auth/guest', { method: 'POST', body: JSON.stringify({}) }),
  getNearbyShuttles: (lat, lng, radius = 5) =>
    request(`/api/nearby-shuttles?lat=${lat}&lng=${lng}&radius=${radius}`),
  getRoutes: () => request('/api/routes'),
  getShuttle: (id) => request(`/api/shuttle/${id}`),
  getEta: (shuttleId, lat, lng) =>
    request(`/api/eta?shuttleId=${shuttleId}&lat=${lat}&lng=${lng}`),
  search: (q) => request(`/api/search?q=${encodeURIComponent(q)}`),
};

export { WS_BASE };
