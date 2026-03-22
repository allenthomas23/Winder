import './RouteItem.css';

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

export default function RouteItem({ route, index, selected, onClick, onSave, onExport, isSaved }) {
  const score = Math.round(route.avgCurviness);
  const color = curvinessColor(score);

  return (
    <div className={`route-item ${selected ? 'selected' : ''}`} onClick={onClick}>
      <div className="route-header">
        <span className="route-num">Route {index + 1}</span>
        <div className="route-actions" onClick={(e) => e.stopPropagation()}>
          <button
            className={`route-action-btn ${isSaved ? 'saved' : ''}`}
            title={isSaved ? 'Already saved' : 'Save to favorites'}
            onClick={() => !isSaved && onSave(route)}
          >
            {isSaved ? '★' : '☆'}
          </button>
          <button
            className="route-action-btn"
            title="Export GPX"
            onClick={() => onExport(route)}
          >
            ↓
          </button>
          <span className="route-score" style={{ color }}>{score}/10</span>
        </div>
      </div>
      <div className="route-bar-track">
        <div
          className="route-bar-fill"
          style={{ width: `${(score / 10) * 100}%`, background: color }}
        />
      </div>
      <div className="route-meta">
        <span className="route-tag" style={{ borderColor: color, color }}>
          {curvinessLabel(score)}
        </span>
        <span className="route-detail">{route.totalDistance.toFixed(1)} mi loop</span>
      </div>
    </div>
  );
}
