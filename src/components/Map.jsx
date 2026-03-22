import { Fragment, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap, Marker } from 'react-leaflet';
import L from 'leaflet';
import './Map.css';

function curvinessColor(score) {
  if (score <= 3) return '#3fb950';
  if (score <= 5) return '#d29922';
  if (score <= 7) return '#ff8c00';
  return '#f85149';
}

const PIN_ICON = L.divIcon({
  className: 'search-pin-icon',
  html: '<div class="search-pin-dot"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -12],
});

function FlyToRoute({ route }) {
  const map = useMap();
  const previousRouteIdRef = useRef(null);

  useEffect(() => {
    const previousRouteId = previousRouteIdRef.current;
    previousRouteIdRef.current = route?.id ?? null;

    if (!route || !route.coords || route.coords.length === 0 || previousRouteId == null || previousRouteId === route.id) {
      return;
    }
    const lats = route.coords.map((c) => c[0]);
    const lons = route.coords.map((c) => c[1]);
    map.fitBounds(
      [[Math.min(...lats), Math.min(...lons)], [Math.max(...lats), Math.max(...lons)]],
      { padding: [40, 40], maxZoom: 14 }
    );
  }, [route, map]);
  return null;
}

function SetCenter({ center }) {
  const map = useMap();
  const didSet = useRef(false);
  useEffect(() => {
    if (center && !didSet.current) {
      map.setView(center, 12);
      didSet.current = true;
    }
  }, [center, map]);
  return null;
}

function FlyTo({ target }) {
  const map = useMap();
  const prevRef = useRef(null);
  useEffect(() => {
    if (target && target !== prevRef.current) {
      map.flyTo(target, 12, { duration: 1.2 });
      prevRef.current = target;
    }
  }, [target, map]);
  return null;
}

export default function Map({ routes, selectedRoute, onRouteClick, center, searchPin, onPinMove, flyTarget }) {
  const DEFAULT_CENTER = [39.3592, -84.3099];

  const routeIds = new Set(routes.map((r) => r.id));
  const selectedIsFavorite = selectedRoute && !routeIds.has(selectedRoute.id);

  return (
    <div className="map-wrapper">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={11}
        className="leaflet-map"
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
          maxZoom={19}
        />

        {center && <SetCenter center={center} />}
        {flyTarget && <FlyTo target={flyTarget} />}
        {selectedRoute && <FlyToRoute route={selectedRoute} />}

        {/* Draggable search pin */}
        {searchPin && (
          <Marker
            position={searchPin}
            icon={PIN_ICON}
            draggable={true}
            eventHandlers={{
              dragend(e) {
                const { lat, lng } = e.target.getLatLng();
                onPinMove([lat, lng]);
              },
            }}
          >
            <Popup className="road-popup"><strong>Search center</strong><br /><small>Drag to move</small></Popup>
          </Marker>
        )}

        {routes.map((route, i) => {
          const isSelected = selectedRoute?.id === route.id;
          const color = curvinessColor(Math.round(route.avgCurviness));
          const startCoord = route.coords[0];

          return (
            <Fragment key={route.id}>
              <Polyline
                positions={route.coords}
                pathOptions={{
                  color: isSelected ? color : '#4a5568',
                  weight: isSelected ? 5 : 2.5,
                  opacity: isSelected ? 1 : 0.55,
                  dashArray: isSelected ? null : '6 4',
                }}
                eventHandlers={{ click: () => onRouteClick(route) }}
              >
                <Popup className="road-popup">
                  <strong>Route {i + 1}</strong>
                  <div className="popup-meta">
                    <span>Avg curviness: <b style={{ color }}>{Math.round(route.avgCurviness)}/10</b></span>
                    <span>Total distance: {route.totalDistance.toFixed(1)} mi</span>
                  </div>
                </Popup>
              </Polyline>

              {isSelected && startCoord && (
                <CircleMarker
                  center={startCoord}
                  radius={8}
                  pathOptions={{ color: '#ff6b35', fillColor: '#ff6b35', fillOpacity: 1, weight: 2 }}
                >
                  <Popup className="road-popup"><strong>Start / End</strong></Popup>
                </CircleMarker>
              )}
            </Fragment>
          );
        })}

        {/* Render a selected favorite not in the current routes list */}
        {selectedIsFavorite && selectedRoute.coords && (
          <Fragment key={selectedRoute.id}>
            <Polyline
              positions={selectedRoute.coords}
              pathOptions={{ color: '#ffd700', weight: 5, opacity: 1 }}
            >
              <Popup className="road-popup">
                <strong>{selectedRoute.name}</strong>
                <div className="popup-meta">
                  <span>Avg curviness: <b style={{ color: curvinessColor(Math.round(selectedRoute.avgCurviness)) }}>{Math.round(selectedRoute.avgCurviness)}/10</b></span>
                  <span>Total distance: {selectedRoute.totalDistance.toFixed(1)} mi</span>
                </div>
              </Popup>
            </Polyline>
            {selectedRoute.coords[0] && (
              <CircleMarker
                center={selectedRoute.coords[0]}
                radius={8}
                pathOptions={{ color: '#ffd700', fillColor: '#ffd700', fillOpacity: 1, weight: 2 }}
              >
                <Popup className="road-popup"><strong>Start / End</strong></Popup>
              </CircleMarker>
            )}
          </Fragment>
        )}
      </MapContainer>
    </div>
  );
}
