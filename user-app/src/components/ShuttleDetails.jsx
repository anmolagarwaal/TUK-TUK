export default function ShuttleDetails({ shuttle, onClose, onNotify }) {
  if (!shuttle) return null;

  return (
    <div className="shuttle-details">
      <div className="details-header">
        <div>
          <h3>{shuttle.shuttleNumber}</h3>
          <p className="route-name">{shuttle.routeName}</p>
        </div>
        <button className="close-btn" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>

      <div className="details-grid">
        <div className="detail">
          <span className="detail-label">ETA</span>
          <span className="detail-value highlight">{shuttle.etaMinutes} min</span>
        </div>
        <div className="detail">
          <span className="detail-label">Distance</span>
          <span className="detail-value">{shuttle.distanceKm} km</span>
        </div>
        <div className="detail">
          <span className="detail-label">Speed</span>
          <span className="detail-value">{((shuttle.speed || 0) * 3.6).toFixed(0)} km/h</span>
        </div>
        <div className="detail">
          <span className="detail-label">Next Stop</span>
          <span className="detail-value">{shuttle.nextStop || '—'}</span>
        </div>
      </div>

      {shuttle.lastUpdated && (
        <p className="last-updated">
          Updated {new Date(shuttle.lastUpdated).toLocaleTimeString()}
        </p>
      )}

      {shuttle.etaMinutes <= 5 && (
        <button className="notify-btn" onClick={() => onNotify(shuttle)}>
          🔔 Notify when arriving
        </button>
      )}
    </div>
  );
}
