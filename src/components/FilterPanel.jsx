import { useState } from 'react';
import './FilterPanel.css';

const ROAD_TYPES = [
  { value: 'primary', label: 'Highways' },
  { value: 'secondary', label: 'Main Roads' },
  { value: 'tertiary', label: 'Country Roads' },
  { value: 'unclassified', label: 'Back Roads' },
  { value: 'residential', label: 'Residential' },
];

const SPEED_OPTIONS = [
  { label: 'Any speed', value: 0 },
  { label: '≥25 mph', value: 25 },
  { label: '≥35 mph', value: 35 },
  { label: '≥45 mph', value: 45 },
  { label: '≥55 mph', value: 55 },
];

function SliderField({
  label,
  value,
  min,
  max,
  step,
  suffix = '',
  onChange,
  minLabel,
  maxLabel,
}) {
  const normalizedValue = Number.isFinite(value) ? Math.max(min, value) : min;
  const sliderMax = Math.max(max, normalizedValue);
  const displayMaxLabel = sliderMax > max ? `${sliderMax}${suffix}` : maxLabel;

  function handleNumberChange(event) {
    const next = event.target.value;
    if (next === '') {
      onChange(min);
      return;
    }

    onChange(Math.max(min, Number(next)));
  }

  return (
    <>
      <label className="filter-label">
        <span>{label}</span>
        <span className="filter-value-row">
          <span className="filter-value">{normalizedValue}{suffix}</span>
          <input
            type="number"
            min={min}
            max={sliderMax}
            step={step}
            value={normalizedValue}
            onChange={handleNumberChange}
            className="value-input"
          />
        </span>
      </label>
      <input
        type="range"
        min={min}
        max={sliderMax}
        step={step}
        value={normalizedValue}
        onChange={(e) => onChange(Number(e.target.value))}
        className="slider"
      />
      <div className="slider-ticks"><span>{minLabel}</span><span>{displayMaxLabel}</span></div>
    </>
  );
}

export default function FilterPanel({ filters, onChange, onSearch, loading, routeCount, status }) {
  const [collapsed, setCollapsed] = useState(false);
  const showRadiusWarning = filters.targetDistMiles > filters.radiusMiles * 2.5;

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
        <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? '▶' : '◀'}
        </button>
      </div>

      {!collapsed && (
        <div className="panel-body">
          <SliderField
            label="Route length (loop)"
            value={filters.targetDistMiles}
            min={10}
            max={150}
            step={5}
            suffix=" mi"
            minLabel="10 mi"
            maxLabel="150 mi"
            onChange={(value) => update('targetDistMiles', value)}
          />

          <SliderField
            label="Search radius"
            value={filters.radiusMiles}
            min={5}
            max={60}
            step={5}
            suffix=" mi"
            minLabel="5 mi"
            maxLabel="60 mi"
            onChange={(value) => update('radiusMiles', value)}
          />

          <SliderField
            label="Routes to generate"
            value={filters.routesToGenerate}
            min={1}
            max={8}
            step={1}
            minLabel="1"
            maxLabel="8"
            onChange={(value) => update('routesToGenerate', value)}
          />

          <label className="filter-label">Min speed limit</label>
          <select
            className="select"
            value={filters.minSpeedLimit}
            onChange={(e) => update('minSpeedLimit', Number(e.target.value))}
          >
            {SPEED_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <label className="filter-label">Road types</label>
          <div className="checkbox-group">
            {ROAD_TYPES.map((type) => (
              <label key={type.value} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={filters.roadTypes.includes(type.value)}
                  onChange={() => toggleRoadType(type.value)}
                />
                {type.label}
              </label>
            ))}
          </div>

          <button
            className={`search-btn ${loading ? 'loading' : ''}`}
            onClick={onSearch}
            disabled={loading || filters.roadTypes.length === 0}
          >
            {loading ? (
              <><span className="spinner" /> {status || 'Working...'}</>
            ) : (
              '〰 Find Loop Courses'
            )}
          </button>

          {showRadiusWarning && (
            <div className="filter-warning">⚠ Target distance exceeds search area. Consider increasing radius.</div>
          )}

          {routeCount !== null && !loading && (
            <p className="result-count">
              {routeCount === 0
                ? 'No routes found. Try adjusting filters.'
                : `${routeCount} route${routeCount !== 1 ? 's' : ''} generated`}
            </p>
          )}
        </div>
      )}
    </aside>
  );
}
