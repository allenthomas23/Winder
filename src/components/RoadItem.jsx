import './RoadItem.css';

function curvinessColor(score) {
  if (score <= 3) return '#3fb950';
  if (score <= 5) return '#d29922';
  if (score <= 7) return '#ff8c00';
  return '#f85149';
}

function curvinessLabel(score) {
  if (score <= 3) return 'Mild';
  if (score <= 5) return 'Moderate';
  if (score <= 7) return 'Curvy';
  return 'Very Curvy';
}

export default function RoadItem({ road, selected, onClick }) {
  const color = curvinessColor(road.curviness);
  const label = curvinessLabel(road.curviness);

  return (
    <div className={`road-item ${selected ? 'selected' : ''}`} onClick={onClick}>
      <div className="road-header">
        <span className="road-name">{road.name || 'Unnamed Road'}</span>
        <span className="road-score" style={{ color }}>{road.curviness}/10</span>
      </div>
      <div className="road-bar-track">
        <div
          className="road-bar-fill"
          style={{ width: `${(road.curviness / 10) * 100}%`, background: color }}
        />
      </div>
      <div className="road-meta">
        <span className="road-tag" style={{ borderColor: color, color }}>{label}</span>
        <span className="road-detail">{road.length.toFixed(1)} mi</span>
        <span className="road-detail">{road.highway}</span>
        {road.speedLimit && <span className="road-detail">{road.speedLimit} mph</span>}
      </div>
    </div>
  );
}
