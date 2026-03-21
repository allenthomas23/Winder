import { useState } from 'react';
import './FilterPanel.css';

const ROAD_TYPES = ['secondary', 'tertiary', 'unclassified', 'residential'];

const SPEED_OPTIONS = [
  { label: 'Any speed', value: 999 },
  { label: '≤ 25 mph', value: 25 },
  { label: '≤ 35 mph', value: 35 },
  { label: '≤ 45 mph', value: 45 },
  { label: '≤ 55 mph', value: 55 },
];

export default function FilterPanel({ filters, onChange, onSearch, loading, resultCount }) {
  const [collapsed, setCollapsed] = useState(false);

  function update(key, value) {
    onChange({ ...filters, [key]: value });
  }

  function toggleRoadType(type) {
    const current = filters.roadTypes;
    const next = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    update('roadTypes', next);
  }

  return (
    <aside className={`filter-panel ${collapsed ? 'collapsed' : ''}`}>
      <div className="panel-header">
        <span className="panel-title">Filters</span>
        <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)} title="Toggle panel">
          {collapsed ? '▶' : '◀'}
        </button>
      </div>

      {!collapsed && (
        <div className="panel-body">
          <label className="filter-label">
            Min curviness
            <span className="filter-value">{filters.minCurviness}</span>
          </label>
          <input
            type="range" min="1" max="10" step="1"
            value={filters.minCurviness}
            onChange={(e) => update('minCurviness', Number(e.target.value))}
            className="slider"
          />
          <div className="slider-ticks">
            <span>Mild</span><span>Intense</span>
          </div>

          <label className="filter-label">
            Search radius
            <span className="filter-value">{filters.radiusMiles} mi</span>
          </label>
          <input
            type="range" min="5" max="50" step="5"
            value={filters.radiusMiles}
            onChange={(e) => update('radiusMiles', Number(e.target.value))}
            className="slider"
          />
          <div className="slider-ticks">
            <span>5 mi</span><span>50 mi</span>
          </div>

          <label className="filter-label">
            Min road length
            <span className="filter-value">{filters.minLengthMiles.toFixed(1)} mi</span>
          </label>
          <input
            type="range" min="0.1" max="5" step="0.1"
            value={filters.minLengthMiles}
            onChange={(e) => update('minLengthMiles', Number(e.target.value))}
            className="slider"
          />
          <div className="slider-ticks">
            <span>0.1 mi</span><span>5 mi</span>
          </div>

          <label className="filter-label">Max speed limit</label>
          <select
            className="select"
            value={filters.maxSpeedLimit}
            onChange={(e) => update('maxSpeedLimit', Number(e.target.value))}
          >
            {SPEED_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <label className="filter-label">Road types</label>
          <div className="checkbox-group">
            {ROAD_TYPES.map((type) => (
              <label key={type} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={filters.roadTypes.includes(type)}
                  onChange={() => toggleRoadType(type)}
                />
                {type}
              </label>
            ))}
          </div>

          <button
            className={`search-btn ${loading ? 'loading' : ''}`}
            onClick={onSearch}
            disabled={loading || filters.roadTypes.length === 0}
          >
            {loading ? (
              <><span className="spinner" /> Searching...</>
            ) : (
              '〰 Find Winding Roads'
            )}
          </button>

          {resultCount !== null && !loading && (
            <p className="result-count">
              {resultCount === 0
                ? 'No roads found. Try adjusting filters.'
                : `${resultCount} road${resultCount !== 1 ? 's' : ''} found`}
            </p>
          )}
        </div>
      )}
    </aside>
  );
}
