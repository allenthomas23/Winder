import { useState, useEffect } from 'react';
import Map from './components/Map';
import FilterPanel from './components/FilterPanel';
import RoadList from './components/RoadList';
import { fetchRoads } from './utils/overpass';
import './App.css';

const DEFAULT_FILTERS = {
  minCurviness: 4,
  radiusMiles: 20,
  maxSpeedLimit: 999,
  roadTypes: ['secondary', 'tertiary', 'unclassified', 'residential'],
  minLengthMiles: 0.5,
};

export default function App() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [roads, setRoads] = useState([]);
  const [filteredRoads, setFilteredRoads] = useState([]);
  const [selectedRoad, setSelectedRoad] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userCenter, setUserCenter] = useState(null);
  const [resultCount, setResultCount] = useState(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserCenter([pos.coords.latitude, pos.coords.longitude]),
        () => setUserCenter([36.1627, -86.7816])
      );
    } else {
      setUserCenter([36.1627, -86.7816]);
    }
  }, []);

  useEffect(() => {
    const filtered = roads.filter(
      (r) =>
        r.curviness >= filters.minCurviness &&
        r.length >= filters.minLengthMiles &&
        (filters.maxSpeedLimit === 999 ||
          r.speedLimit === null ||
          r.speedLimit <= filters.maxSpeedLimit) &&
        filters.roadTypes.includes(r.highway)
    );
    const sorted = [...filtered].sort((a, b) => b.curviness - a.curviness);
    setFilteredRoads(sorted);
    setResultCount(sorted.length);
  }, [roads, filters]);

  async function handleSearch() {
    if (!userCenter) return;
    setLoading(true);
    setError(null);
    setSelectedRoad(null);
    setRoads([]);
    try {
      const results = await fetchRoads({
        lat: userCenter[0],
        lon: userCenter[1],
        radiusMiles: filters.radiusMiles,
        roadTypes: filters.roadTypes,
      });
      setRoads(results);
    } catch (err) {
      setError(err.message || 'Failed to fetch roads. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-logo">
          <span className="logo-icon">〰️</span>
          <span className="logo-name">Winder</span>
        </div>
        <span className="app-tagline">Find your next drive</span>
        {error && <span className="error-banner">{error}</span>}
      </header>

      <div className="app-body">
        <div className="sidebar">
          <FilterPanel
            filters={filters}
            onChange={setFilters}
            onSearch={handleSearch}
            loading={loading}
            resultCount={resultCount}
          />
          <RoadList
            roads={filteredRoads}
            selectedId={selectedRoad?.id}
            onSelect={setSelectedRoad}
          />
        </div>

        <Map
          roads={filteredRoads}
          selectedRoad={selectedRoad}
          onRoadClick={setSelectedRoad}
          center={userCenter}
        />
      </div>
    </div>
  );
}
