import { useCallback, useEffect, useRef, useState } from 'react';
import { api, clearToken, getToken, setToken } from './api.js';

const DEMO_EMAIL = 'driver1@campus.edu';
const DEMO_PASSWORD = 'password123';

export default function App() {
  const [token, setTokenState] = useState(getToken());
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shuttles, setShuttles] = useState([]);
  const [selectedShuttle, setSelectedShuttle] = useState('');
  const [activeTrip, setActiveTrip] = useState(null);
  const [tracking, setTracking] = useState(false);
  const [lastLocation, setLastLocation] = useState(null);
  const [updateCount, setUpdateCount] = useState(0);
  const watchIdRef = useRef(null);
  const lastSentRef = useRef(0);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported on this device');
      return;
    }
    if (watchIdRef.current != null) return; // already tracking — don't start a second watch

    const sendLocation = (position) => {
      const now = Date.now();
      const { latitude, longitude, speed, heading } = position.coords;
      setLastLocation({ latitude, longitude, speed, heading, time: new Date().toLocaleTimeString() });

      const moving = (speed || 0) > 0.5;
      const interval = moving ? 3000 : 10000;

      if (now - lastSentRef.current < interval) return;
      lastSentRef.current = now;

      api
        .updateLocation({ latitude, longitude, speed: speed || 0, heading: heading || 0 })
        .then(() => setUpdateCount((c) => c + 1))
        .catch((err) => setError(err.message));
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      sendLocation,
      (err) => setError(err.message),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );
    setTracking(true);
  }, []);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTracking(false);
  }, []);

  // Clear the GPS watch only when the component actually unmounts —
  // not on every activeTrip/tracking state change (that was the bug:
  // it cleared the watch the instant it was created).
  useEffect(() => {
    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [shuttlesRes, tripRes] = await Promise.all([
        api.getShuttles(),
        api.getActiveTrip(),
      ]);
      setShuttles(shuttlesRes.shuttles);
      setActiveTrip(tripRes.trip);
      if (tripRes.trip) {
        setSelectedShuttle(tripRes.trip.shuttle_id);
        startTracking(); // actually resume the GPS watch, not just the UI flag
      }
    } catch (err) {
      setError(err.message);
    }
  }, [startTracking]);

  useEffect(() => {
    if (token) loadData();
  }, [token, loadData]);

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

  const handleLogout = () => {
    stopTracking();
    clearToken();
    setTokenState(null);
    setActiveTrip(null);
  };

  const handleStartShift = async () => {
    if (!selectedShuttle) {
      setError('Select a shuttle first');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.startTrip(selectedShuttle);
      setActiveTrip({ id: res.tripId, shuttle_id: res.shuttleId, route_id: res.routeId });
      startTracking();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEndShift = async () => {
    setLoading(true);
    setError('');
    try {
      stopTracking();
      await api.endTrip();
      setActiveTrip(null);
      setUpdateCount(0);
      setLastLocation(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="app">
        <header className="header">
          <h1>Shuttle Driver</h1>
          <p>Campus Shuttle Tracker</p>
        </header>
        <form className="card" onSubmit={handleLogin}>
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Shuttle Driver</h1>
        <button className="link-btn" onClick={handleLogout}>Logout</button>
      </header>

      {error && <p className="error banner">{error}</p>}

      <div className="card">
        <h2>{activeTrip ? 'Shift Active' : 'Start Shift'}</h2>

        {!activeTrip && (
          <>
            <label>
              Assigned Shuttle
              <select value={selectedShuttle} onChange={(e) => setSelectedShuttle(e.target.value)}>
                <option value="">Select shuttle…</option>
                {shuttles.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.shuttle_number} — {s.route_name}
                  </option>
                ))}
              </select>
            </label>
            <button className="primary" onClick={handleStartShift} disabled={loading}>
              Start Shift
            </button>
          </>
        )}

        {activeTrip && (
          <>
            <div className="status-grid">
              <div className="status-item">
                <span className="label">Status</span>
                <span className="value live">● Live Tracking</span>
              </div>
              <div className="status-item">
                <span className="label">Updates Sent</span>
                <span className="value">{updateCount}</span>
              </div>
              {lastLocation && (
                <>
                  <div className="status-item">
                    <span className="label">Latitude</span>
                    <span className="value">{lastLocation.latitude.toFixed(6)}</span>
                  </div>
                  <div className="status-item">
                    <span className="label">Longitude</span>
                    <span className="value">{lastLocation.longitude.toFixed(6)}</span>
                  </div>
                  <div className="status-item">
                    <span className="label">Speed</span>
                    <span className="value">{((lastLocation.speed || 0) * 3.6).toFixed(1)} km/h</span>
                  </div>
                  <div className="status-item">
                    <span className="label">Last Update</span>
                    <span className="value">{lastLocation.time}</span>
                  </div>
                </>
              )}
            </div>
            <button className="danger" onClick={handleEndShift} disabled={loading}>
              End Shift
            </button>
          </>
        )}
      </div>

      <p className="hint">
        Keep this app open while driving. Location updates every 3–5 seconds while moving.
      </p>
    </div>
  );
}
