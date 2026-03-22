import { useState, useRef, useEffect } from 'react';
import './LocationSearch.css';

export default function LocationSearch({ onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);
  const wrapRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function onDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  function handleChange(e) {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(timerRef.current);
    if (!val.trim()) { setResults([]); setOpen(false); return; }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&limit=5&addressdetails=1`;
        const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
        const data = await res.json();
        setResults(data);
        setOpen(data.length > 0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
  }

  function handlePick(result) {
    setQuery(result.display_name.split(',').slice(0, 2).join(',').trim());
    setOpen(false);
    onSelect([parseFloat(result.lat), parseFloat(result.lon)], result.display_name);
  }

  return (
    <div className="loc-search" ref={wrapRef}>
      <div className="loc-input-wrap">
        <span className="loc-icon">⌕</span>
        <input
          className="loc-input"
          type="text"
          placeholder="Search location..."
          value={query}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setOpen(true)}
        />
        {loading && <span className="loc-spinner" />}
      </div>
      {open && (
        <ul className="loc-results">
          {results.map((r) => (
            <li key={r.place_id} className="loc-result" onMouseDown={() => handlePick(r)}>
              <span className="loc-result-name">{r.display_name.split(',').slice(0, 2).join(', ')}</span>
              <span className="loc-result-detail">{r.display_name.split(',').slice(2, 4).join(', ')}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
