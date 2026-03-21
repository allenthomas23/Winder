import RoadItem from './RoadItem';
import './RoadList.css';

export default function RoadList({ roads, selectedId, onSelect }) {
  if (!roads || roads.length === 0) return null;

  return (
    <div className="road-list">
      <div className="road-list-header">
        <span>Results</span>
        <span className="road-list-count">{roads.length} roads</span>
      </div>
      <div className="road-list-body">
        {roads.map((road) => (
          <RoadItem
            key={road.id}
            road={road}
            selected={road.id === selectedId}
            onClick={() => onSelect(road)}
          />
        ))}
      </div>
    </div>
  );
}
