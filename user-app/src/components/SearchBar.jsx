export default function SearchBar({ query, onChange, results, onSelectRoute, onSelectStop }) {
  return (
    <div className="search-bar">
      <input
        type="search"
        placeholder="Search routes, buildings, stops…"
        value={query}
        onChange={(e) => onChange(e.target.value)}
      />
      {results && (results.routes?.length > 0 || results.stops?.length > 0) && (
        <div className="search-results">
          {results.routes?.map((route) => (
            <button key={route.id} className="search-item" onClick={() => onSelectRoute(route)}>
              <span className="search-icon">🛣️</span>
              <span>{route.name}</span>
            </button>
          ))}
          {results.stops?.map((stop) => (
            <button key={stop.id} className="search-item" onClick={() => onSelectStop(stop)}>
              <span className="search-icon">📍</span>
              <span>{stop.name} — {stop.route_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
