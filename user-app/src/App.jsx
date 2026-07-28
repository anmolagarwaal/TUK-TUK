import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { api, getToken, setToken, clearToken, WS_BASE } from './api.js';
import ShuttleMap from './components/ShuttleMap.jsx';
import ShuttleDetails from './components/ShuttleDetails.jsx';
import SearchBar from './components/SearchBar.jsx';
import NotificationToast from './components/NotificationToast.jsx';

const DEMO_EMAIL = 'student@campus.edu';
const DEMO_PASSWORD = 'password123';
const DEFAULT_CENTER = [20.3484, 85.8177];

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function etaMinutes(shLat, shLng, uLat, uLng, speedMs = 0) {
  const dist = haversineKm(shLat, shLng, uLat, uLng);
  const speed = Math.max((speedMs || 0) * 3.6, 15);
  return Math.max(1, Math.round((dist / speed) * 60));
}

export default function App() {
  const [token, setTokenState] = useState(getToken());
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [shuttles, setShuttles] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [selectedShuttle, setSelectedShuttle] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [watchShuttleId, setWatchShuttleId] = useState(null);
  const socketRef = useRef(null);
  const searchTimeout = useRef(null);

  const enrichShuttle = useCallback(
    (sh) => {
      if (!userLocation) return sh;
      const distanceKm = Math.round(haversineKm(userLocation[0], userLocation[1], sh.latitude, sh.longitude) * 100) / 100;
      return {
        ...sh,
        distanceKm,
        etaMinutes: etaMinutes(sh.latitude, sh.longitude, userLocation[0], userLocation[1], sh.speed),
      };
    },
    [userLocation]
  );

  const loadNearby = useCallback(async (lat, lng) => {
    try {
      const data = await api.getNearbyShuttles(lat, lng);
      setShuttles(data.shuttles.map(enrichShuttle));
    } catch (err) {
      console.error(err);
    }
  }, [enrichShuttle]);

  const loadRoutes = useCallback(async () => {
    try {
      const data = await api.getRoutes();
      setRoutes(data.routes);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    if (!token) return;

    loadRoutes();

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = [pos.coords.latitude, pos.coords.longitude];
          setUserLocation(loc);
          loadNearby(loc[0], loc[1]);
        },
        () => {
          setUserLocation(DEFAULT_CENTER);
          loadNearby(DEFAULT_CENTER[0], DEFAULT_CENTER[1]);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setUserLocation(DEFAULT_CENTER);
      loadNearby(DEFAULT_CENTER[0], DEFAULT_CENTER[1]);
    }
  }, [token, loadNearby, loadRoutes]);

  useEffect(() => {
    if (!token || !userLocation) return;

    const socket = io(WS_BASE, {
      transports: ['websocket', 'polling'],
      auth: { token },
    });
    socketRef.current = socket;

    socket.on('connect_error', (err) => {
      console.error('Socket connection failed:', err.message);
    });

    socket.emit('subscribe:nearby', {
      lat: userLocation[0],
      lng: userLocation[1],
      radiusKm: 5,
    });

    socket.on('shuttles:snapshot', ({ shuttles: incoming }) => {
      setShuttles(incoming.map(enrichShuttle));
    });

    socket.on('shuttle:update', (update) => {
      setShuttles((prev) => {
        const idx = prev.findIndex((s) => s.id === update.id);
        const enriched = enrichShuttle(idx >= 0 ? { ...prev[idx], ...update } : update);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = enriched;
          return next;
        }
        return [...prev, enriched];
      });

      if (watchShuttleId === update.id && userLocation) {
        const eta = etaMinutes(update.latitude, update.longitude, userLocation[0], userLocation[1], update.speed);
        if (eta <= 3) {
          addNotification(`Shuttle arriving in ~${eta} minutes!`);
          setWatchShuttleId(null);
        }
      }
    });

    return () => socket.disconnect();
  }, [token, userLocation, enrichShuttle, watchShuttleId]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      try {
        const results = await api.search(searchQuery);
        setSearchResults(results);
      } catch {
        setSearchResults(null);
      }
    }, 300);
  }, [searchQuery]);

  const addNotification = (message) => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 8000);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { token: t } = await api.login(email, password);
      setToken(t);
      setTokenState(t);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    setLoading(true);
    try {
      const { token: t } = await api.guestLogin();
      setToken(t);
      setTokenState(t);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearToken();
    setTokenState(null);
    socketRef.current?.disconnect();
  };

  const handleSelectShuttle = (shuttle) => {
    setSelectedShuttle(enrichShuttle(shuttle));
  };

  const handleNotify = (shuttle) => {
    setWatchShuttleId(shuttle.id);
    addNotification(`Watching ${shuttle.shuttleNumber} — we'll alert you when it's close`);
  };

  if (!token) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <h1>Campus Shuttle Tracker</h1>
          <p>Real-time shuttle locations on your campus</p>
          <form onSubmit={handleLogin}>
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            {error && <p className="error">{error}</p>}
            <button type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign In'}</button>
          </form>
          <button className="guest-btn" onClick={handleGuest} disabled={loading}>
            Continue as Guest
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <NotificationToast
        notifications={notifications}
        onDismiss={(id) => setNotifications((prev) => prev.filter((n) => n.id !== id))}
      />

      <header className="top-bar">
        <h1>Campus Shuttle</h1>
        <button className="logout-btn" onClick={handleLogout}>Logout</button>
      </header>

      <SearchBar
        query={searchQuery}
        onChange={setSearchQuery}
        results={searchResults}
        onSelectRoute={() => setSearchQuery('')}
        onSelectStop={(stop) => {
          setUserLocation([stop.latitude, stop.longitude]);
          setSearchQuery('');
          setSearchResults(null);
        }}
      />

      <div className="map-wrapper">
        <ShuttleMap
          userLocation={userLocation}
          shuttles={shuttles}
          routes={routes}
          selectedShuttle={selectedShuttle}
          onSelectShuttle={handleSelectShuttle}
        />
      </div>

      <div className="bottom-panel">
        <h2>Nearby Shuttles ({shuttles.length})</h2>
        <div className="shuttle-list">
          {shuttles.length === 0 && (
            <p className="empty">No active shuttles nearby. Drivers may not have started their shift yet.</p>
          )}
          {shuttles.map((sh) => (
            <button
              key={sh.id}
              className={`shuttle-card ${selectedShuttle?.id === sh.id ? 'selected' : ''}`}
              onClick={() => handleSelectShuttle(sh)}
            >
              <div className="shuttle-card-header">
                <strong>{sh.shuttleNumber}</strong>
                <span className="eta-badge">{sh.etaMinutes} min</span>
              </div>
              <p>{sh.routeName}</p>
              <p className="meta">{sh.distanceKm} km away · Next: {sh.nextStop || '—'}</p>
            </button>
          ))}
        </div>
      </div>

      {selectedShuttle && (
        <ShuttleDetails
          shuttle={selectedShuttle}
          onClose={() => setSelectedShuttle(null)}
          onNotify={handleNotify}
        />
      )}
    </div>
  );
}
