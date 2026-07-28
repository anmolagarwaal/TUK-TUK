import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';

const shuttleIcon = (color = '#2563eb') =>
  L.divIcon({
    className: 'shuttle-marker',
    html: `<div style="background:${color};width:32px;height:32px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:16px">🚌</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

const userIcon = L.divIcon({
  className: 'user-marker',
  html: `<div style="background:#3b82f6;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 0 0 4px rgba(59,130,246,0.3)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const stopIcon = L.divIcon({
  className: 'stop-marker',
  html: `<div style="background:#64748b;width:10px;height:10px;border-radius:50%;border:2px solid white"></div>`,
  iconSize: [10, 10],
  iconAnchor: [5, 5],
});

function MapController({ center, selectedShuttle }) {
  const map = useMap();

  useEffect(() => {
    if (selectedShuttle) {
      map.flyTo([selectedShuttle.latitude, selectedShuttle.longitude], 16, { duration: 0.8 });
    } else if (center) {
      map.setView(center, 15);
    }
  }, [map, center, selectedShuttle]);

  return null;
}

export default function ShuttleMap({
  userLocation,
  shuttles,
  routes,
  selectedShuttle,
  onSelectShuttle,
}) {
  const defaultCenter = userLocation || [20.3484, 85.8177];

  return (
    <MapContainer center={defaultCenter} zoom={15} className="map-container" zoomControl={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={20}
      />
      <MapController center={defaultCenter} selectedShuttle={selectedShuttle} />

      {userLocation && (
        <Marker position={userLocation} icon={userIcon}>
          <Popup>You are here</Popup>
        </Marker>
      )}

      {routes?.map((route) => {
        const coords = route.stops?.map((s) => [s.latitude, s.longitude]) || [];
        if (coords.length < 2) return null;
        return (
          <Polyline
            key={route.id}
            positions={coords}
            pathOptions={{ color: route.color || '#94a3b8', weight: 3, opacity: 0.6, dashArray: '8 8' }}
          />
        );
      })}

      {routes?.flatMap((route) =>
        (route.stops || []).map((stop) => (
          <CircleMarker
            key={stop.id}
            center={[stop.latitude, stop.longitude]}
            radius={6}
            pathOptions={{ color: route.color, fillColor: route.color, fillOpacity: 0.8 }}
          >
            <Popup>
              <strong>{stop.name}</strong>
              <br />
              {route.name}
            </Popup>
          </CircleMarker>
        ))
      )}

      {shuttles.map((shuttle) => (
        <Marker
          key={shuttle.id}
          position={[shuttle.latitude, shuttle.longitude]}
          icon={shuttleIcon(shuttle.routeColor)}
          eventHandlers={{ click: () => onSelectShuttle(shuttle) }}
        >
          <Popup>
            <strong>{shuttle.shuttleNumber}</strong>
            <br />
            {shuttle.routeName}
            <br />
            ETA: {shuttle.etaMinutes} min
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

export { shuttleIcon, userIcon, stopIcon };
