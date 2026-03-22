import { useState } from 'react';
import { exportGpx } from '../utils/gpx';
import './FavoritesList.css';

function curvinessColor(score) {
  if (score <= 3) return '#3fb950';
  if (score <= 5) return '#d29922';
  if (score <= 7) return '#ff8c00';
  return '#f85149';
}

function FavoriteItem({ fav, selected, onClick, onRename, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(fav.name);
  const score = Math.round(fav.avgCurviness);
  const color = curvinessColor(score);

  function commitRename() {
    const trimmed = draft.trim();
    if (trimmed) onRename(fav.id, trimmed);
    setEditing(false);
  }

  return (
    <div className={`fav-item ${selected ? 'selected' : ''}`} onClick={() => !editing && onClick(fav)}>
      <div className="fav-header">
        {editing ? (
          <input
            className="fav-rename-input"
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditing(false); }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="fav-name">{fav.name}</span>
        )}
        <div className="fav-actions" onClick={(e) => e.stopPropagation()}>
          <button className="fav-btn" title="Rename" onClick={() => { setDraft(fav.name); setEditing(true); }}>✎</button>
          <button className="fav-btn" title="Export GPX" onClick={() => exportGpx(fav, fav.name)}>↓</button>
          <button className="fav-btn delete" title="Delete" onClick={() => onRemove(fav.id)}>✕</button>
        </div>
      </div>
      <div className="fav-meta">
        <span style={{ color, fontSize: '0.72rem', fontWeight: 600 }}>{score}/10</span>
        <span className="fav-detail">{fav.totalDistance.toFixed(1)} mi</span>
      </div>
    </div>
  );
}

export default function FavoritesList({ favorites, selectedId, onSelect, onRename, onRemove }) {
  if (!favorites || favorites.length === 0) return null;

  return (
    <div className="favorites-list">
      <div className="favorites-header">
        <span>Favorites</span>
        <span className="favorites-count">{favorites.length}</span>
      </div>
      <div className="favorites-body">
        {favorites.map((fav) => (
          <FavoriteItem
            key={fav.id}
            fav={fav}
            selected={fav.id === selectedId}
            onClick={onSelect}
            onRename={onRename}
            onRemove={onRemove}
          />
        ))}
      </div>
    </div>
  );
}
