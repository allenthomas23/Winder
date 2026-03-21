import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Popup, useMap } from 'react-leaflet';
import './Map.css';

function curvinessColor(score) {
  if (score <= 3) return '#3fb950';
  if (score <= 5) return '#d29922';
  if (score <= 7) return '#ff8c00';
  return '#f85149';
}

function FlyToRoad({ road }) {
  const map = useMap();
  useEffect(() => {
    if (!road) return;
    const lats = road.coords.map((c) => c[0]);
    const lons = road.coords.map((c) => c[1]);
    const bounds = [
      [Math.min(...lats), Math.min(...lons)],
      [Math.max(...lats), Math.max(...lons)],
    ];
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  }, [road, map]);
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

export default function Map({ roads, selectedRoad, onRoadClick, center }) {
  const DEFAULT_CENTER = [36.1627, -86.7816]; // Nashville, TN

  return (
    <div className="map-wrapper">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={11}
        className="leaflet-map"
        preferCanvas={true}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
          maxZoom={19}
        />

        {center && <SetCenter center={center} />}
        {selectedRoad && <FlyToRoad road={selectedRoad} />}

        {roads.map((road) => (
          <Polyline
            key={road.id}
            positions={road.coords}
            pathOptions={{
              color: curvinessColor(road.curviness),
              weight: road.id === selectedRoad?.id ? 5 : 3,
              opacity: road.id === selectedRoad?.id ? 1 : 0.75,
            }}
            eventHandlers={{ click: () => onRoadClick(road) }}
          >
            <Popup className="road-popup">
              <strong>{road.name || 'Unnamed Road'}</strong>
              <div className="popup-meta">
                <span>Curviness: <b style={{ color: curvinessColor(road.curviness) }}>{road.curviness}/10</b></span>
                <span>Length: {road.length.toFixed(2)} mi</span>
                <span>Type: {road.highway}</span>
                {road.speedLimit && <span>Speed limit: {road.speedLimit} mph</span>}
              </div>
            </Popup>
          </Polyline>
        ))}
      </MapContainer>
    </div>
  );
}
