import RouteItem from './RouteItem';
import './RouteList.css';

export default function RouteList({ routes, selectedId, onSelect, onSave, onExport, savedIds }) {
  if (!routes || routes.length === 0) return null;

  return (
    <div className="route-list">
      <div className="route-list-header">
        <span>Loop Courses</span>
        <span className="route-list-count">{routes.length} routes</span>
      </div>
      <div className="route-list-body">
        {routes.map((route, i) => (
          <RouteItem
            key={route.id}
            route={route}
            index={i}
            selected={route.id === selectedId}
            onClick={() => onSelect(route)}
            onSave={onSave}
            onExport={onExport}
            isSaved={savedIds?.has(route.id)}
          />
        ))}
      </div>
    </div>
  );
}
