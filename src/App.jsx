import { useState, useEffect, useRef } from 'react';
import Map from './components/Map';
import FilterPanel from './components/FilterPanel';
import RouteList from './components/RouteList';
import FavoritesList from './components/FavoritesList';
import LocationSearch from './components/LocationSearch';
import { fetchRoadGraph } from './utils/overpass';
import { buildGraph, findNearestNode } from './utils/graph';
import { findLoops } from './utils/routing';
import { exportGpx } from './utils/gpx';
import { useFavorites } from './utils/useFavorites';
import './App.css';

// Mason, Ohio
const MASON_OH = [39.3592, -84.3099];

const DEFAULT_FILTERS = {
  targetDistMiles: 40,
  minCurviness: 1,
  radiusMiles: 20,
  minSpeedLimit: 0,
  roadTypes: ['primary', 'secondary', 'tertiary', 'unclassified'],
  routesToGenerate: 5,
};

export default function App() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState(null);
  const [userCenter, setUserCenter] = useState(null);
  const [routeCount, setRouteCount] = useState(null);
  const searchAbortRef = useRef(null);

  // Search center: starts at GPS location, overridden by geocode search or pin drag
  const [searchCenter, setSearchCenter] = useState(null);
  // flyTarget: set when user picks a geocode result so map animates there
  const [flyTarget, setFlyTarget] = useState(null);

  const { favorites, addFavorite, removeFavorite, renameFavorite } = useFavorites();

  const savedRouteIds = new Set(favorites.map((f) => f.sourceId).filter(Boolean));

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = [pos.coords.latitude, pos.coords.longitude];
          setUserCenter(coords);
          setSearchCenter((prev) => prev ?? coords); // only set if not already overridden
        },
        () => {
          setUserCenter(MASON_OH);
          setSearchCenter((prev) => prev ?? MASON_OH);
        }
      );
    } else {
      setUserCenter(MASON_OH);
      setSearchCenter((prev) => prev ?? MASON_OH);
    }
  }, []);

  useEffect(() => () => searchAbortRef.current?.abort(), []);

  function handleLocationSelect(coords) {
    setSearchCenter(coords);
    setFlyTarget(coords);
  }

  async function handleSearch() {
    searchAbortRef.current?.abort();
    const abortController = new AbortController();
    searchAbortRef.current = abortController;
    const center = searchCenter || userCenter || MASON_OH;
    setLoading(true);
    setError(null);
    setSelectedRoute(null);
    setRoutes([]);
    setRouteCount(null);

    try {
      setStatus('Fetching roads...');
      const { ways, nodeCoords } = await fetchRoadGraph({
        lat: center[0],
        lon: center[1],
        radiusMiles: filters.radiusMiles,
        roadTypes: filters.roadTypes,
        signal: abortController.signal,
      });

      setStatus('Building road graph...');
      const graph = buildGraph(ways, nodeCoords, { minSpeedLimit: filters.minSpeedLimit });

      if (graph.size === 0) {
        setError('No roads found — try increasing the search radius or adding more road types.');
        return;
      }

      setStatus('Calculating loop routes...');
      const startNode = findNearestNode(graph, center[0], center[1]);

      const found = findLoops(
        graph,
        startNode,
        filters.targetDistMiles,
        filters.minCurviness,
        filters.routesToGenerate
      );

      setRoutes(found);
      setRouteCount(found.length);
      if (found.length > 0) {
        setSelectedRoute(found[0]);
      } else if (filters.minCurviness > 5) {
        setError('No routes met the curviness target. Try lowering Min Curviness.');
      } else {
        setError('No loop routes found. Try a larger radius or longer target distance.');
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      if (searchAbortRef.current === abortController) {
        searchAbortRef.current = null;
        setLoading(false);
        setStatus('');
      }
    }
  }

  function handleSave(route) {
    addFavorite(route, `Loop ${route.totalDistance.toFixed(1)} mi`);
  }

  function handleExport(route) {
    exportGpx(route, `Winder_Loop_${route.totalDistance.toFixed(1)}mi`);
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-logo">
          <span className="logo-icon">〰️</span>
          <span className="logo-name">Winder</span>
        </div>
        <span className="app-tagline">Find your next drive</span>
        <div className="app-header-search">
          <LocationSearch onSelect={handleLocationSelect} />
        </div>
        {error && <span className="error-banner">{error}</span>}
      </header>

      <div className="app-body">
        <div className="sidebar">
          <FilterPanel
            filters={filters}
            onChange={setFilters}
            onSearch={handleSearch}
            loading={loading}
            routeCount={routeCount}
            status={status}
          />
          <div className="sidebar-lists">
            <RouteList
              routes={routes}
              selectedId={selectedRoute?.id}
              onSelect={setSelectedRoute}
              onSave={handleSave}
              onExport={handleExport}
              savedIds={savedRouteIds}
            />
            <FavoritesList
              favorites={favorites}
              selectedId={selectedRoute?.id}
              onSelect={setSelectedRoute}
              onRename={renameFavorite}
              onRemove={removeFavorite}
            />
          </div>
        </div>

        <Map
          routes={routes}
          selectedRoute={selectedRoute}
          onRouteClick={setSelectedRoute}
          center={userCenter}
          searchPin={searchCenter || userCenter || MASON_OH}
          onPinMove={setSearchCenter}
          flyTarget={flyTarget}
        />
      </div>
    </div>
  );
}
